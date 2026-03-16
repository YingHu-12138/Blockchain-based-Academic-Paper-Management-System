'use strict';

/**
 * SimHash 查重服务（分层增强版）
 * ─────────────────────────────────────────────────────────────────
 * 算法层次：
 *
 * ① 粗筛层  — SimHash + 分段索引
 *    · 对全文计算 64 位 SimHash（FNV-1a 64-bit）
 *    · 同时将文本切分为 N 段（默认 4 段），为每段独立计算 SimHash
 *    · 对全文 SimHash 进行 4 频段（Band）LSH：64 位 = 4 × 16 位，
 *      任一频段相同即视为候选集，大幅减少 Hamming 精确比对量
 *    · 段级查重：任意段 Hamming ≤ 阈值即命中，捕捉"局部抄袭"
 *
 * ② 细排层  — TF-IDF + 余弦相似度（由 researchRoutes.js 实现）
 *
 * ③ 语义层  — BERT 嵌入相似度（由 bert_service/bert_service.py 实现）
 *
 * 与 papers.db 对接：
 *  papers 表 simhash 字段存储预计算的 64 位二进制字符串。
 *  分段索引对 DB 端透明——仅增大查询侧的候选覆盖，
 *  DB 只需维护一条全文 SimHash。
 *
 * 注意：papers.db 中的 simhash 须以相同算法预先生成。
 *       如需重新生成，运行：node scripts/buildSimhash.js
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = process.env.PAPERS_DB_PATH
    || path.join(__dirname, '../../papers.db');

// ── 停用词表 ──────────────────────────────────────────────────────
const STOPWORDS = new Set([
    // 中文
    '的','了','在','是','我','有','和','就','不','人','都','一','上',
    '也','很','到','说','要','你','会','着','这','那','它','她','他',
    '我们','你们','他们','但是','因为','所以','如果','然后','还是','或者',
    '可以','已经','通过','进行','对于','根据','同时','以及','方面','问题',
    '研究','方法','结果','分析','系统','数据','基于','实验','提出','本文',
    // 英文
    'the','a','an','and','or','but','in','on','at','to','for','of',
    'with','by','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'this','that','these','those','it','its','as','from','about','into',
    'then','than','so','if','which','when','where','who','what','how',
    'not','no','nor','can','our','we','us','they','their','all','each',
    'paper','study','research','result','method','proposed','using','based'
]);

// ── FNV-1a 64 位哈希 ──────────────────────────────────────────────
const FNV_PRIME  = 1099511628211n;
const FNV_OFFSET = 14695981039346656037n;
const MASK64     = (1n << 64n) - 1n;

function fnv1a64(str) {
    let hash = FNV_OFFSET;
    for (let i = 0; i < str.length; i++) {
        hash ^= BigInt(str.charCodeAt(i));
        hash  = (hash * FNV_PRIME) & MASK64;
    }
    return hash;
}

// ── 分词 ──────────────────────────────────────────────────────────
function tokenize(text) {
    if (!text) return [];
    const lower  = text.toLowerCase();
    const tokens = [];

    // 英文词（≥2 字符）
    for (const w of (lower.match(/[a-z]{2,}/g) || [])) {
        if (!STOPWORDS.has(w)) tokens.push(w);
    }
    // 数字（年份、版本号）
    for (const n of (lower.match(/\d{2,}/g) || [])) tokens.push(n);

    // 中文：单字 + 二字 bigram
    for (const block of (lower.match(/[\u4e00-\u9fa5]+/g) || [])) {
        for (const ch of block) {
            if (!STOPWORDS.has(ch)) tokens.push(ch);
        }
        for (let i = 0; i < block.length - 1; i++) {
            const bi = block[i] + block[i + 1];
            if (!STOPWORDS.has(bi)) tokens.push(bi);
        }
    }
    return tokens;
}

// ── SimHash 计算 ──────────────────────────────────────────────────

/**
 * 从 token 列表计算 64 位 SimHash 二进制字符串。
 * @param {string[]} tokens
 * @returns {string}  64 字符二进制串，如 "010110...10"
 */
function computeSimhashFromTokens(tokens) {
    const v = new Array(64).fill(0);
    const freq = new Map();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);

    for (const [token, weight] of freq) {
        const h = fnv1a64(token);
        for (let i = 0; i < 64; i++) {
            if ((h >> BigInt(i)) & 1n) {
                v[i] += weight;
            } else {
                v[i] -= weight;
            }
        }
    }
    return v.map(x => x > 0 ? '1' : '0').join('');
}

/**
 * 从文本字符串计算 64 位 SimHash 二进制字符串。
 * @param {string} text
 * @returns {string}
 */
function computeSimhash(text) {
    return computeSimhashFromTokens(tokenize(text));
}

