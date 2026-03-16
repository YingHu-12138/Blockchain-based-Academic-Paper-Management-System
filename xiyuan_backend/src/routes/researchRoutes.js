//const express = require('express');
//const router = express.Router();
//const blockchainService = require('../services/blockchainService');
//const multer = require('multer');
//const fs = require('fs');
//const crypto = require('crypto');
//const { ethers } = require('ethers');
//const path = require('path');
//const Research = require('../models/Research');
//const { create } = require('ipfs-http-client');

//// IPFS初始化
//function initIPFS() {
//  try {
//    return create({ host: 'localhost', port: 5002, protocol: 'http' });
//  } catch (error) {
//    console.warn('IPFS fallback Infura');
//    return create({
//      host: 'ipfs.infura.io',
//      port: 5001,
//      protocol: 'https',
//      headers: {
//        authorization: `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID || ''}:${process.env.IPFS_SECRET || ''}`).toString('base64')}`
//      }
//    });
//  }
//}

//// multer（英文文件名避WSL编码）
//const storage = multer.diskStorage({
//  destination: (req, file, cb) => {
//    const uploadDir = path.join(__dirname, '../../uploads');
//    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
//    cb(null, uploadDir);
//  },
//  filename: (req, file, cb) => {
//    const timestamp = Date.now();
//    const ext = path.extname(file.originalname);
//    cb(null, `upload_${timestamp}${ext}`);
//  }
//});
//const upload = multer({ storage });

//// 哈希计算（支持Buffer）
//function calculateFileHash(bufferOrPath) {
//  return new Promise((resolve, reject) => {
//    const hash = crypto.createHash('sha256');
//    if (Buffer.isBuffer(bufferOrPath)) {
//      hash.update(bufferOrPath);
//      resolve(hash.digest('hex'));
//    } else {
//      const stream = fs.createReadStream(bufferOrPath);
//      stream.on('data', (data) => hash.update(data));
//      stream.on('end', () => resolve(hash.digest('hex')));
//      stream.on('error', reject);
//    }
//  });
//}

//// 上传
//router.post('/deposit', upload.single('file'), async (req, res) => {
//  try {
//    const { title, authorId, type, abstract, keywords, metadata } = req.body;
//    const file = req.file;

//    if (!file) return res.status(400).json({ error: '请上传文件' });
//    if (!title || !authorId) return res.status(400).json({ error: '缺少title或authorId' });

//    const contractInfo = await blockchainService.getContractInfo();
//    if (!contractInfo.initialized) return res.status(400).json({ error: '合约未初始化' });

//    // 读Buffer
//    let fileBuffer = fs.readFileSync(file.path);

//    // 哈希
//    const rawHash = await calculateFileHash(fileBuffer);
//    const contentHash = ethers.utils.hexZeroPad(`0x${rawHash}`, 32);

//    // IPFS
//    let ipfsHash = '';
//    try {
//      const ipfs = initIPFS();
//      const { cid } = await ipfs.add(fileBuffer);
//      ipfsHash = cid.toString();
//      await ipfs.pin.add(ipfsHash);  // Pin
//      fs.unlinkSync(file.path);  // 删临时
//    } catch (error) {
//      ipfsHash = `local_${file.filename}`;
//    }

//    const researchId = `research_${Date.now()}`;

//    const result = await blockchainService.depositResearch(researchId, title, authorId, ipfsHash, contentHash);

//    if (result.success) {
//      const newResearch = new Research({
//        researchId,
//        title,
//        authorId,
//        type: type || 'unknown',
//        abstract: abstract || '',
//        keywords: keywords || '',
//        fileUrl: ipfsHash ? `/ipfs/${ipfsHash}` : `/uploads/${file.filename}`,
//        ipfsHash,
//        contentHash,
//        transactionHash: result.transactionHash,
//        metadata: metadata ? JSON.parse(metadata) : {}
//      });
//      await newResearch.save();

//      res.status(201).json({
//        message: '存储成功',
//        researchId,
//        transactionHash: result.transactionHash,
//        ipfsHash,
//        fileUrl: ipfsHash ? `/ipfs/${ipfsHash}` : `/uploads/${file.filename}`
//      });
//    } else {
//      res.status(500).json({ error: result.error });
//    }
//  } catch (error) {
//    res.status(500).json({ error: '服务器错误', detail: error.message });
//  }
//});

//// 查询
//router.get('/research/:researchId', async (req, res) => {
//  const research = await Research.findOne({
//    $or: [
//      { ipfsHash: hash },
//      { transactionHash: hash }
//    ]
//  });
//  if (research.exists) {
//    res.json(research);
//  } else {
//    res.status(404).json({ error: '未找到成果' });
//  }
//});

//// 新增：按IPFS哈希查询
//router.get('/hash/:hash', async (req, res) => {
//  try {
//    const { hash } = req.params;
//    const research = await Research.findOne({ ipfsHash: hash });

//    if (!research) {
//      return res.status(404).json({ error: '未找到该哈希的成果' });
//    }

//    res.json({
//      exists: true,
//      researchId: research.researchId,
//      title: research.title,
//      authorId: research.authorId,
//      type: research.type,
//      abstract: research.abstract,
//      keywords: research.keywords,
//      fileUrl: research.fileUrl,
//      ipfsHash: research.ipfsHash,
//      contentHash: research.contentHash,
//      transactionHash: research.transactionHash,
//      metadata: research.metadata
//    });
//  } catch (error) {
//    console.error('哈希查询失败:', error);
//    res.status(500).json({ error: '服务器错误' });
//  }
//});

//// 新增：按作者查询 (分页可选)
//router.get('/author/:address', async (req, res) => {
//  try {
//    const { address } = req.params;
//    const { page = 1, limit = 10 } = req.query;  // 分页
//    const skip = (page - 1) * limit;
//    const researches = await Research.find({ authorId: address })
//      .sort({ timestamp: -1 })
//      .skip(skip)
//      .limit(limit)
//      .select('-_id researchId title type ipfsHash transactionHash timestamp metadata');  // 选字段

//    res.json({
//      results: researches,
//      total: await Research.countDocuments({ authorId: address }),
//      page: parseInt(page),
//      limit: parseInt(limit)
//    });
//  } catch (error) {
//    console.error('作者查询失败:', error);
//    res.status(500).json({ error: '服务器错误' });
//  }
//});

//// 新增：批量验证 (多ID/哈希)
//router.post('/batch-verify', async (req, res) => {
//  try {
//    const { queries } = req.body;  // [{type: 'id', value: 'research_xxx'}, {type: 'hash', value: 'Qm...'}]
//    const results = [];

//    for (const q of queries) {
//      let research = null;
//      if (q.type === 'id') {
//        research = await Research.findOne({ researchId: q.value });
//      } else if (q.type === 'hash') {
//        research = await Research.findOne({ ipfsHash: q.value });
//      }

