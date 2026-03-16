/**
 * 可信时间戳服务
 * ─────────────────────────────────────────────────────────────────
 * 实现思路：
 *  1. 向世界时间 API (worldtimeapi.org) 或国家时间服务中心 NTP 代理查询权威时间
 *  2. 将 contentHash + 权威时间 + nonce 打包后用 HMAC-SHA256 签名
 *  3. 返回 Base64 编码的 token（可被链上或数据库记录）
 *
 * 生产环境建议：替换为符合 RFC 3161 的真实 TSA（如 DigiCert、Sectigo）
 * 本实现遵循 RFC 3161 Token 结构概念，适用于学术演示。
 */

'use strict';

const crypto = require('crypto');
const https  = require('https');
const http   = require('http');

// 服务端签名密钥（生产环境应使用环境变量）
const TS_SECRET = process.env.TS_SECRET || 'xiyuan-tsa-hmac-secret-2024-fdu';

// 可信时间源列表（按优先级）
const TIME_SOURCES = [
    {
        name:     '中国标准时间 (worldtimeapi)',
        url:      'https://worldtimeapi.org/api/timezone/Asia/Shanghai',
        protocol: https,
        parse:    (data) => JSON.parse(data).datetime
    },
    {
        name:     'UTC时间 (timeapi.io)',
        url:      'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Shanghai',
        protocol: https,
        parse:    (data) => {
            const j = JSON.parse(data);
            return `${j.date}T${j.time}+08:00`;
        }
    }
];

/**
 * 从权威时间源获取时间戳字符串（ISO 8601）
 * @returns {Promise<{ datetime: string, source: string }>}
 */
async function fetchAuthoritativeTime() {
    for (const src of TIME_SOURCES) {
        try {
            const datetime = await new Promise((resolve, reject) => {
                const req = src.protocol.get(src.url, { timeout: 4000 }, (res) => {
                    let body = '';
                    res.on('data', chunk => { body += chunk; });
                    res.on('end', () => {
                        try { resolve(src.parse(body)); }
                        catch (e) { reject(e); }
                    });
                });
                req.on('error',   reject);
                req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            });
            return { datetime, source: src.name };
        } catch (_) {
            // 尝试下一个时间源
        }
    }
    // 所有外部源失败时，降级到本地系统时间（并标注）
    return {
        datetime: new Date().toISOString(),
        source:   'local-system-clock (fallback)'
    };
}

/**
 * 生成可信时间戳 Token
 *
 * @param {string} contentHash - 文件 SHA-256 哈希（hex）
 * @returns {Promise<{ token: string, datetime: string, source: string, tokenHash: string }>}
 *   token     - Base64 编码的 JSON token（存入 MongoDB）
 *   tokenHash - token 的 SHA-256 哈希（写入区块链）
 */
async function generateTrustedTimestamp(contentHash) {
    const { datetime, source } = await fetchAuthoritativeTime();

    const payload = {
        version:     1,
        algorithm:   'HMAC-SHA256',
        source,
        datetime,
        contentHash,
        nonce:       crypto.randomBytes(8).toString('hex'),
        issuedAt:    new Date().toISOString()
    };

    const payloadStr = JSON.stringify(payload);
    const signature  = crypto
        .createHmac('sha256', TS_SECRET)
        .update(payloadStr)
        .digest('hex');

    const fullToken = { ...payload, signature };
    const token     = Buffer.from(JSON.stringify(fullToken)).toString('base64');

    // tokenHash 用于写链（链上存 hash，不存完整 token 以节省 Gas）
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return { token, datetime, source, tokenHash };
}

/**
 * 验证可信时间戳 Token
 *
 * @param {string} tokenBase64     - Base64 编码的 token
 * @param {string} expectedHash    - 期望的 contentHash
 * @returns {{ valid: boolean, datetime?: string, source?: string, reason?: string }}
 */
function verifyTrustedTimestamp(tokenBase64, expectedHash) {
    try {
        const fullToken = JSON.parse(Buffer.from(tokenBase64, 'base64').toString('utf8'));
        const { signature, ...payload } = fullToken;

        const expectedSig = crypto
            .createHmac('sha256', TS_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (signature !== expectedSig) {
            return { valid: false, reason: '签名验证失败' };
        }
        if (payload.contentHash !== expectedHash) {
            return { valid: false, reason: '内容哈希不匹配' };
        }
        return {
            valid:    true,
            datetime: payload.datetime,
            source:   payload.source,
            nonce:    payload.nonce
        };
    } catch (e) {
        return { valid: false, reason: `解析失败: ${e.message}` };
    }
}

module.exports = { generateTrustedTimestamp, verifyTrustedTimestamp };
