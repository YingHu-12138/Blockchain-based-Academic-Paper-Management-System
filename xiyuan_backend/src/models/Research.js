const mongoose = require('mongoose');

// 创作者子文档
const creatorSchema = new mongoose.Schema({
    creatorId:         { type: String, required: true },  // 学号 / 工号
    walletAddress:     { type: String, default: '' },     // 钱包地址
    contributionShare: { type: Number, default: 10000 },  // 贡献比例（基点，10000=100%）
    name:              { type: String, default: '' }      // 可选：显示名
}, { _id: false });

const researchSchema = new mongoose.Schema({
    researchId:       { type: String, required: true, unique: true },
    title:            { type: String, required: true },
    authorId:         { type: String, required: true, index: true }, // 主提交人钱包地址
    type:             { type: String, default: 'unknown' },
    abstract:         { type: String, default: '' },
    keywords:         { type: String, default: '' },
    fileUrl:          { type: String, required: true },
    ipfsHash:         { type: String, default: '', index: true },
    contentHash:      { type: String, required: true },
    transactionHash:  { type: String, required: true, unique: true },
    metadata:         { type: Object, default: {} },
    isAnonymous:      { type: Boolean, default: false },
    fullText:         { type: String, default: '' },      // 提取的全文（用于查重）

    // ── 加密存储 ────────────────────────────────────────────────────
    isEncrypted:      { type: Boolean, default: false },
    encryptionKey:    { type: String, default: '' },

    // ── 团队创作者 ──────────────────────────────────────────────────
    creators:         { type: [creatorSchema], default: [] },

    // ── 可信时间戳 ──────────────────────────────────────────────────
    trustedTimestamp:     { type: String, default: '' },
    trustedTimestampHash: { type: String, default: '' },
    trustedTimestampTime: { type: String, default: '' },
    trustedTimestampSrc:  { type: String, default: '' },

    // ── 版本管理 ─────────────────────────────────────────────────────
    // versionGroup：同一成果所有版本共享此 ID（等于首版 researchId）
    // 首次上传时由 deposit 路由自动将其设为自身的 researchId。
    versionGroup:      { type: String, default: '', index: true },
    version:           { type: Number, default: 1 },   // 版本号，从 1 开始递增
    isLatest:          { type: Boolean, default: true, index: true }, // 当前最新版标记
    previousVersionId: { type: String, default: '' },  // 上一版 researchId（首版为空）
    changeNote:        { type: String, default: '' },  // 版本更新说明

    timestamp:        { type: Date, default: Date.now },
});

module.exports = mongoose.model('Research', researchSchema);