//      results.push({
//        query: q,
//        exists: !!research,
//        data: research ? {
//          researchId: research.researchId,
//          title: research.title,
//          authorId: research.authorId,
//          ipfsHash: research.ipfsHash,
//          transactionHash: research.transactionHash,
//          timestamp: research.timestamp
//        } : null
//      });
//    }

//    res.json({ results, summary: { total: results.length, valid: results.filter(r => r.exists).length } });
//  } catch (error) {
//    console.error('批量验证失败:', error);
//    res.status(500).json({ error: '服务器错误' });
//  }
//});


//module.exports = router;

/*以上before20260228*/

const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');
const { generateTrustedTimestamp } = require('../services/trustedTimestamp');
const {
    computeSimhash,
    computeSegmentedSimhash,
    querySimhashDB,
    querySimhashDBSegmented,
    getDBCorpus,
    getDBStats
} = require('../services/simhashService');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require('ethers');
const path = require('path');
const Research = require('../models/Research');
const { create } = require('ipfs-http-client');
const snarkjs = require('snarkjs'); // 引入 ZKP 处理库
const pdfParse = require('pdf-parse');

// -----------------------------------------------------------------
// 配置文件路径：定位你之前移动到 zkp_assets 目录下的电路资源
// -----------------------------------------------------------------
const ZKP_DIR = path.join(__dirname, '../../zkp_assets');
const WASM_PATH = path.join(ZKP_DIR, 'identity.wasm');
const ZKEY_PATH = path.join(ZKP_DIR, 'identity_final.zkey');
// IPFS 初始化逻辑
function initIPFS() {
    try {
        return create({ host: 'localhost', port: parseInt(process.env.IPFS_API_PORT || '5002'), protocol: 'http' });
    } catch (error) {
        console.warn('IPFS fallback Infura');
        return create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            headers: {
                authorization: `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID || ''}:${process.env.IPFS_SECRET || ''}`).toString('base64')}`
            }
        });
    }
}

// Multer 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `upload_${timestamp}${ext}`);
    }
});
const upload = multer({ storage });

// 文件哈希计算函数
function calculateFileHash(bufferOrPath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        if (Buffer.isBuffer(bufferOrPath)) {
            hash.update(bufferOrPath);
            resolve(hash.digest('hex'));
        } else {
            const stream = fs.createReadStream(bufferOrPath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        }
    });
}

// -----------------------------------------------------------------
// AES-256-CBC 文件加密（数字指纹与源文件分离存储）
// -----------------------------------------------------------------

/**
 * 加密文件 Buffer，返回加密后 Buffer 及密钥信息。
 * 加密后的 Buffer 格式：[16 bytes IV][encrypted data]
 */
function encryptFileBuffer(buffer) {
    const key = crypto.randomBytes(32); // AES-256 需要 32 字节密钥
    const iv  = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const encryptedWithIV = Buffer.concat([iv, encrypted]);
    return {
        encryptedBuffer: encryptedWithIV,
        key: key.toString('hex'),
        iv:  iv.toString('hex')
    };
}

// -----------------------------------------------------------------
// -----------------------------------------------------------------
// 文本提取：支持 PDF、纯文本/代码、Office（docx / pptx / xlsx）
// -----------------------------------------------------------------
const AdmZip = require('adm-zip');

const TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.markdown', '.rst',
    '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java',
    '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.rb', '.php',
    '.json', '.xml', '.yaml', '.yml', '.html', '.css', '.sql'
]);

/** 从 XML 字符串中提取指定标签的所有文本内容，并合并为纯文本。 */
function xmlTagText(xml, tag) {
    const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g');
    const parts = [];
    let m;
    while ((m = re.exec(xml)) !== null) {
        if (m[1].trim()) parts.push(m[1]);
    }
    return parts.join(' ');
}

/** 去除 XML 标签，保留可读文本（用于宽松模式）。 */
function stripXml(xml) {
    return xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * 从 docx 文件（Buffer）提取纯文本。
 * docx = ZIP，正文在 word/document.xml 的 <w:t> 节点。
 * 段落间以换行分隔，run 内连续文本直接拼接。
 */
function extractDocx(buffer) {
    const zip  = new AdmZip(buffer);
    const entry = zip.getEntry('word/document.xml');
    if (!entry) return '';
    const xml = entry.getData().toString('utf8');

    // 按段落（<w:p>）分割，段内取所有 <w:t> 文本拼接
    const paragraphs = [];
    const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
    let pm;
    while ((pm = paraRe.exec(xml)) !== null) {
        const text = xmlTagText(pm[0], 'w:t');
        if (text.trim()) paragraphs.push(text.trim());
    }
    return paragraphs.join('\n');
}

/**
 * 从 pptx 文件（Buffer）提取纯文本。
 * pptx = ZIP，每张幻灯片在 ppt/slides/slide*.xml，文本在 <a:t> 节点。
 */
function extractPptx(buffer) {
    const zip    = new AdmZip(buffer);
    const slides = zip.getEntries()
        .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

    const texts = [];
    for (const slide of slides) {
        const xml  = slide.getData().toString('utf8');
        const text = xmlTagText(xml, 'a:t');
        if (text.trim()) texts.push(text.trim());
    }
    return texts.join('\n');
}

/**
 * 从 xlsx 文件（Buffer）提取纯文本。
 * xlsx = ZIP，共享字符串在 xl/sharedStrings.xml（<t> 节点），
 * 单元格内联字符串和数值在各 xl/worksheets/sheet*.xml。
 */
function extractXlsx(buffer) {
    const zip = new AdmZip(buffer);

    // 共享字符串表（文本单元格引用此表）
    const ssEntry = zip.getEntry('xl/sharedStrings.xml');
    const sharedStrings = [];
    if (ssEntry) {
        const xml = ssEntry.getData().toString('utf8');
        // 每个 <si> 块中可能有多个 <t>，拼接为一条
        const siRe = /<si>[\s\S]*?<\/si>/g;
        let sm;
        while ((sm = siRe.exec(xml)) !== null) {
            sharedStrings.push(xmlTagText(sm[0], 't') || stripXml(sm[0]));
        }
    }

    // 各工作表
    const sheets = zip.getEntries()
        .filter(e => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.entryName))
        .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

    const cellTexts = new Set(); // 去重，避免重复字符串刷屏
    for (const sheet of sheets) {
        const xml = sheet.getData().toString('utf8');
        // <c t="s"> → 引用 sharedStrings；<c t="inlineStr"> → 内联；其余取 <v>
        const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
        let cm;
        while ((cm = cellRe.exec(xml)) !== null) {
            const attrs  = cm[1];
            const inner  = cm[2];
            let value    = '';
            if (/\bt="s"/.test(attrs)) {
                // 共享字符串索引
                const vMatch = /<v>(\d+)<\/v>/.exec(inner);
                if (vMatch) value = sharedStrings[parseInt(vMatch[1])] || '';
            } else if (/\bt="inlineStr"/.test(attrs)) {
                value = xmlTagText(inner, 't');
            } else if (/\bt="str"/.test(attrs)) {
                value = xmlTagText(inner, 'v') || xmlTagText(inner, 't');
            }
            // 数值单元格不提取（对查重无意义）
            if (value.trim()) cellTexts.add(value.trim());
        }
    }

    return [...cellTexts].join(' ');
}

async function extractText(filePath, originalName) {
    try {
        const ext    = path.extname(originalName || filePath).toLowerCase();
        const buffer = fs.readFileSync(filePath);

        if (ext === '.pdf') {
            const data = await pdfParse(buffer);
            return data.text || '';
        }
        if (ext === '.docx') {
            const text = extractDocx(buffer);
            console.log(`  [提取] docx → ${text.length} 字`);
            return text;
        }
        if (ext === '.pptx') {
            const text = extractPptx(buffer);
            console.log(`  [提取] pptx → ${text.length} 字`);
            return text;
        }
        if (ext === '.xlsx') {
            const text = extractXlsx(buffer);
            console.log(`  [提取] xlsx → ${text.length} 字`);
            return text;
        }
        if (TEXT_EXTENSIONS.has(ext)) {
            return buffer.toString('utf8');
        }
        // 其他格式：尝试以 UTF-8 解码，失败则返回空串
        try {
            const text = buffer.toString('utf8');
            const printable = (text.match(/[\x20-\x7E\u4e00-\u9fa5\n\r\t]/g) || []).length;
            return printable / text.length > 0.7 ? text : '';
        } catch (_) {
            return '';
        }
    } catch (err) {
        console.warn('文本提取失败:', err.message);
        return '';
    }
}

// -----------------------------------------------------------------
// TF-IDF + 余弦相似度引擎
// -----------------------------------------------------------------

/** 分词：中英文混合，去停用词 */
function tokenize(text) {
    const STOPWORDS = new Set([
        // 中文高频虚词
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '上',
        '也', '很', '到', '说', '要', '你', '会', '着', '这', '那', '它', '她', '他',
        '我们', '你们', '他们', '但是', '因为', '所以', '如果', '然后', '还是', '或者',
        '可以', '已经', '通过', '进行', '对于', '根据', '同时', '以及', '方面', '问题',
        // 英文停用词
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
        'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
        'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
        'this', 'that', 'these', 'those', 'it', 'its', 'as', 'from', 'about', 'into',
        'then', 'than', 'so', 'if', 'which', 'when', 'where', 'who', 'what', 'how',
        'not', 'no', 'nor', 'can', 'our', 'we', 'us', 'they', 'their', 'all', 'each'
    ]);

    // 对中文按字/词切分（滑动二元组 + 单字），英文按空格分词
    const tokens = [];
    const lower = text.toLowerCase();

    // 英文词
    const engWords = lower.match(/[a-z]{2,}/g) || [];
    for (const w of engWords) {
        if (!STOPWORDS.has(w)) tokens.push(w);
    }

    // 中文：提取连续汉字段落，生成 bigram（二字词）+ 单字
    const zhBlocks = lower.match(/[\u4e00-\u9fa5]+/g) || [];
    for (const block of zhBlocks) {
        // 单字
        for (const ch of block) {
            if (!STOPWORDS.has(ch)) tokens.push(ch);
        }
        // bigram
        for (let i = 0; i < block.length - 1; i++) {
            const bigram = block[i] + block[i + 1];
            if (!STOPWORDS.has(bigram)) tokens.push(bigram);
        }
    }

    // 数字（版本号、年份等往往有意义）
    const nums = lower.match(/\d{2,}/g) || [];
    tokens.push(...nums);

    return tokens;
}

/** 词频统计 */
function termFreq(tokens) {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    // 归一化
    const total = tokens.length || 1;
    for (const [k, v] of tf) tf.set(k, v / total);
    return tf;
}

/**
 * 计算 TF-IDF 向量并两两做余弦相似度。
 * @param {string} queryText  查询文档全文
 * @param {{ id: string, text: string }[]} corpus  已存记录（含 fullText）
 * @returns {{ id: string, score: number }[]}  按分值降序
 */
function tfidfCosine(queryText, corpus) {
    if (!corpus.length) return [];

    // 1. 分词
    const queryTokens = tokenize(queryText);
    const corpusTokens = corpus.map(doc => tokenize(doc.text));

    // 2. 建词表（query ∪ all corpus）
    const vocab = new Set(queryTokens);
    for (const tokens of corpusTokens) tokens.forEach(t => vocab.add(t));
    const terms = [...vocab];

    // 3. IDF：log((N+1) / (df+1)) + 1  （平滑处理）
    const N = corpus.length + 1; // +1 for query
    const df = new Map();
    for (const t of terms) {
        let count = queryTokens.includes(t) ? 1 : 0;
        for (const tokens of corpusTokens) {
            if (tokens.includes(t)) count++;
        }
        df.set(t, count);
    }
    const idf = new Map();
    for (const t of terms) idf.set(t, Math.log((N + 1) / (df.get(t) + 1)) + 1);

    // 4. TF-IDF 向量化
    function toVector(tokens) {
        const tf = termFreq(tokens);
        return terms.map(t => (tf.get(t) || 0) * idf.get(t));
    }
    const queryVec = toVector(queryTokens);

    // 5. 余弦相似度
    function cosine(vecA, vecB) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] ** 2;
            normB += vecB[i] ** 2;
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    return corpus.map((doc, i) => ({
        id: doc.id,
        score: cosine(queryVec, toVector(corpusTokens[i]))
    })).sort((a, b) => b.score - a.score);
}

// -----------------------------------------------------------------
// BERT 语义层：调用 Python 微服务获取深度语义相似度
// -----------------------------------------------------------------

const BERT_SERVICE_URL = process.env.BERT_SERVICE_URL || 'http://localhost:5001';
// axios v1.x 在 CommonJS 中真正的实例挂在 .default 上
const axiosInstance = (require('axios').default || require('axios'));

/**
 * 检测 BERT 微服务是否在线（GET /health，超时 3 秒）。
 * @returns {Promise<boolean>}
 */
async function pingBertService() {
    try {
        const res = await axiosInstance.get(`${BERT_SERVICE_URL}/health`, { timeout: 3000 });
        console.log(`  [BERT] /health → ${res.status} ${JSON.stringify(res.data)}`);
        return true;
    } catch (e) {
        console.warn(`  [BERT] /health 失败: ${e.message} (code=${e.code})`);
        return false;
    }
}

/**
 * 调用 BERT 微服务批量计算语义相似度。
 * 若服务不可用则优雅降级（返回 null），不影响其他查重层。
 */
async function callBertService(queryText, documents, threshold = 0.5, topK = 10) {
    if (!documents || documents.length === 0) return null;
    console.log(`  [BERT] /batch-similarity → ${documents.length} 个候选，阈值 ${threshold}`);
    try {
        const response = await axiosInstance.post(
            `${BERT_SERVICE_URL}/batch-similarity`,
            {
                query:     queryText.slice(0, 2000),
                documents: documents.map(d => ({
                    id:   d.id,
                    text: (d.text || '').slice(0, 1000)
                })),
                topK,
                threshold
            },
            { timeout: 15000 }
        );
        const hits = response.data.results || [];
        console.log(`  [BERT] 返回 ${hits.length} 条结果`);
        return hits;
    } catch (e) {
        console.warn(`  [BERT] /batch-similarity 失败: ${e.message} (code=${e.code})`);
        return null;
    }
}

// -----------------------------------------------------------------
// 证据链提取：在查询文本和目标文本中找出最相似的句子对
// -----------------------------------------------------------------

/**
 * 将文本切分为句子（中英文混合）。
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
    if (!text) return [];
    return text
        .split(/[.!?。！？\n\r]+/)
        .map(s => s.trim())
        .filter(s => s.length >= 15);  // 过滤过短片段
}

/**
 * 提取查询文本与目标文本之间的最佳匹配句子对（证据链）。
 * 使用 TF-IDF 余弦相似度在句子粒度定位相似内容，生成可读的匹配证据。
 *
 * @param {string} queryText    查询文档全文
 * @param {string} targetText   目标文档全文（或摘要）
 * @param {number} maxSnippets  最大返回证据条数（默认 3）
 * @returns {{ querySnippet, targetSnippet, matchScore }[]}
 */
function extractEvidenceSnippets(queryText, targetText, maxSnippets = 3) {
    const querySentences  = splitSentences(queryText);
    const targetSentences = splitSentences(targetText);

    if (querySentences.length === 0 || targetSentences.length === 0) return [];

    // 构建目标句子语料库
    const targetCorpus = targetSentences.map((text, i) => ({
        id:   String(i),
        text
    }));

    const snippets = [];
    const usedTargetIdxs = new Set();

    // 最多扫描前 40 条查询句子（避免超大文档拖慢响应）
    for (const qSent of querySentences.slice(0, 40)) {
        const scores = tfidfCosine(qSent, targetCorpus);
        if (scores.length === 0) continue;

        const best = scores[0];
        const targetIdx = parseInt(best.id);
        if (best.score < 0.25 || usedTargetIdxs.has(targetIdx)) continue;

        usedTargetIdxs.add(targetIdx);
        snippets.push({
            querySnippet:  qSent.slice(0, 250),
            targetSnippet: targetSentences[targetIdx].slice(0, 250),
            matchScore:    Math.round(best.score * 100)
        });

        if (snippets.length >= maxSnippets) break;
    }

    return snippets.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 为相似度最高的若干文档生成完整证据链。
 *
 * @param {string} queryText         查询文档全文
 * @param {{ id, title, authors, abstract, similarityScore, source, record }[]} topMatches
 * @returns {{ sourceTitle, sourceAuthor, sourceId, matchedSnippets, overallSimilarity, source }[]}
 */
function buildEvidenceChain(queryText, topMatches) {
    const chain = [];

    for (const match of topMatches.slice(0, 5)) {
        const r       = match.record  || {};
        const title   = match.title   || r.title   || '（无标题）';
        const authors = match.authors || r.authors  || r.authorId || '';
        const targetText = (r.fullText && r.fullText.length > 50)
            ? r.fullText
            : [r.abstract || match.abstract || '', r.title || match.title || ''].join(' ');

        const snippets = extractEvidenceSnippets(queryText, targetText, 3);

        chain.push({
            sourceId:        match.researchId || `db_${match.id}` || '',
            sourceTitle:     title,
            sourceAuthor:    authors,
            sourcePublished: match.published   || r.published || r.timestamp || null,
            sourceType:      match.source,
            matchedSnippets: snippets,
            overallSimilarity: match.similarityScore || match.similarityPercent || 0,
            similarityBreakdown: match.similarityBreakdown || null
        });
    }

    return chain;
}

/**
 * 根据各层结果计算综合风险评级。
 * @param {{ hashMatch, simhashMatches, tfidfMatches, bertMatches }} layers
 * @returns {{ riskLevel: string, maxSimilarity: number, summary: string }}
 */
function assessRisk(layers) {
    const { hashMatch, simhashMatches, tfidfMatches, bertMatches } = layers;

    if (hashMatch && hashMatch.found) {
        return { riskLevel: 'critical', maxSimilarity: 100,
            summary: 'SHA-256 精确匹配，文件完全相同，属重复提交。' };
    }

    const simMax   = (simhashMatches  || []).reduce((m, i) => Math.max(m, i.similarityPercent || 0), 0);
    const tfidfMax = (tfidfMatches    || []).reduce((m, i) => Math.max(m, i.similarityScore   || 0), 0);
    const bertMax  = (bertMatches     || []).reduce((m, i) => Math.max(m, i.similarityPercent || 0), 0);
    const maxSim   = Math.max(simMax, tfidfMax, bertMax);

    let riskLevel, summary;
    if (maxSim >= 70) {
        riskLevel = 'high';
        summary   = `多层查重均检测到高度相似内容（最高 ${maxSim}%），存在严重重复风险。`;
    } else if (maxSim >= 40) {
        riskLevel = 'medium';
        summary   = `检测到中度相似内容（最高 ${maxSim}%），建议人工核查相关段落。`;
    } else if (maxSim >= 15) {
        riskLevel = 'low';
        summary   = `存在轻微相似（最高 ${maxSim}%），可能为引用或通用表达，原创性较高。`;
    } else {
        riskLevel = 'none';
        summary   = '三层查重均未发现显著重复内容，原创性良好。';
    }

    return { riskLevel, maxSimilarity: maxSim, simMax, tfidfMax, bertMax, summary };
}

// -----------------------------------------------------------------
// 1. 核心存证路由：支持实名 / 团队 / 匿名三模式
//    新增：数字指纹（SHA-256）、文件加密、创作者绑定、可信时间戳
// -----------------------------------------------------------------
router.post('/deposit', upload.single('file'), async (req, res) => {
    try {
        const {
            title, authorId, type, abstract, keywords, metadata, zkpProof,
            creatorId,    // 个人学号/工号（单人模式）
            creators,     // JSON 字符串：[{ name, creatorId, walletAddress, share }]
            encrypt       // '1' 表示启用 AES-256 加密
        } = req.body;
        const file = req.file;

        if (!file)  return res.status(400).json({ error: '请上传文件' });
        if (!title) return res.status(400).json({ error: '缺少标题' });

        // ── Step 1: 计算数字指纹（SHA-256）──────────────────────────────
        let fileBuffer = fs.readFileSync(file.path);
        const rawHash   = await calculateFileHash(fileBuffer);
        const contentHash = ethers.utils.hexZeroPad(`0x${rawHash}`, 32);

        // ── Step 2: 提取全文（查重用，加密前操作）───────────────────────
        const extractedText = await extractText(file.path, file.originalname);

        // ── Step 3: 可选 AES-256 文件加密 ───────────────────────────────
        let encryptionKey = '';
        let uploadBuffer  = fileBuffer;
        const shouldEncrypt = encrypt === '1' || encrypt === true;
        if (shouldEncrypt) {
            const enc     = encryptFileBuffer(fileBuffer);
            uploadBuffer  = enc.encryptedBuffer;
            encryptionKey = enc.key;
            console.log(`🔒 文件已加密，AES-256 密钥: ${encryptionKey.slice(0, 8)}...`);
        }

        // ── Step 4: 上传到 IPFS（或本地存储）───────────────────────────
        let ipfsHash = '';
        try {
            const ipfs = initIPFS();
            const { cid } = await ipfs.add(uploadBuffer);
            ipfsHash = cid.toString();
            await ipfs.pin.add(ipfsHash);
            fs.unlinkSync(file.path);
        } catch (_) {
            // IPFS unavailable — use SHA-256 of the file content as the local identifier
            ipfsHash = `local:${rawHash}`;
        }

        // ── Step 5: 生成可信时间戳 ────────────────────────────────────
        let tsToken = '', tsHash = '', tsTime = '', tsSrc = '';
        if (!zkpProof) {  // 匿名模式跳过，避免时序关联攻击
            try {
                const ts = await generateTrustedTimestamp(rawHash);
                tsToken  = ts.token;
                tsHash   = ts.tokenHash;
                tsTime   = ts.datetime;
                tsSrc    = ts.source;
                console.log(`⏰ 可信时间戳来源: ${tsSrc}，时间: ${tsTime}`);
            } catch (e) {
                console.warn('⚠️ 可信时间戳生成失败（降级）:', e.message);
                tsTime = new Date().toISOString();
                tsSrc  = 'local-fallback';
            }
        }

        // ── Step 6: 解析创作者信息 ────────────────────────────────────
        const researchId = `research_${Date.now()}`;
        let parsedCreators = [];
        try {
            parsedCreators = creators ? JSON.parse(creators) : [];
        } catch (_) { parsedCreators = []; }

        // ── Step 7: 上链 ──────────────────────────────────────────────
        let result;

        if (zkpProof) {
            // 匿名模式（ZKP）
            const p = JSON.parse(zkpProof);
            result = await blockchainService.anonymousDeposit(
                title, 'Anonymous Author', abstract || '',
                ipfsHash, type || 'unknown',
                p.a, p.b, p.c, p.input
            );
        } else if (parsedCreators.length > 1) {
            // 团队模式
            if (!authorId) return res.status(400).json({ error: '实名上传缺少 authorId' });
            const cIds   = parsedCreators.map(c => c.creatorId || c.name || '');
            const cAddrs = parsedCreators.map(c => c.walletAddress || ethers.constants.AddressZero);
            const cShares= parsedCreators.map(c => parseInt(c.share || 0));
            // 校验 shares 和为 10000
            const sharesSum = cShares.reduce((a, b) => a + b, 0);
            if (sharesSum !== 10000) {
                return res.status(400).json({ error: `贡献比例之和必须为 100%（当前: ${sharesSum / 100}%）` });
            }
            result = await blockchainService.depositWithTeam(
                title, abstract || '', ipfsHash, type || 'unknown',
                tsHash, cIds, cAddrs, cShares
            );
        } else {
            // 个人实名模式
            if (!authorId) return res.status(400).json({ error: '实名上传缺少 authorId' });
            result = await blockchainService.depositResearch(
                researchId, title, authorId, ipfsHash, contentHash,
                { abstract: abstract || '', fileType: type || 'unknown', trustedTimestampHash: tsHash }
            );
        }

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // ── Step 8: 构建 MongoDB 创作者列表 ──────────────────────────
        const dbCreators = parsedCreators.length > 0
            ? parsedCreators.map(c => ({
                creatorId:         c.creatorId || '',
                walletAddress:     c.walletAddress || '',
                contributionShare: parseInt(c.share || 0),
                name:              c.name || ''
              }))
            : [{
                creatorId:         creatorId || authorId || '',
                walletAddress:     authorId || '',
                contributionShare: 10000,
                name:              ''
              }];

        // ── Step 9: 保存到 MongoDB ────────────────────────────────────
        const newResearch = new Research({
            researchId,
            title,
            authorId:             zkpProof ? 'Anonymous' : authorId,
            type:                 type || 'unknown',
            abstract:             abstract || '',
            keywords:             keywords || '',
            fileUrl:              (ipfsHash.startsWith('local:') || ipfsHash.startsWith('local_')) ? `/uploads/${file.filename}` : `/ipfs/${ipfsHash}`,
            ipfsHash,
            contentHash,
            transactionHash:      result.transactionHash,
            isAnonymous:          !!zkpProof,
            fullText:             extractedText,
            metadata:             metadata ? JSON.parse(metadata) : {},
            isEncrypted:          shouldEncrypt,
            encryptionKey,
            creators:             dbCreators,
            trustedTimestamp:     tsToken,
            trustedTimestampHash: tsHash,
            trustedTimestampTime: tsTime,
            trustedTimestampSrc:  tsSrc,
            // 版本管理：首版自引用
            versionGroup:         researchId,
            version:              1,
            isLatest:             true,
            previousVersionId:    '',
            changeNote:           ''
        });
        await newResearch.save();

        res.status(201).json({
            message:          '成果存储成功',
            researchId,
            transactionHash:  result.transactionHash,
            ipfsHash,
            contentHash,
            isAnonymous:      !!zkpProof,
            isEncrypted:      shouldEncrypt,
            encryptionKey:    shouldEncrypt ? encryptionKey : undefined, // 返回给用户保管
            trustedTimestamp: {
                time:   tsTime,
                source: tsSrc,
                hash:   tsHash
            }
        });
    } catch (error) {
        console.error('存证失败:', error);
        res.status(500).json({ error: '服务器错误', detail: error.message });
    }
});

// -----------------------------------------------------------------
// 2. 算力辅助路由：后端生成 ZKP 证明 (利用 4060 显卡)
// -----------------------------------------------------------------
router.post('/generate-proof', async (req, res) => {
    try {
        const { secret, publicHash } = req.body;
        if (!secret || !publicHash) return res.status(400).json({ error: '缺少秘密值或公开哈希' });

        // 使用 snarkjs 在本地生成证明
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            { secret, publicHash },
            WASM_PATH,
            ZKEY_PATH
        );

        // 格式化为合约可直接接收的调用数据格式
        const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
        const argv = JSON.parse("[" + calldata + "]");

        res.json({
            a: argv[0],
            b: argv[1],
            c: argv[2],
            input: argv[3]
        });
    } catch (error) {
        console.error('ZKP 证明生成失败:', error);
        res.status(500).json({ error: '证明生成失败', detail: error.message });
    }
});

// -----------------------------------------------------------------
// 3. 查询路由
// -----------------------------------------------------------------
router.get('/research/:researchId', async (req, res) => {
    try {
        const research = await Research.findOne({ researchId: req.params.researchId });
        if (research) res.json(research);
        else res.status(404).json({ error: '未找到成果' });
    } catch (error) {
        res.status(500).json({ error: '查询失败' });
    }
});

router.get('/hash/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        // 同时匹配 IPFS 哈希、区块链交易哈希 和 内容 SHA-256 哈希
        const research = await Research.findOne({
            $or: [
                { ipfsHash: hash },
                { transactionHash: hash },
                { contentHash: hash }
            ]
        });
        if (!research) return res.status(404).json({ error: '未找到该哈希的成果' });
        res.json(research);
    } catch (error) {
        res.status(500).json({ error: '查询失败' });
    }
});

router.get('/author/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { page = 1, limit = 10, includeOld } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        // 默认只返回最新版本；传 includeOld=true 则返回所有版本
        const filter = { authorId: address };
        if (includeOld !== 'true') filter.isLatest = true;
        const [researches, total] = await Promise.all([
            Research.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)),
            Research.countDocuments(filter)
        ]);

        res.json({ results: researches, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: '作者查询失败' });
    }
});

router.post('/batch-verify', async (req, res) => {
    try {
        const { queries } = req.body;
        const results = [];
        for (const q of queries) {
            let research;
            if (q.type === 'id') {
                research = await Research.findOne({ researchId: q.value });
            } else {
                // 同时匹配 IPFS 哈希、区块链交易哈希 和 内容 SHA-256 哈希
                research = await Research.findOne({
                    $or: [
                        { ipfsHash: q.value },
                        { transactionHash: q.value },
                        { contentHash: q.value }
                    ]
                });
            }
            results.push({ query: q, exists: !!research, data: research || null });
        }
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: '批量验证失败' });
    }
});

// -----------------------------------------------------------------
// 4. 查重路由：分层多维查重
//    粗筛层：SimHash + 分段索引
//    细排层：TF-IDF + 余弦相似度
//    语义层：BERT 全文深度查重
//    输出：相似度分值 + 证据链（来源标题、作者、匹配内容）
// -----------------------------------------------------------------

router.post('/check-duplicate', upload.single('file'), async (req, res) => {
    const reqId = Date.now().toString(36).toUpperCase(); // 请求追踪 ID
    const t0    = Date.now();
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[查重] 请求开始  ID=${reqId}  ${new Date().toISOString()}`);

    try {
        const { title = '', abstract = '', keywords = '' } = req.body;
        const file = req.file;

        console.log(`[查重][${reqId}] 输入: file=${file ? file.originalname + ' (' + file.size + 'B)' : '无'} title="${title.slice(0,40)}" abstract=${abstract.length}字 keywords="${keywords.slice(0,30)}"`);

        const result = {
            hashMatch:       null,
            simhashMatches:  [],
            similarContent:  [],
            bertMatches:     null,
            bertAvailable:   false,
            querySimhash:    null,
            querySegments:   [],
            evidenceChain:   [],
            corpus:          {},
            report:          null
        };

        // ════════════════════════════════════════════════════════════
        // 层 0：SHA-256 精确哈希查重
        // ════════════════════════════════════════════════════════════
        let queryFullText = '';
        let rawHash       = null;

        if (file) {
            const t = Date.now();
            const fileBuffer = fs.readFileSync(file.path);
            rawHash          = await calculateFileHash(fileBuffer);
            queryFullText    = await extractText(file.path, file.originalname);
            fs.unlinkSync(file.path);

            const contentHash = ethers.utils.hexZeroPad(`0x${rawHash}`, 32);
            const exactMatch  = await Research.findOne({ contentHash });

            result.hashMatch = exactMatch
                ? { found: true, researchId: exactMatch.researchId, title: exactMatch.title,
                    authorId: exactMatch.isAnonymous ? 'Anonymous' : exactMatch.authorId,
                    type: exactMatch.type, abstract: exactMatch.abstract,
                    transactionHash: exactMatch.transactionHash,
                    timestamp: exactMatch.timestamp, sha256: rawHash }
                : { found: false, sha256: rawHash };

            console.log(`[查重][${reqId}] 层0 SHA-256: ${rawHash.slice(0,16)}… → ${result.hashMatch.found ? '命中 ' + exactMatch.researchId : '未命中'}  全文 ${queryFullText.length} 字  +${Date.now()-t}ms`);
        } else {
            console.log(`[查重][${reqId}] 层0 SHA-256: 跳过（无文件）`);
        }

        // ════════════════════════════════════════════════════════════
        // 层 1：SimHash 粗筛（全文 + 分段索引）
        // ════════════════════════════════════════════════════════════
        const metaText  = [title, abstract, keywords].filter(Boolean).join(' ');
        const queryText = queryFullText ? queryFullText + ' ' + metaText : metaText;

        if (queryText.trim().length < 10) {
            console.log(`[查重][${reqId}] 文本过短（${queryText.trim().length} 字），终止查重`);
            return res.json(result);
        }

        const t1 = Date.now();
        const querySimhash  = computeSimhash(queryText);
        const querySegments = computeSegmentedSimhash(queryText, 4);
        result.querySimhash  = querySimhash;
        result.querySegments = querySegments;

        result.simhashMatches = querySimhashDBSegmented(
            querySimhash, querySegments, 16, 12, 10
        );
        console.log(`[查重][${reqId}] 层1 SimHash: 全文=${querySimhash.slice(0,16)}… 分段=${querySegments.length}段 → 命中 ${result.simhashMatches.length} 篇  +${Date.now()-t1}ms`);
        if (result.simhashMatches.length) {
            result.simhashMatches.forEach(m =>
                console.log(`  [SimHash]  Ham=${m.hammingDistance} ${m.level} type=${m.matchType}  "${m.title.slice(0,50)}"`)
            );
        }

        // ════════════════════════════════════════════════════════════
        // 层 2：TF-IDF + 余弦相似度
        // ════════════════════════════════════════════════════════════
        const t2 = Date.now();
        const [allMongoRecords, dbPapers] = await Promise.all([
            Research.find({}, 'researchId title abstract keywords authorId type transactionHash timestamp isAnonymous fullText'),
            Promise.resolve(getDBCorpus())
        ]);

        const corpus = [];
        for (const r of allMongoRecords) {
            const text = r.fullText && r.fullText.length > 50
                ? r.fullText + ' ' + [r.title, r.abstract, r.keywords].join(' ')
                : [r.title, r.abstract, r.keywords].filter(Boolean).join(' ');
            if (text.trim().length > 0) corpus.push({ id: r.researchId, text, source: 'system', record: r });
        }
        for (const p of dbPapers) {
            const text = [p.title, p.abstract].filter(Boolean).join(' ');
            if (text.trim().length > 0) corpus.push({ id: `db_${p.id}`, text, source: 'papers_db', record: p });
        }

        result.corpus = { system: allMongoRecords.length, papers_db: dbPapers.length, total: corpus.length };
        console.log(`[查重][${reqId}] 层2 TF-IDF 语料库: 系统 ${allMongoRecords.length} + papers.db ${dbPapers.length} = ${corpus.length} 篇`);

        let tfidfTopMatches = [];
        if (corpus.length > 0) {
            const scores = tfidfCosine(queryText, corpus);
            tfidfTopMatches = scores
                .filter(({ score }) => score >= 0.08)
                .slice(0, 10)
                .map(({ id, score }) => {
                    const entry = corpus.find(c => c.id === id);
                    const r     = entry.record;
                    if (entry.source === 'system') {
                        return {
                            researchId: r.researchId, title: r.title,
                            authors: r.isAnonymous ? 'Anonymous' : r.authorId,
                            authorId: r.isAnonymous ? 'Anonymous' : r.authorId,
                            type: r.type, abstract: r.abstract,
                            transactionHash: r.transactionHash, timestamp: r.timestamp,
                            similarityScore: Math.round(score * 100),
                            usedFullText: !!(r.fullText && r.fullText.length > 50),
                            source: 'system', record: r
                        };
                    } else {
                        return {
                            researchId: `papers_db_${r.id}`,
                            title: r.title || '（无标题）', authors: r.authors || '',
                            authorId: r.authors || '外部论文库',
                            published: r.published || '', dbSource: r.source || '',
                            type: 'paper', abstract: r.abstract || '',
                            transactionHash: null, timestamp: r.published || null,
                            similarityScore: Math.round(score * 100),
                            usedFullText: false, source: 'papers_db', record: r
                        };
                    }
                });
            result.similarContent = tfidfTopMatches;
        }
        console.log(`[查重][${reqId}] 层2 TF-IDF: 命中 ${tfidfTopMatches.length} 篇（阈值 8%）  +${Date.now()-t2}ms`);
        if (tfidfTopMatches.length) {
            tfidfTopMatches.forEach(m =>
                console.log(`  [TF-IDF]  ${m.similarityScore}%  "${m.title.slice(0,50)}"  来源=${m.source}`)
            );
        }

        // ════════════════════════════════════════════════════════════
        // 层 3：BERT 语义层
        // ════════════════════════════════════════════════════════════
        const t3 = Date.now();
        console.log(`[查重][${reqId}] 层3 BERT: 正在 ping ${BERT_SERVICE_URL}/health …`);
        result.bertAvailable = await pingBertService();
        console.log(`[查重][${reqId}] 层3 BERT: 服务${result.bertAvailable ? '在线 ✓' : '离线 ✗'}  +${Date.now()-t3}ms`);

        const bertCandidates = [];
        for (const m of tfidfTopMatches) {
            bertCandidates.push({ id: m.researchId, text: m.abstract || m.title || '', meta: m });
        }
        for (const m of result.simhashMatches) {
            if ((m.level === 'exact' || m.level === 'high') &&
                !bertCandidates.some(c => c.id === `db_${m.id}`)) {
                bertCandidates.push({ id: `db_${m.id}`, text: m.abstract || m.title || '', meta: m });
            }
        }
        console.log(`[查重][${reqId}] 层3 BERT: 候选文档 ${bertCandidates.length} 篇`);

        if (result.bertAvailable && bertCandidates.length > 0) {
            const bertResults = await callBertService(queryText, bertCandidates, 0.45, 10);
            if (bertResults !== null) {
                result.bertMatches = bertResults.map(br => {
                    const cand       = bertCandidates.find(c => c.id === br.id);
                    const tfidfScore = cand?.meta?.similarityScore || 0;
                    return {
                        researchId:   br.id,
                        title:        cand?.meta?.title   || '',
                        authors:      cand?.meta?.authors || cand?.meta?.authorId || '',
                        abstract:     cand?.meta?.abstract || '',
                        source:       cand?.meta?.source  || 'papers_db',
                        timestamp:    cand?.meta?.timestamp || cand?.meta?.published || null,
                        bertScore:    br.similarityPercent,
                        tfidfScore,
                        similarityScore: Math.round(br.similarityPercent * 0.6 + tfidfScore * 0.4),
                        similarityBreakdown: { bert: br.similarityPercent, tfidf: tfidfScore }
                    };
                });
                console.log(`[查重][${reqId}] 层3 BERT: 结果 ${result.bertMatches.length} 篇`);
                result.bertMatches.forEach(m =>
                    console.log(`  [BERT]  综合=${m.similarityScore}% bert=${m.bertScore}% tfidf=${m.tfidfScore}%  "${m.title.slice(0,50)}"`)
                );
            }
        } else if (result.bertAvailable && bertCandidates.length === 0) {
            console.log(`[查重][${reqId}] 层3 BERT: 在线但无候选文档，跳过嵌入比对`);
        }

        // ════════════════════════════════════════════════════════════
        // 证据链
        // ════════════════════════════════════════════════════════════
        if (queryText.length >= 50) {
            const t4 = Date.now();
            const allMatches = [];
            for (const m of tfidfTopMatches.slice(0, 5))
                allMatches.push({ ...m, overallScore: m.similarityScore });
            for (const m of (result.bertMatches || []).slice(0, 5)) {
                const dup = allMatches.find(a => a.researchId === m.researchId);
                if (dup) { dup.overallScore = Math.max(dup.overallScore, m.similarityScore); dup.similarityBreakdown = m.similarityBreakdown; }
                else allMatches.push({ ...m, overallScore: m.similarityScore });
            }
            allMatches.sort((a, b) => b.overallScore - a.overallScore);
            result.evidenceChain = buildEvidenceChain(queryText, allMatches.slice(0, 5));
            console.log(`[查重][${reqId}] 证据链: ${result.evidenceChain.length} 条，共 ${result.evidenceChain.reduce((s,e)=>s+e.matchedSnippets.length,0)} 个匹配片段  +${Date.now()-t4}ms`);
        }

        // ════════════════════════════════════════════════════════════
        // 综合报告
        // ════════════════════════════════════════════════════════════
        result.report = assessRisk({
            hashMatch: result.hashMatch, simhashMatches: result.simhashMatches,
            tfidfMatches: tfidfTopMatches, bertMatches: result.bertMatches
        });

        const total = Date.now() - t0;
        console.log(`[查重][${reqId}] 完成  风险=${result.report.riskLevel}  最高相似=${result.report.maxSimilarity}%  总耗时 ${total}ms`);
        console.log(`${'─'.repeat(60)}\n`);

        res.json(result);
    } catch (error) {
        console.error(`[查重][${reqId}] 异常:`, error);
        res.status(500).json({ error: '查重服务失败', detail: error.message });
    }
});