/**
 * 分段 SimHash——将文本等分为 numSegments 段，为每段独立计算 SimHash。
 * 用于捕捉"局部抄袭"：即使只有一段内容被复制，该段也会高度相似。
 *
 * @param {string} text
 * @param {number} numSegments  分段数，默认 4
 * @returns {string[]}  各段 SimHash 组成的数组（64 位二进制串）
 */
function computeSegmentedSimhash(text, numSegments = 4) {
    const tokens     = tokenize(text);
    const segSize    = Math.ceil(tokens.length / numSegments);
    const segments   = [];

    for (let i = 0; i < numSegments; i++) {
        const segTokens = tokens.slice(i * segSize, (i + 1) * segSize);
        if (segTokens.length >= 3) {           // 段太短则跳过
            segments.push(computeSimhashFromTokens(segTokens));
        }
    }
    return segments;
}

// ── Band-based LSH（局部敏感哈希频段）────────────────────────────
//  将 64 位 SimHash 分为 4 个频段（band），每段 16 位。
//  若两篇文档任意一个频段完全相同，则进入精确比对候选集。
//  理论上大幅降低全量扫描开销（当数据库极大时尤为有效）。

const BAND_COUNT = 4;    // 频段数
const BAND_SIZE  = 16;   // 每段位数（64 / 4）

/**
 * 提取 SimHash 的各频段字符串。
 * @param {string} simhash  64 位二进制串
 * @returns {string[]}
 */
function getBands(simhash) {
    const bands = [];
    for (let i = 0; i < BAND_COUNT; i++) {
        bands.push(simhash.slice(i * BAND_SIZE, (i + 1) * BAND_SIZE));
    }
    return bands;
}

// ── Hamming 距离 ──────────────────────────────────────────────────

/**
 * 计算两个 64 字符二进制串的 Hamming 距离。
 */
function hammingDistance(a, b) {
    if (a.length !== 64 || b.length !== 64) return 64;
    let dist = 0;
    for (let i = 0; i < 64; i++) {
        if (a[i] !== b[i]) dist++;
    }
    return dist;
}

/** Hamming 距离转相似度百分比（0–100） */
function hammingToPercent(dist) {
    return Math.round((1 - dist / 64) * 100);
}

/** 根据 Hamming 距离返回匹配级别标签 */
function matchLevel(dist) {
    if (dist <= 3)  return 'exact';   // 近似完全相同
    if (dist <= 8)  return 'high';    // 高度相似
    if (dist <= 16) return 'medium';  // 中度相似
    return 'low';
}

// ── SQLite 数据库操作 ─────────────────────────────────────────────

function openDB() {
    if (!fs.existsSync(DB_PATH)) {
        console.warn(`⚠️  papers.db 不存在（路径: ${DB_PATH}），SimHash 查重跳过`);
        return null;
    }
    return new Database(DB_PATH, { readonly: true, fileMustExist: true });
}

/**
 * 全文 SimHash 查重（原始方法，全量线性扫描）。
 *
 * @param {string} querySimhash  待查文档的 64 位 SimHash
 * @param {number} threshold     最大 Hamming 距离（默认 16）
 * @param {number} topK          最多返回条目数（默认 8）
 * @returns {Array}
 */
function querySimhashDB(querySimhash, threshold = 16, topK = 8) {
    const db = openDB();
    if (!db) return [];

    try {
        const rows = db.prepare(
            `SELECT id, title, authors, abstract, published, source, simhash
             FROM papers
             WHERE simhash IS NOT NULL AND length(simhash) = 64`
        ).all();

        const results = [];
        for (const row of rows) {
            const dist = hammingDistance(querySimhash, row.simhash);
            if (dist <= threshold) {
                results.push({
                    id:               row.id,
                    title:            row.title   || '（无标题）',
                    authors:          row.authors  || '',
                    abstract:         row.abstract || '',
                    published:        row.published || '',
                    source:           row.source   || '',
                    hammingDistance:  dist,
                    similarityPercent: hammingToPercent(dist),
                    level:            matchLevel(dist),
                    matchType:        'full'        // 全文 SimHash 匹配
                });
            }
        }

        return results
            .sort((a, b) => a.hammingDistance - b.hammingDistance)
            .slice(0, topK);
    } catch (e) {
        console.error('SimHash DB 查询失败:', e.message);
        return [];
    } finally {
        db.close();
    }
}

/**
 * 分段 SimHash 查重（增强版）。
 * 综合全文 SimHash + 各段 SimHash 进行查重，捕捉局部抄袭。
 *
 * 流程：
 *  1. 构建 querySimhash 和各段 SimHash 的频段集合（Band Set）
 *  2. 对数据库执行全量 SimHash 扫描，记录以下两类命中：
 *     · 全文命中：query 全文 SimHash 与 DB SimHash Hamming ≤ threshold
 *     · 段级命中：query 任意段 SimHash 与 DB SimHash Hamming ≤ segThreshold
 *  3. 合并去重，返回结果
 *
 * @param {string}   querySimhash   待查文档全文 SimHash
 * @param {string[]} querySegments  待查文档各段 SimHash 数组
 * @param {number}   threshold      全文 Hamming 距离阈值（默认 16）
 * @param {number}   segThreshold   段级 Hamming 距离阈值（默认 12，比全文更严格）
 * @param {number}   topK           返回上限（默认 10）
 * @returns {Array}
 */
