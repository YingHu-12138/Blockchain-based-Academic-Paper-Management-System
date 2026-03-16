<template>
  <div class="page-wrapper">
    <div class="page-hero">
      <div class="page-hero-content">
        <div class="page-badge" style="background:#F0FDF4;color:#059669;border-color:#BBF7D0">
          <el-icon><circle-check /></el-icon>
          权属验证
        </div>
        <h1 class="page-title">成果权属验证中心</h1>
        <p class="page-sub">通过哈希值或作者地址查询链上存证记录，验证科研成果真实性</p>
      </div>
    </div>

    <div class="page-body">
      <el-row :gutter="24">
        <el-col :lg="16" :md="24">
          <div class="form-card">
            <div class="form-card-header">
              <el-icon class="card-icon" style="color:#059669"><search /></el-icon>
              <span>查询方式</span>
              <el-button link style="margin-left:auto" @click="showHelpDialog=true">
                <el-icon><question-filled /></el-icon> 验证说明
              </el-button>
            </div>

            <el-tabs v-model="activeTab" @tab-click="handleTabChange" class="verify-tabs">

              <!-- ── Tab 1: 哈希查询 ── -->
              <el-tab-pane label="哈希查询" name="hash">
                <div class="tab-hint">
                  <el-icon><info-filled /></el-icon>
                  可输入 IPFS 内容哈希 (Qm...)、区块链交易哈希 (0x...) 或内容 SHA-256 哈希 (0x...)
                </div>
                <el-form :model="hashForm" :rules="hashRules" ref="hashFormRef" label-position="top">
                  <el-form-item label="成果哈希值" prop="hash">
                    <el-input
                      v-model="hashForm.hash"
                      placeholder="QmXoypiz... 或 0x1234...abcd"
                      clearable class="styled-input"
                    >
                      <template #prefix><el-icon><search /></el-icon></template>
                    </el-input>
                  </el-form-item>
                  <div class="form-actions">
                    <el-button type="primary" @click="queryByHash" :loading="loading" class="query-btn">
                      <el-icon><search /></el-icon> 查询
                    </el-button>
                    <el-button @click="resetHashForm">重置</el-button>
                  </div>
                </el-form>
              </el-tab-pane>

              <!-- ── Tab 2: 作者查询 ── -->
              <el-tab-pane label="作者查询" name="author">
                <div class="tab-hint">
                  <el-icon><info-filled /></el-icon>
                  请输入有效的以太坊地址（0x 开头，42位），查询该地址名下所有已存证成果
                </div>
                <el-form :model="authorForm" :rules="authorRules" ref="authorFormRef" label-position="top">
                  <el-form-item label="作者区块链地址" prop="address">
                    <el-input
                      v-model="authorForm.address"
                      placeholder="0xAbCd1234...5678EfGh"
                      clearable class="styled-input"
                    >
                      <template #prefix><el-icon><user /></el-icon></template>
                    </el-input>
                  </el-form-item>
                  <div class="form-actions">
                    <el-button type="primary" @click="queryByAuthor" :loading="loading" class="query-btn">
                      <el-icon><search /></el-icon> 查询
                    </el-button>
                    <el-button @click="resetAuthorForm">重置</el-button>
                  </div>
                </el-form>
              </el-tab-pane>

              <!-- ── Tab 3: 批量验证 ── -->
              <el-tab-pane label="批量验证" name="batch">
                <div class="tab-hint">
                  <el-icon><info-filled /></el-icon>
                  每行输入一个哈希值（IPFS 或交易哈希均可），最多支持 20 个
                </div>
                <el-form :model="batchForm" ref="batchFormRef" label-position="top">
                  <el-form-item label="哈希列表">
                    <el-input
                      v-model="batchForm.hashes"
                      type="textarea" :rows="6"
                      placeholder="QmHash1&#10;0xTxHash2&#10;QmHash3..."
                      class="styled-input"
                    />
                  </el-form-item>
                  <div class="form-actions">
                    <el-button type="primary" @click="batchVerify" :loading="loading" class="query-btn">
                      <el-icon><finished /></el-icon> 批量验证
                    </el-button>
                    <el-button @click="resetBatchForm">重置</el-button>
                  </div>
                </el-form>
              </el-tab-pane>
            </el-tabs>
          </div>

          <!-- ── 单条哈希结果 ── -->
          <div v-if="queryResult && activeTab === 'hash'" class="result-card">
            <div class="result-header">
              <div class="result-status verified">
                <el-icon><circle-check /></el-icon> 链上存证已确认
              </div>
              <div class="result-actions">
                <el-button size="small" type="primary" @click="downloadFile" :loading="downloadLoading">
                  <el-icon><download /></el-icon> 下载原文
                </el-button>
                <el-button size="small" @click="verifyOnChain" :loading="verifyLoading">
                  <el-icon><check /></el-icon> 链上核验
                </el-button>
                <el-button size="small" type="success" @click="generateCertificate" :loading="certificateLoading">
                  <el-icon><document /></el-icon> 生成证书
                </el-button>
              </div>
            </div>
            <el-descriptions :column="2" border class="result-desc">
              <el-descriptions-item label="成果标题" :span="2">
                <strong>{{ queryResult.title }}</strong>
              </el-descriptions-item>
              <el-descriptions-item label="作者">
                <el-tag type="primary" round>{{ queryResult.author }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="成果类型">
                <el-tag :type="getTypeTagType(queryResult.type)" round>{{ getTypeText(queryResult.type) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="确权时间">{{ formatTimestamp(queryResult.timestamp) }}</el-descriptions-item>
              <el-descriptions-item label="是否加密">
                <el-tag :type="queryResult.isEncrypted ? 'warning' : 'info'" round>
                  {{ queryResult.isEncrypted ? '🔒 AES-256 已加密' : '未加密' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="IPFS 哈希" :span="2">
                <div class="hash-row">
                  <code class="hash-code">{{ queryResult.ipfsHash || '—' }}</code>
                  <el-button v-if="queryResult.ipfsHash" link @click="copyToClipboard(queryResult.ipfsHash)">
                    <el-icon><copy-document /></el-icon>
                  </el-button>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="交易哈希" :span="2">
                <div class="hash-row">
                  <code class="hash-code">{{ queryResult.txHash }}</code>
                  <el-button link @click="copyToClipboard(queryResult.txHash)">
                    <el-icon><copy-document /></el-icon>
                  </el-button>
                </div>
              </el-descriptions-item>
              <el-descriptions-item v-if="queryResult.trustedTimestampTime" label="可信时间戳" :span="2">
                <el-tag type="success" size="small">{{ queryResult.trustedTimestampTime }}</el-tag>
                <span class="ts-source">来源：{{ queryResult.trustedTimestampSrc }}</span>
              </el-descriptions-item>
              <!-- Team creators -->
              <el-descriptions-item
                v-if="queryResult.creators && queryResult.creators.length > 1"
                label="创作团队" :span="2"
              >
                <div class="creators-list">
                  <div v-for="(c, i) in queryResult.creators" :key="i" class="creator-chip">
                    <span class="creator-id">{{ c.creatorId || c.name || '—' }}</span>
                    <el-tag size="small" type="info">{{ (c.contributionShare / 100).toFixed(0) }}%</el-tag>
                  </div>
                </div>
              </el-descriptions-item>
              <el-descriptions-item v-if="queryResult.abstract" label="摘要" :span="2">
                <el-text line-clamp="3">{{ queryResult.abstract }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- ── 作者查询结果列表 ── -->
          <div v-if="authorResults.length > 0 && activeTab === 'author'" class="result-card">
            <div class="batch-summary-row">
              <div class="summary-chip total">共 {{ authorTotal }} 条成果</div>
              <div class="summary-chip verified-chip">已存证 {{ authorResults.length }} 条</div>
            </div>
            <el-table :data="authorResults" stripe class="batch-table" @row-click="onAuthorRowClick">
              <el-table-column prop="title" label="成果标题" min-width="160" show-overflow-tooltip />
              <el-table-column label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getTypeTagType(row.type)" size="small" round>{{ getTypeText(row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="确权时间" width="160">
                <template #default="{ row }">{{ formatTimestamp(row.timestamp) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="140" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" link type="primary" @click.stop="viewAuthorDetail(row)">详情</el-button>
                  <el-button size="small" link @click.stop="downloadRecord(row)">下载</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- ── 作者成果详情（点开后显示） ── -->
          <div v-if="selectedAuthorRecord && activeTab === 'author'" class="result-card detail-card">
            <div class="result-header">
              <div class="result-status verified">
                <el-icon><circle-check /></el-icon> 链上存证已确认
              </div>
              <div class="result-actions">
                <el-button size="small" type="primary" @click="downloadRecord(selectedAuthorRecord)" :loading="downloadLoading">
                  <el-icon><download /></el-icon> 下载原文
                </el-button>
                <el-button size="small" type="success" @click="generateCertificateForRecord(selectedAuthorRecord)" :loading="certificateLoading">
                  <el-icon><document /></el-icon> 生成证书
                </el-button>
              </div>
            </div>
            <el-descriptions :column="2" border class="result-desc">
              <el-descriptions-item label="成果标题" :span="2"><strong>{{ selectedAuthorRecord.title }}</strong></el-descriptions-item>
              <el-descriptions-item label="作者"><el-tag type="primary" round>{{ selectedAuthorRecord.author }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="类型"><el-tag :type="getTypeTagType(selectedAuthorRecord.type)" round>{{ getTypeText(selectedAuthorRecord.type) }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="确权时间" :span="2">{{ formatTimestamp(selectedAuthorRecord.timestamp) }}</el-descriptions-item>
              <el-descriptions-item label="交易哈希" :span="2">
                <div class="hash-row">
                  <code class="hash-code">{{ selectedAuthorRecord.txHash }}</code>
                  <el-button link @click="copyToClipboard(selectedAuthorRecord.txHash)"><el-icon><copy-document /></el-icon></el-button>
                </div>
              </el-descriptions-item>
              <el-descriptions-item v-if="selectedAuthorRecord.abstract" label="摘要" :span="2">
                <el-text line-clamp="3">{{ selectedAuthorRecord.abstract }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- ── 批量验证结果 ── -->
          <div v-if="batchResults.length > 0 && activeTab === 'batch'" class="result-card">
            <div class="batch-summary-row">
              <div class="summary-chip total">共 {{ batchTotal }} 条查询</div>
              <div class="summary-chip verified-chip">找到 {{ batchResults.filter(r=>r.exists).length }} 条</div>
              <div class="summary-chip pending-chip">未找到 {{ batchResults.filter(r=>!r.exists).length }} 条</div>
            </div>
            <el-table :data="batchResults" stripe class="batch-table">
              <el-table-column label="哈希值" min-width="120" show-overflow-tooltip>
                <template #default="{ row }"><code class="hash-code-sm">{{ row.query }}</code></template>
              </el-table-column>
              <el-table-column label="标题" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">{{ row.exists ? row.title : '—' }}</template>
              </el-table-column>
              <el-table-column label="类型" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.exists" :type="getTypeTagType(row.type)" size="small" round>{{ getTypeText(row.type) }}</el-tag>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column label="确权时间" width="160">
                <template #default="{ row }">{{ row.exists ? formatTimestamp(row.timestamp) : '—' }}</template>
              </el-table-column>
              <el-table-column label="状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="row.exists ? 'success' : 'danger'" size="small" round>
                    {{ row.exists ? '已找到' : '未找到' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button v-if="row.exists" size="small" link type="primary" @click="viewBatchDetail(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 未找到 -->
          <div v-if="showNoResult" class="empty-card">
            <el-empty description="未找到相关成果记录">
              <el-button type="primary" @click="$router.push('/upload')">去上传</el-button>
            </el-empty>
          </div>
        </el-col>

        <!-- ── 右侧说明栏 ── -->
        <el-col :lg="8" :md="24">
          <div class="sidebar-card">
            <div class="form-card-header">
              <el-icon style="color:#0891B2;font-size:18px"><info-filled /></el-icon>
              <span>验证说明</span>
            </div>
            <div class="help-list">
              <div class="help-block">
                <div class="help-block-title">🔍 哈希查询</div>
                <ul>
                  <li>IPFS 内容哈希：文件在分布式网络中的唯一标识</li>
                  <li>交易哈希（0x...）：区块链上确权交易的唯一标识</li>
                  <li>两种格式均可直接输入查询</li>
                </ul>
              </div>
              <div class="help-block">
                <div class="help-block-title">👤 作者查询</div>
                <ul>
                  <li>输入以太坊地址（0x 开头，42位）</li>
                  <li>查询该地址名下所有已确权成果</li>
                  <li>点击列表行可查看成果详情</li>
                </ul>
              </div>
              <div class="help-block">
                <div class="help-block-title">📊 批量验证</div>
                <ul>
                  <li>每行一个哈希值，最多 20 个</li>
                  <li>IPFS 哈希与交易哈希可混合输入</li>
                  <li>点击"详情"可展开单条记录</li>
                </ul>
              </div>
            </div>
            <el-alert type="info" :closable="false" style="margin-top:16px">
              所有验证结果均来自区块链存证数据，具有不可篡改的法律效力。
            </el-alert>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- Help Dialog -->
    <el-dialog v-model="showHelpDialog" title="权属验证说明" width="600px">
      <div class="help-content">
        <div class="verify-method" v-for="m in helpMethods" :key="m.title">
          <h5>{{ m.icon }} {{ m.title }}</h5>
          <p>{{ m.desc }}</p>
          <ul><li v-for="l in m.items" :key="l">{{ l }}</li></ul>
        </div>
        <el-alert title="验证提示" type="info"
          description="所有验证结果均来自区块链网络，具有不可篡改的特性，可作为法律证据使用。"
          :closable="false" style="margin-top:20px" />
      </div>
      <template #footer>
        <el-button type="primary" @click="showHelpDialog=false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- Batch detail dialog -->
    <el-dialog v-model="showBatchDetail" title="成果详情" width="640px">
      <el-descriptions v-if="batchDetailRecord" :column="1" border>
        <el-descriptions-item label="标题"><strong>{{ batchDetailRecord.title }}</strong></el-descriptions-item>
        <el-descriptions-item label="作者">{{ batchDetailRecord.author }}</el-descriptions-item>
        <el-descriptions-item label="类型"><el-tag :type="getTypeTagType(batchDetailRecord.type)" round>{{ getTypeText(batchDetailRecord.type) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="确权时间">{{ formatTimestamp(batchDetailRecord.timestamp) }}</el-descriptions-item>
        <el-descriptions-item label="交易哈希"><code class="hash-code">{{ batchDetailRecord.txHash }}</code></el-descriptions-item>
        <el-descriptions-item v-if="batchDetailRecord.abstract" label="摘要">{{ batchDetailRecord.abstract }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="downloadRecord(batchDetailRecord!)">下载原文</el-button>
        <el-button type="success" @click="generateCertificateForRecord(batchDetailRecord!)">生成证书</el-button>
        <el-button type="primary" @click="showBatchDetail=false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { isLocalFile, IPFS_GATEWAY } from '@/utils/api'
import {
  QuestionFilled, CopyDocument, Download, Check, Document,
  Search, InfoFilled, CircleCheck, User, Finished
} from '@element-plus/icons-vue'

// ── Types ─────────────────────────────────────────────────────────
interface Creator { creatorId?: string; name?: string; contributionShare: number }
interface ResearchRecord {
  researchId: string
  title: string
  author: string      // mapped from authorId
  type: string
  timestamp: number
  ipfsHash: string
  fileUrl: string
  txHash: string      // mapped from transactionHash
  abstract?: string
  verified: boolean
  exists: boolean
  query?: string      // original query hash (batch only)
  isEncrypted?: boolean
  creators?: Creator[]
  trustedTimestampTime?: string
  trustedTimestampSrc?: string
}

// ── State ─────────────────────────────────────────────────────────
const activeTab         = ref('hash')
const loading           = ref(false)
const downloadLoading   = ref(false)
const verifyLoading     = ref(false)
const certificateLoading = ref(false)
const showHelpDialog    = ref(false)
const showNoResult      = ref(false)
const showBatchDetail   = ref(false)

const hashFormRef   = ref<FormInstance>()
const authorFormRef = ref<FormInstance>()
const hashForm      = reactive({ hash: '' })
const authorForm    = reactive({ address: '' })
const batchForm     = reactive({ hashes: '' })

const hashRules: FormRules = {
  hash: [
    { required: true, message: '请输入哈希值', trigger: 'blur' },
    { min: 10, message: '哈希值长度至少 10 个字符', trigger: 'blur' }
  ]
}
const authorRules: FormRules = {
  address: [
    { required: true, message: '请输入作者地址', trigger: 'blur' },
    { min: 42, max: 42, message: '地址长度必须为 42 位', trigger: 'blur' }
  ]
}

// Result state
const queryResult        = ref<ResearchRecord | null>(null)
const authorResults      = ref<ResearchRecord[]>([])
const authorTotal        = ref(0)
const selectedAuthorRecord = ref<ResearchRecord | null>(null)
const batchResults       = ref<ResearchRecord[]>([])
const batchTotal         = ref(0)
const batchDetailRecord  = ref<ResearchRecord | null>(null)

// ── Mapping helper ─────────────────────────────────────────────────
function mapRecord(data: any, queryHash = ''): ResearchRecord {
  return {
    researchId:          data.researchId || '',
    title:               data.title      || '（无标题）',
    author:              data.isAnonymous ? 'Anonymous' : (data.authorId || '—'),
    type:                data.type       || 'unknown',
    timestamp:           safeTimestamp(data.timestamp),
    ipfsHash:            data.ipfsHash   || '',
    fileUrl:             data.fileUrl    || '',
    txHash:              data.transactionHash || '—',
    abstract:            data.abstract   || '',
    verified:            true,
    exists:              true,
    query:               queryHash,
    isEncrypted:         data.isEncrypted || false,
    creators:            data.creators   || [],
    trustedTimestampTime: data.trustedTimestampTime || '',
    trustedTimestampSrc:  data.trustedTimestampSrc  || ''
  }
}

// ── Queries ───────────────────────────────────────────────────────

// 1. Hash query — fixed: backend returns raw document, no `exists` field
const queryByHash = async () => {
  if (!hashFormRef.value) return
  try {
    await hashFormRef.value.validate()
    loading.value = true
    showNoResult.value = false
    queryResult.value  = null

    const { data } = await axios.get(`/api/research/hash/${encodeURIComponent(hashForm.hash)}`)
    // Backend returns the MongoDB document directly (status 200) or 404
    queryResult.value = mapRecord(data)
    ElMessage.success('成果记录已找到')
  } catch (error: any) {
    if (error.response?.status === 404) {
      showNoResult.value = true
      ElMessage.warning('未找到对应的成果记录')
    } else {
      ElMessage.error(`查询失败：${error.response?.data?.error || error.message}`)
    }
  } finally {
    loading.value = false
  }
}

// 2. Author query — fixed: calls backend REST API (not smart contract)
const queryByAuthor = async () => {
  if (!authorFormRef.value) return
  try {
    await authorFormRef.value.validate()
    loading.value = true
    showNoResult.value = false
    authorResults.value = []
    selectedAuthorRecord.value = null

    const { data } = await axios.get(
      `/api/research/author/${encodeURIComponent(authorForm.address)}`,
      { params: { page: 1, limit: 50 } }
    )

    if (data.results && data.results.length > 0) {
      authorResults.value = data.results.map((r: any) => mapRecord(r))
      authorTotal.value   = data.total || data.results.length
      ElMessage.success(`共找到 ${data.total} 条成果记录`)
    } else {
      showNoResult.value = true
      ElMessage.warning('未找到该作者的成果记录')
    }
  } catch (error: any) {
    ElMessage.error(`查询失败：${error.response?.data?.error || error.message}`)
  } finally {
    loading.value = false
  }
}

// 3. Batch verify — fixed: calls real backend API
const batchVerify = async () => {
  if (!batchForm.hashes.trim()) { ElMessage.warning('请输入要验证的哈希列表'); return }
  loading.value = true
  try {
    const hashes = batchForm.hashes
      .split('\n')
      .map(h => h.trim())
      .filter(h => h.length >= 10)
      .slice(0, 20)

    if (hashes.length === 0) { ElMessage.warning('请输入有效的哈希值（至少 10 个字符）'); return }

    const queries = hashes.map(h => ({ type: 'hash', value: h }))
    const { data } = await axios.post('/api/research/batch-verify', { queries })

    batchTotal.value = data.results.length
    batchResults.value = data.results.map((r: any) => ({
      exists:    r.exists,
      query:     r.query?.value || '',
      ...(r.exists && r.data ? mapRecord(r.data, r.query?.value) : {
        researchId: '', title: '—', author: '—', type: '—',
        timestamp: 0, ipfsHash: '', fileUrl: '', txHash: '—',
        abstract: '', verified: false
      })
    }))

    const found    = batchResults.value.filter(r => r.exists).length
    const notFound = batchResults.value.length - found
    ElMessage.success(`验证完成：找到 ${found} 条，未找到 ${notFound} 条`)
  } catch (error: any) {
    ElMessage.error(`批量验证失败：${error.response?.data?.error || error.message}`)
  } finally {
    loading.value = false
  }
}

// ── Row interactions ───────────────────────────────────────────────
const onAuthorRowClick    = (row: ResearchRecord) => { selectedAuthorRecord.value = row }
const viewAuthorDetail    = (row: ResearchRecord) => { selectedAuthorRecord.value = row }
const viewBatchDetail     = (row: ResearchRecord) => { batchDetailRecord.value = row; showBatchDetail.value = true }

// ── Download — fixed: constructs real URL from ipfsHash / fileUrl ──
function buildDownloadUrl(record: ResearchRecord): string {
  const { ipfsHash, fileUrl } = record
  if (isLocalFile(ipfsHash)) {
    if (fileUrl && fileUrl.startsWith('/uploads/')) return `http://localhost:3000${fileUrl}`
    const filename = ipfsHash?.replace('local_', '') || (fileUrl || '').replace('/uploads/', '')
    return `http://localhost:3000/uploads/${filename}`
  }
  return `${IPFS_GATEWAY}/ipfs/${ipfsHash}`
}

const downloadFile = () => {
  if (!queryResult.value) return
  if (queryResult.value.isEncrypted) {
    ElMessage.warning('该文件已加密存储，需提供加密密钥方可解密下载')
    return
  }
  window.open(buildDownloadUrl(queryResult.value), '_blank')
  ElMessage.success('已在新标签页中打开文件')
}

const downloadRecord = (record: ResearchRecord | null) => {
  if (!record) return
  if (record.isEncrypted) {
    ElMessage.warning('该文件已加密存储，需提供加密密钥方可解密下载')
    return
  }
  window.open(buildDownloadUrl(record), '_blank')
  ElMessage.success('已在新标签页中打开文件')
}

// ── On-chain verify — fixed: re-queries backend and compares txHash ─
const verifyOnChain = async () => {
  if (!queryResult.value) return
  verifyLoading.value = true
  try {
    const hash = queryResult.value.ipfsHash || queryResult.value.txHash
    const { data } = await axios.get(`/api/research/hash/${encodeURIComponent(hash)}`)
    if (data && data.transactionHash === queryResult.value.txHash) {
      ElMessage.success({
        message: `链上验证成功！交易哈希匹配：${data.transactionHash.slice(0, 24)}...`,
        duration: 6000
      })
    } else {
      ElMessage.warning('数据库记录与查询结果存在差异，请联系管理员')
    }
  } catch (error: any) {
    ElMessage.error('链上验证失败：记录不存在或服务异常')
  } finally {
    verifyLoading.value = false
  }
}

// ── Certificate — fixed: generates printable HTML ─────────────────
function printCert(record: ResearchRecord) {
  const certHtml = `<!DOCTYPE html><html lang="zh">
<head><meta charset="utf-8"><title>科研成果确权证书</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"SimSun","宋体",serif;padding:60px;background:#fff;color:#1a1a1a}
  .cert{max-width:760px;margin:0 auto;border:8px double #1e3a8a;padding:50px;position:relative}
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);
    font-size:80px;color:rgba(37,99,235,0.06);white-space:nowrap;pointer-events:none;z-index:0}
  .logo{text-align:center;margin-bottom:24px;font-size:13px;color:#64748b;letter-spacing:2px}
  h1{text-align:center;font-size:28px;color:#1e3a8a;letter-spacing:6px;margin-bottom:8px}
  .subtitle{text-align:center;font-size:14px;color:#64748b;margin-bottom:36px;letter-spacing:2px}
  .divider{border:none;border-top:1px solid #e2e8f0;margin:20px 0}
  table{width:100%;border-collapse:collapse;font-size:14px;line-height:2.2;margin-bottom:24px;z-index:1;position:relative}
  td{padding:4px 0}td:first-child{width:120px;color:#64748b;font-weight:bold}
  .mono{font-family:monospace;font-size:11px;color:#0891b2;word-break:break-all}
  .footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:30px;border-top:1px solid #e2e8f0;padding-top:20px}
  .seal{display:inline-block;border:3px solid #dc2626;border-radius:50%;padding:10px 16px;color:#dc2626;font-size:13px;font-weight:bold;letter-spacing:2px;margin-top:16px}
  @media print{body{padding:0}button{display:none}}
</style></head><body>
<div class="cert">
  <div class="watermark">科研确权</div>
  <div class="logo">高校科研成果确权系统 · 区块链存证平台</div>
  <h1>科研成果确权证书</h1>
  <p class="subtitle">Research Achievement Ownership Certificate</p>
  <hr class="divider">
  <table>
    <tr><td>成果标题</td><td><strong>${escapeHtml(record.title)}</strong></td></tr>
    <tr><td>著作权人</td><td>${escapeHtml(record.author)}</td></tr>
    <tr><td>成果类型</td><td>${escapeHtml(getTypeText(record.type))}</td></tr>
    <tr><td>确权时间</td><td>${formatTimestamp(record.timestamp)}</td></tr>
    ${record.trustedTimestampTime ? `<tr><td>可信时间戳</td><td>${escapeHtml(record.trustedTimestampTime)}（${escapeHtml(record.trustedTimestampSrc || '')}）</td></tr>` : ''}
    <tr><td>区块链交易</td><td class="mono">${escapeHtml(record.txHash)}</td></tr>
    ${record.ipfsHash ? `<tr><td>IPFS 存储</td><td class="mono">${escapeHtml(record.ipfsHash)}</td></tr>` : ''}
    ${record.abstract ? `<tr><td>成果摘要</td><td>${escapeHtml(record.abstract)}</td></tr>` : ''}
  </table>
  <hr class="divider">
  <div class="footer">
    <p>本证书由区块链系统自动生成，证书内容已永久写入区块链，具有法律效力。</p>
    <p style="margin-top:4px">生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}</p>
    <div><span class="seal">区块链认证</span></div>
  </div>
</div>
<script>setTimeout(()=>window.print(),500)<\/script>
</body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(certHtml); w.document.close() }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const generateCertificate = async () => {
  if (!queryResult.value) return
  certificateLoading.value = true
  try { printCert(queryResult.value); ElMessage.success('证书已在新标签页中生成') }
  catch (e) { ElMessage.error('证书生成失败') }
  finally { certificateLoading.value = false }
}

const generateCertificateForRecord = async (record: ResearchRecord) => {
  if (!record) return
  certificateLoading.value = true
  try { printCert(record); ElMessage.success('证书已在新标签页中生成') }
  catch (e) { ElMessage.error('证书生成失败') }
  finally { certificateLoading.value = false }
}

// ── Resets ────────────────────────────────────────────────────────
const handleTabChange = () => {
  queryResult.value          = null
  authorResults.value        = []
  selectedAuthorRecord.value = null
  batchResults.value         = []
  showNoResult.value         = false
}
const resetHashForm   = () => { hashFormRef.value?.resetFields(); queryResult.value = null; showNoResult.value = false }
const resetAuthorForm = () => { authorFormRef.value?.resetFields(); authorResults.value = []; selectedAuthorRecord.value = null; showNoResult.value = false }
const resetBatchForm  = () => { batchForm.hashes = ''; batchResults.value = [] }

// ── Utils ─────────────────────────────────────────────────────────
function safeTimestamp(ts: any): number {
  if (!ts) return Date.now()
  if (typeof ts === 'number') return ts
  if (typeof ts === 'string' && /^\d+$/.test(ts)) return Number(ts)
  return new Date(ts).getTime()
}

const copyToClipboard = (text: string) =>
  navigator.clipboard.writeText(text)
    .then(() => ElMessage.success('已复制到剪贴板'))
    .catch(() => ElMessage.error('复制失败'))

const getTypeText    = (t: string) =>
  ({ paper:'学术论文', code:'代码仓库', code_repo:'代码仓库', data:'实验数据',
     experimental_data:'实验数据', project:'科研项目', project_report:'项目报告',
     patent:'专利文档', design:'设计图纸', design_drawing:'设计图纸' }[t] || t || '未知')

const getTypeTagType = (t: string): any =>
  ({ paper:'primary', code:'success', code_repo:'success', data:'info',
     experimental_data:'info', project:'warning', project_report:'warning',
     patent:'danger', design:'danger', design_drawing:'danger' }[t] || '')

const formatTimestamp = (ts: number) => ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false }) : '—'

const helpMethods = [
  { icon: '🔍', title: '哈希查询', desc: '通过成果的唯一哈希标识进行精确查询：',
    items: ['IPFS 哈希 (Qm...)：文件在分布式存储网络中的唯一标识', '交易哈希 (0x...)：区块链上确权交易的唯一标识'] },
  { icon: '👤', title: '作者查询', desc: '通过作者的区块链地址查询其所有成果：',
    items: ['显示该地址下所有已确权的科研成果', '点击列表行展开成果详情'] },
  { icon: '📊', title: '批量验证', desc: '一次性验证多个成果的权属信息：',
    items: ['每行一个哈希值（IPFS 或交易哈希）', '最多同时验证 20 个', '结果标注"已找到"或"未找到"'] }
]
</script>

<style scoped>
.page-wrapper { min-height: calc(100vh - 64px); background: #F0F5FF; }
.page-hero {
  background: linear-gradient(135deg, #F0FDF4 0%, #EFF6FF 100%);
  border-bottom: 1px solid #E2E8F0; padding: 32px 40px 24px;
}
.page-hero-content { max-width: 1200px; margin: 0 auto; }
.page-badge {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.page-title { font-size: 26px; font-weight: 700; color: #1E293B; margin: 0 0 6px; }
.page-sub   { font-size: 14px; color: #64748B; margin: 0; }
.page-body  { max-width: 1200px; margin: 0 auto; padding: 32px 40px; }

.form-card {
  background: white; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(37,99,235,0.06);
}
.form-card-header {
  display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600;
  color: #1E293B; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #F1F5F9;
}
.card-icon { font-size: 18px; }

.tab-hint {
  display: flex; align-items: center; gap: 8px;
  background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px;
  padding: 10px 14px; font-size: 13px; color: #0369A1; margin-bottom: 16px;
}

.styled-input :deep(.el-input__wrapper),
.styled-input :deep(.el-textarea__inner) { border-radius: 8px !important; border-color: #E2E8F0 !important; box-shadow: none !important; }
.styled-input :deep(.el-input__wrapper:hover),
.styled-input :deep(.el-textarea__inner:hover) { border-color: #93C5FD !important; }
.styled-input :deep(.el-input__wrapper.is-focus),
.styled-input :deep(.el-textarea__inner:focus) { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }

.form-actions { display: flex; gap: 12px; margin-top: 8px; }
.query-btn {
  background: linear-gradient(135deg, #2563EB, #059669) !important;
  border: none !important; color: white !important; font-weight: 600 !important;
  border-radius: 8px !important; padding: 0 24px !important;
}

.result-card {
  background: white; border: 1px solid #BBF7D0; border-radius: 14px;
  padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(5,150,105,0.08);
}
.detail-card { border-color: #BFDBFE; box-shadow: 0 2px 12px rgba(37,99,235,0.08); }

.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.result-status { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
.result-status.verified { color: #059669; }
.result-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.hash-row { display: flex; align-items: center; gap: 8px; }
.hash-code    { font-family: monospace; font-size: 11px; color: #0891B2; word-break: break-all; background: #F0F9FF; padding: 3px 6px; border-radius: 4px; }
.hash-code-sm { font-family: monospace; font-size: 11px; color: #64748B; }

.ts-source { font-size: 12px; color: #64748B; margin-left: 8px; }

.creators-list { display: flex; flex-wrap: wrap; gap: 8px; }
.creator-chip  { display: flex; align-items: center; gap: 5px; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 6px; padding: 3px 8px; }
.creator-id    { font-size: 13px; color: #0369A1; font-weight: 500; }

.batch-summary-row { display: flex; gap: 10px; margin-bottom: 16px; }
.summary-chip    { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
.total           { background: #F1F5F9; color: #475569; }
.verified-chip   { background: #F0FDF4; color: #059669; }
.pending-chip    { background: #FFF1F2; color: #E11D48; }
.batch-table     { border-radius: 8px; overflow: hidden; }

.empty-card {
  background: white; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 40px; text-align: center;
}

.sidebar-card {
  background: white; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 24px; box-shadow: 0 2px 12px rgba(37,99,235,0.06);
}
.help-list       { display: flex; flex-direction: column; gap: 20px; }
.help-block-title { font-weight: 600; color: #1E293B; margin-bottom: 8px; font-size: 14px; }
.help-block ul   { margin: 0; padding-left: 18px; color: #64748B; font-size: 13px; line-height: 1.8; }

.verify-method    { margin-bottom: 20px; }
.verify-method h5 { margin: 0 0 6px; font-size: 15px; color: #1E293B; }
.verify-method p  { margin: 0 0 6px; color: #64748B; font-size: 14px; }
.verify-method ul { margin: 0; padding-left: 18px; color: #64748B; font-size: 13px; }
</style>