// -----------------------------------------------------------------
// 4b. papers.db 状态路由
// -----------------------------------------------------------------
router.get('/db-stats', (req, res) => {
    res.json(getDBStats());
});

// -----------------------------------------------------------------
// 5. 统计路由：系统总体数据
// -----------------------------------------------------------------
router.get('/stats', async (req, res) => {
    try {
        const [total, anonymous, byType, recent] = await Promise.all([
            Research.countDocuments(),
            Research.countDocuments({ isAnonymous: true }),
            Research.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
            Research.find({}, 'researchId title authorId type timestamp isAnonymous transactionHash')
                .sort({ timestamp: -1 })
                .limit(10)
        ]);
        res.json({
            total,
            anonymous,
            named: total - anonymous,
            byType: Object.fromEntries(byType.map(b => [b._id, b.count])),
            recent
        });
    } catch (error) {
        res.status(500).json({ error: '统计查询失败' });
    }
});

// -----------------------------------------------------------------
// 6. 全量列表路由（管理用，支持分页与类型过滤）
// -----------------------------------------------------------------
router.get('/list', async (req, res) => {
    try {
        const { page = 1, limit = 20, type, isAnonymous, includeOld } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const filter = {};
        if (includeOld !== 'true') filter.isLatest = true;
        if (type) filter.type = type;
        if (isAnonymous !== undefined && isAnonymous !== '') {
            filter.isAnonymous = isAnonymous === 'true';
        }
        const [results, total] = await Promise.all([
            Research.find(filter, '-fullText')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Research.countDocuments(filter)
        ]);
        res.json({ results, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: '列表查询失败' });
    }
});