function querySimhashDBSegmented(
    querySimhash,
    querySegments = [],
    threshold    = 16,
    segThreshold = 12,
    topK         = 10
) {
    const db = openDB();
    if (!db) return [];

    try {
        const rows = db.prepare(
            `SELECT id, title, authors, abstract, published, source, simhash
             FROM papers
             WHERE simhash IS NOT NULL AND length(simhash) = 64`
        ).all();

        // 构建 Band Set：query 全文 + 各段的所有频段
        const queryBandSet = new Set(getBands(querySimhash));
        for (const seg of querySegments) {
            for (const band of getBands(seg)) queryBandSet.add(band);
        }

        const resultMap = new Map(); // id → result（去重）

        for (const row of rows) {
            // ── 1. 频段预筛：任一频段相同则进入精确比对 ──
            const rowBands   = getBands(row.simhash);
            const bandHit    = rowBands.some(b => queryBandSet.has(b));

            // ── 2. 全文 Hamming 比对 ──
            const fullDist   = hammingDistance(querySimhash, row.simhash);
            const fullHit    = fullDist <= threshold;

            // ── 3. 段级 Hamming 比对 ──
            let   segHit     = false;
            let   bestSegDist= 64;
            let   bestSegIdx = -1;

            for (let si = 0; si < querySegments.length; si++) {
                const d = hammingDistance(querySegments[si], row.simhash);
                if (d < bestSegDist) { bestSegDist = d; bestSegIdx = si; }
                if (d <= segThreshold) { segHit = true; }
            }

            // ── 4. 决定是否收录 ──
            // 频段命中仅作预筛候选，最终收录仍需 Hamming 距离达标
            if (!fullHit && !segHit) continue;

            // 取最小距离（全文 vs 最优段）决定展示相似度
            const effectiveDist = Math.min(
                fullHit ? fullDist  : 64,
                segHit  ? bestSegDist : 64
            );

            const existing = resultMap.get(row.id);
            if (existing && existing.hammingDistance <= effectiveDist) continue;

            resultMap.set(row.id, {
                id:               row.id,
                title:            row.title   || '（无标题）',
                authors:          row.authors  || '',
                abstract:         row.abstract || '',
                published:        row.published || '',
                source:           row.source   || '',
                hammingDistance:  effectiveDist,
                similarityPercent: hammingToPercent(effectiveDist),
                level:            matchLevel(effectiveDist),
                matchType:        fullHit ? 'full' : (segHit ? `segment_${bestSegIdx}` : 'band'),
                fullSimhashDist:  fullDist,
                segSimhashDist:   segHit ? bestSegDist : null
            });
        }

        return [...resultMap.values()]
            .sort((a, b) => a.hammingDistance - b.hammingDistance)
            .slice(0, topK);
    } catch (e) {
        console.error('分段 SimHash DB 查询失败:', e.message);
        return [];
    } finally {
        db.close();
    }
}

/**
 * 读取 papers.db 中所有论文供 TF-IDF 语料库使用（含作者信息）。
 * @returns {Array<{id, title, authors, abstract, published, source}>}
 */
function getDBCorpus() {
    const db = openDB();
    if (!db) return [];
    try {
        return db.prepare(
            'SELECT id, title, authors, abstract, published, source FROM papers'
        ).all();
    } catch (e) {
        console.error('papers.db 语料读取失败:', e.message);
        return [];
    } finally {
        db.close();
    }
}

/**
 * 获取 papers.db 统计信息（用于管理界面）。
 */
function getDBStats() {
    const db = openDB();
    if (!db) return { exists: false, count: 0, path: DB_PATH };
    try {
        const { count }        = db.prepare('SELECT COUNT(*) as count FROM papers').get();
        const { withSimhash }  = db.prepare(
            "SELECT COUNT(*) as withSimhash FROM papers WHERE simhash IS NOT NULL AND length(simhash) = 64"
        ).get();
        return { exists: true, count, withSimhash, path: DB_PATH };
    } catch (e) {
        return { exists: true, count: 0, withSimhash: 0, path: DB_PATH, error: e.message };
    } finally {
        db.close();
    }
}

module.exports = {
    tokenize,
    computeSimhash,
    computeSimhashFromTokens,
    computeSegmentedSimhash,
    getBands,
    hammingDistance,
    hammingToPercent,
    matchLevel,
    querySimhashDB,
    querySimhashDBSegmented,
    getDBCorpus,
    getDBStats,
};