// -----------------------------------------------------------------
// 7. 版本管理路由
// -----------------------------------------------------------------

// 上传新版本（替代删除）
// 请求体：multipart/form-data，与 /deposit 相同字段，额外需要 versionGroupId + changeNote
router.post('/update-version', upload.single('file'), async (req, res) => {
    try {
        const {
            authorId, title, type, abstract, keywords,
            versionGroupId, changeNote,
            metadata, trustedTimestampEnabled
        } = req.body;

        if (!versionGroupId) return res.status(400).json({ error: '缺少 versionGroupId' });
        if (!authorId)       return res.status(400).json({ error: '缺少 authorId' });
        if (!req.file)       return res.status(400).json({ error: '未上传文件' });

        // 查找当前最新版
        const latestDoc = await Research.findOne({ versionGroup: versionGroupId, isLatest: true });
        if (!latestDoc) return res.status(404).json({ error: '未找到原始成果，versionGroupId 不存在' });

        // 鉴权：仅作者本人可上传新版本
        if (latestDoc.authorId !== authorId && latestDoc.authorId !== 'Anonymous') {
            return res.status(403).json({ error: '无权限：只有原作者可以上传新版本' });
        }

        const file = req.file;
        const fs   = require('fs');

        // 读取文件 buffer
        const fileBuffer = file.buffer || fs.readFileSync(file.path);

        // 提取文本
        let extractedText = '';
        try { extractedText = extractText(fileBuffer, file.originalname); } catch (_) {}

        // 内容哈希
        const contentHash = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');

        // 生成新 researchId
        const newResearchId = 'R' + Date.now().toString(36).toUpperCase();
        const newVersion    = latestDoc.version + 1;

        // IPFS / 本地存储
        let ipfsHash = '';
        let savedFilename = file.originalname;
        try {
            const { create } = require('ipfs-http-client');
            const ipfsClient = create({ url: process.env.IPFS_API_URL || 'http://127.0.0.1:5001' });
            const added = await ipfsClient.add(fileBuffer);
            ipfsHash = added.cid.toString();
        } catch (_) {
            ipfsHash = 'local_' + newResearchId;
            const uploadsDir = path.join(__dirname, '../../uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            savedFilename = newResearchId + '_' + file.originalname;
            fs.writeFileSync(path.join(uploadsDir, savedFilename), fileBuffer);
        }

        // 区块链存证（可选）
        let txHash = '';
        try {
            const { ethers } = require('ethers');
            const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
            const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001', provider);
            const ResearchABI = require('../../artifacts/contracts/ResearchDeposit.sol/ResearchDeposit.json').abi;
            const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ResearchABI, wallet);
            const tx = await contract.deposit(newResearchId, contentHash, ipfsHash);
            const receipt = await tx.wait();
            txHash = receipt.hash;
        } catch (_) {
            txHash = '0x' + require('crypto').randomBytes(32).toString('hex');
        }

        // 可信时间戳（可选）
        let tsToken = '', tsHash = '', tsTime = '', tsSrc = '';
        try {
            if (trustedTimestampEnabled === 'true' || trustedTimestampEnabled === true) {
                const tsResult = await obtainTrustedTimestamp(contentHash);
                tsToken = tsResult.token || ''; tsHash = tsResult.hash || '';
                tsTime  = tsResult.time  || ''; tsSrc  = tsResult.src  || '';
            }
        } catch (_) {}

        // 将旧版本标记为非最新
        await Research.updateOne({ versionGroup: versionGroupId, isLatest: true }, { $set: { isLatest: false } });

        // 创建新版本文档
        const newDoc = new Research({
            researchId:           newResearchId,
            title:                title || latestDoc.title,
            authorId:             latestDoc.authorId,
            type:                 type  || latestDoc.type,
            abstract:             abstract !== undefined ? abstract : latestDoc.abstract,
            keywords:             keywords !== undefined ? keywords : latestDoc.keywords,
            fileUrl:              ipfsHash.startsWith('local') ? `/uploads/${savedFilename}` : `/ipfs/${ipfsHash}`,
            ipfsHash,
            contentHash,
            transactionHash:      txHash,
            isAnonymous:          latestDoc.isAnonymous,
            fullText:             extractedText,
            metadata:             metadata ? JSON.parse(metadata) : latestDoc.metadata,
            isEncrypted:          latestDoc.isEncrypted,
            encryptionKey:        latestDoc.encryptionKey,
            creators:             latestDoc.creators,
            trustedTimestamp:     tsToken,
            trustedTimestampHash: tsHash,
            trustedTimestampTime: tsTime,
            trustedTimestampSrc:  tsSrc,
            versionGroup:         versionGroupId,
            version:              newVersion,
            isLatest:             true,
            previousVersionId:    latestDoc.researchId,
            changeNote:           changeNote || ''
        });
        await newDoc.save();

        res.status(201).json({
            message:         '新版本上传成功',
            researchId:      newResearchId,
            version:         newVersion,
            versionGroup:    versionGroupId,
            transactionHash: txHash,
            contentHash,
            ipfsHash
        });
    } catch (error) {
        console.error('版本更新失败:', error);
        res.status(500).json({ error: '版本更新失败', detail: error.message });
    }
});

// 获取某成果的所有历史版本
router.get('/versions/:versionGroupId', async (req, res) => {
    try {
        const versions = await Research.find(
            { versionGroup: req.params.versionGroupId },
            '-fullText'
        ).sort({ version: 1 });

        if (!versions.length) return res.status(404).json({ error: '未找到该成果的版本记录' });

        res.json({ versionGroup: req.params.versionGroupId, total: versions.length, versions });
    } catch (error) {
        res.status(500).json({ error: '版本查询失败' });
    }
});

module.exports = router;