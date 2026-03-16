<template>
  <div class="page-wrapper">
    <!-- Hero -->
    <div class="page-hero">
      <div class="page-hero-content">
        <div class="page-badge">
          <el-icon><user /></el-icon>个人中心
        </div>
        <h1 class="page-title">个人成果管理</h1>
        <p class="page-sub">管理您的链上确权成果，查看存证记录、下载文件与生成证书</p>
      </div>
    </div>

    <div class="page-body">

      <!-- ── 未连接钱包 ── -->
      <div v-if="!isConnected" class="connect-prompt">
        <div class="connect-icon-wrap">
          <el-icon style="font-size:60px;color:#BFDBFE"><wallet /></el-icon>
        </div>
        <h3>请先连接您的钱包</h3>
        <p>连接 MetaMask 后即可查看并管理您的所有实名确权成果</p>
        <el-alert type="info" :closable="false" style="max-width:420px;margin:0 auto 20px">
          匿名（ZKP）上传的成果无法通过钱包地址关联，这是匿名保护的设计原则。
        </el-alert>
      </div>

      <!-- ── 已连接 ── -->
      <template v-else>
        <el-row :gutter="24">

          <!-- 左侧：个人卡片 + 快捷操作 -->
          <el-col :lg="7" :md="24">

            <!-- Profile Card -->
            <div class="profile-card">
              <div class="avatar-ring">
                <div class="avatar">
                  <el-icon style="font-size:40px;color:#7C3AED"><user-filled /></el-icon>
                </div>
                <div class="online-dot" />
              </div>
              <div class="wallet-label">已连接钱包</div>
              <div class="wallet-addr-short">{{ shortAddress }}</div>
              <div class="wallet-full-row">
                <code class="wallet-full">{{ userAddress }}</code>
                <el-tooltip content="复制地址">
                  <el-button link @click="copyText(userAddress)">
                    <el-icon style="font-size:13px"><copy-document /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>

              <el-divider style="margin:16px 0" />

              <!-- Stats -->
              <div class="stats-grid">
                <div class="stat-box" style="--c:#2563EB">
                  <div class="stat-val">{{ researchList.length }}</div>
                  <div class="stat-k">存证成果</div>
                </div>
                <div class="stat-box" style="--c:#059669">
                  <div class="stat-val">{{ namedCount }}</div>
                  <div class="stat-k">实名成果</div>
                </div>
                <div class="stat-box" style="--c:#7C3AED">
                  <div class="stat-val">{{ typeCount }}</div>
                  <div class="stat-k">成果类别</div>
                </div>
                <div class="stat-box" style="--c:#0891B2">
                  <div class="stat-val">{{ ipfsCount }}</div>
                  <div class="stat-k">IPFS 存储</div>
                </div>
              </div>

              <!-- Type distribution bar chart -->
              <div v-if="typeDistribution.length" class="type-chart">
                <div class="type-chart-title">成果类型分布</div>
                <div v-for="t in typeDistribution" :key="t.type" class="type-row">
                  <span class="type-name">{{ t.label }}</span>
                  <div class="type-bar-bg">
                    <div class="type-bar-fill" :style="{ width: t.pct + '%', background: t.color }" />
                  </div>
                  <span class="type-cnt" :style="{ color: t.color }">{{ t.count }}</span>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="form-card">
              <div class="form-card-header">
                <el-icon style="color:#2563EB;font-size:17px"><operation /></el-icon>
                <span>快捷操作</span>
              </div>
              <div class="quick-actions">
                <el-button class="quick-btn" @click="$router.push('/upload')">
                  <el-icon><upload /></el-icon> 上传新成果
                </el-button>
                <el-button class="quick-btn" @click="$router.push('/check')">
                  <el-icon><search /></el-icon> 查重检测
                </el-button>
                <el-button class="quick-btn" @click="$router.push('/verify')">
                  <el-icon><circle-check /></el-icon> 权属验证
                </el-button>
                <el-button class="quick-btn" :loading="loading" @click="fetchResearch">
                  <el-icon><refresh /></el-icon> 刷新列表
                </el-button>
              </div>
            </div>
          </el-col>

          <!-- 右侧：成果列表 -->
          <el-col :lg="17" :md="24">
            <div class="form-card">
              <div class="form-card-header">
                <el-icon style="color:#2563EB;font-size:17px"><files /></el-icon>
                <span>我的成果记录</span>
                <div class="header-controls">
                  <!-- Search -->
                  <el-input
                    v-model="searchQuery"
                    placeholder="搜索标题或摘要..."
                    size="small"
                    clearable
                    style="width:200px"
                  >
                    <template #prefix><el-icon><search /></el-icon></template>
                  </el-input>
                  <!-- Type filter -->
                  <el-select v-model="filterType" size="small" placeholder="全部类型" clearable style="width:110px">
                    <el-option label="全部类型" value="" />
                    <el-option label="学术论文" value="paper" />
                    <el-option label="软件代码" value="code" />
                    <el-option label="实验数据" value="data" />
                    <el-option label="专利文档" value="patent" />
                  </el-select>
                  <!-- Sort -->
                  <el-select v-model="sortOrder" size="small" style="width:110px">
                    <el-option label="最新优先" value="desc" />
                    <el-option label="最早优先" value="asc" />
                  </el-select>
                </div>
              </div>

              <!-- Loading skeleton -->
              <div v-if="loading" class="skeleton-wrap">
                <el-skeleton v-for="i in 3" :key="i" :rows="3" animated style="margin-bottom:16px" />
              </div>

              <!-- Empty: no research at all -->
              <el-empty
                v-else-if="!loading && researchList.length === 0"
                description="暂无存证记录"
                :image-size="100"
              >
                <el-button type="primary" @click="$router.push('/upload')">
                  <el-icon><upload /></el-icon> 上传第一份成果
                </el-button>
              </el-empty>

              <!-- Empty: filter no match -->
              <el-empty
                v-else-if="!loading && filteredList.length === 0"
                description="没有符合条件的成果"
                :image-size="80"
              >
                <el-button @click="clearFilters">清除筛选</el-button>
              </el-empty>

              <!-- Research list -->
              <div v-else class="research-list">
                <div
                  v-for="item in pagedList"
                  :key="item.researchId"
                  class="research-item"
                  @click="openDetail(item)"
                >
                  <!-- Type icon -->
                  <div class="ri-icon" :style="{ background: getTypeMeta(item.type).bg }">
                    <el-icon :style="{ color: getTypeMeta(item.type).color, fontSize: '20px' }">
                      <component :is="getTypeIcon(item.type)" />
                    </el-icon>
                  </div>

                  <!-- Body -->
                  <div class="ri-body">
                    <div class="ri-title-row">
                      <span class="ri-title">{{ item.title }}</span>
                      <div class="ri-tags">
                        <el-tag
                          :type="getTypeMeta(item.type).tag as any"
                          size="small" round
                        >{{ getTypeMeta(item.type).label }}</el-tag>
                        <el-tag v-if="item.version && item.version > 1" type="warning" size="small" round>v{{ item.version }}</el-tag>
                      </div>
                    </div>
                    <div class="ri-meta">
                      <span class="ri-meta-item">
                        <el-icon><clock /></el-icon>
                        {{ formatDate(item.timestamp) }}
                      </span>
                      <span v-if="item.ipfsHash && !isLocalFile(item.ipfsHash)" class="ri-meta-item ipfs">
                        <el-icon><link /></el-icon>
                        IPFS · {{ item.ipfsHash.slice(0, 14) }}…
                      </span>
                      <span v-else class="ri-meta-item local">
                        <el-icon><folder /></el-icon>
                        本地存储
                      </span>
                    </div>
                    <p v-if="item.abstract" class="ri-abstract">{{ item.abstract }}</p>
                  </div>

                  <!-- Actions (stop propagation so clicking buttons doesn't open detail) -->
                  <div class="ri-actions" @click.stop>
                    <el-tooltip content="查看详情">
                      <el-button circle size="small" @click="openDetail(item)">
                        <el-icon><view /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="上传新版本">
                      <el-button circle size="small" type="warning" @click="openUploadVersion(item)">
                        <el-icon><refresh /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="版本历史">
                      <el-button circle size="small" @click="openVersionHistory(item)">
                        <el-icon><clock /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="下载文件">
                      <el-button circle size="small" type="primary" @click="downloadItem(item)">
                        <el-icon><download /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="生成证书">
                      <el-button circle size="small" type="success" @click="openCert(item)">
                        <el-icon><medal /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="复制交易哈希">
                      <el-button circle size="small" @click="copyText(item.transactionHash)">
                        <el-icon><copy-document /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
              </div>

              <!-- Pagination -->
              <div v-if="filteredList.length > pageSize" class="pagination-wrap">
                <el-pagination
                  v-model:current-page="currentPage"
                  :page-size="pageSize"
                  :total="filteredList.length"
                  layout="prev, pager, next, jumper, total"
                  small
                  background
                />
              </div>
            </div>
          </el-col>
        </el-row>
      </template>
    </div>

    <!-- ─────────────── Detail Dialog ─────────────── -->
    <el-dialog v-model="showDetail" :title="detailItem?.title || '成果详情'" width="680px" class="detail-dialog">
      <div v-if="detailItem" class="detail-body">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="成果 ID" :span="2">
            <code class="mono-sm">{{ detailItem.researchId }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="成果类型">
            <el-tag :type="getTypeMeta(detailItem.type).tag as any" round>
              {{ getTypeMeta(detailItem.type).label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="存证模式">
            <el-tag :type="detailItem.isAnonymous ? 'warning' : 'primary'" round>
              {{ detailItem.isAnonymous ? '🔒 匿名 (ZKP)' : '👤 实名' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="作者标识" :span="2">
            <code class="mono-sm">{{ detailItem.authorId }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="存证时间" :span="2">{{ formatDate(detailItem.timestamp) }}</el-descriptions-item>
          <el-descriptions-item label="摘要" :span="2">{{ detailItem.abstract || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关键词" :span="2">{{ detailItem.keywords || '—' }}</el-descriptions-item>
          <el-descriptions-item label="IPFS 哈希" :span="2">
            <div class="hash-row">
              <code class="mono-sm">{{ detailItem.ipfsHash || '—' }}</code>
              <el-button v-if="detailItem.ipfsHash" link @click="copyText(detailItem.ipfsHash)">
                <el-icon><copy-document /></el-icon>
              </el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="交易哈希" :span="2">
            <div class="hash-row">
              <code class="mono-sm">{{ detailItem.transactionHash }}</code>
              <el-button link @click="copyText(detailItem.transactionHash)">
                <el-icon><copy-document /></el-icon>
              </el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="内容 SHA-256" :span="2">
            <code class="mono-sm">{{ detailItem.contentHash || '—' }}</code>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailItem.version" label="当前版本" :span="1">
            <el-tag type="warning" size="small">v{{ detailItem.version }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailItem.versionGroup" label="版本组 ID" :span="1">
            <code class="mono-sm">{{ detailItem.versionGroup }}</code>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailItem.changeNote" label="版本说明" :span="2">
            {{ detailItem.changeNote }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="warning" @click="openUploadVersion(detailItem!); showDetail = false">
          <el-icon><refresh /></el-icon> 上传新版本
        </el-button>
        <el-button @click="openVersionHistory(detailItem!); showDetail = false">
          <el-icon><clock /></el-icon> 版本历史
        </el-button>
        <el-button type="primary" @click="downloadItem(detailItem!)">
          <el-icon><download /></el-icon> 下载文件
        </el-button>
        <el-button type="success" @click="openCert(detailItem!)">
          <el-icon><medal /></el-icon> 生成证书
        </el-button>
      </template>
    </el-dialog>

    <!-- ─────────────── Upload New Version Dialog ─────────────── -->
    <el-dialog v-model="showUploadVersion" title="上传新版本" width="540px">
      <div v-if="uploadVersionTarget" class="uv-info">
        <el-alert type="info" :closable="false" style="margin-bottom:16px">
          正在为「<strong>{{ uploadVersionTarget.title }}</strong>」上传新版本。
          系统会保留所有历史版本，旧版本将标记为非最新。
        </el-alert>
      </div>
      <el-form label-width="80px" style="margin-top:8px">
        <el-form-item label="新文件">
          <el-upload
            action="#"
            :auto-upload="false"
            :limit="1"
            :on-change="onVersionFileChange"
            :on-remove="() => { versionFile = null }"
            accept=".pdf,.doc,.docx,.pptx,.xlsx,.zip,.txt"
          >
            <el-button type="primary" size="small">选择文件</el-button>
            <template #tip>
              <div style="font-size:12px;color:#94A3B8;margin-top:4px">
                支持 PDF · docx · pptx · xlsx · TXT · ZIP
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="版本说明">
          <el-input
            v-model="versionChangeNote"
            type="textarea"
            :rows="3"
            placeholder="描述本次更新的内容（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUploadVersion = false">取消</el-button>
        <el-button type="primary" :loading="uploadingVersion" @click="submitNewVersion">
          <el-icon><upload /></el-icon> 提交新版本
        </el-button>
      </template>
    </el-dialog>

    <!-- ─────────────── Version History Dialog ─────────────── -->
    <el-dialog v-model="showVersionHistory" title="版本历史记录" width="700px">
      <div v-if="versionHistoryLoading" style="text-align:center;padding:40px">
        <el-icon class="is-loading" style="font-size:32px;color:#2563EB"><refresh /></el-icon>
      </div>
      <div v-else-if="versionHistoryList.length === 0" style="text-align:center;padding:40px;color:#94A3B8">
        暂无版本记录
      </div>
      <div v-else class="version-timeline">
        <div
          v-for="v in versionHistoryList"
          :key="v.researchId"
          class="vt-item"
          :class="{ 'vt-latest': v.isLatest }"
        >
          <div class="vt-badge">v{{ v.version }}</div>
          <div class="vt-body">
            <div class="vt-header-row">
              <span class="vt-title">{{ v.title }}</span>
              <el-tag v-if="v.isLatest" type="success" size="small" round>当前版本</el-tag>
              <el-tag v-else type="info" size="small" round>历史版本</el-tag>
            </div>
            <div class="vt-meta">
              <span><el-icon><clock /></el-icon> {{ formatDate(v.timestamp) }}</span>
              <span v-if="v.changeNote" style="margin-left:16px;color:#475569">📝 {{ v.changeNote }}</span>
            </div>
            <div class="vt-hashes">
              <span>内容哈希：<code>{{ v.contentHash?.slice(0, 20) }}…</code></span>
              <span style="margin-left:12px">交易哈希：<code>{{ v.transactionHash?.slice(0, 16) }}…</code></span>
            </div>
            <div class="vt-actions">
              <el-button size="small" @click="downloadItem(v)">
                <el-icon><download /></el-icon> 下载
              </el-button>
              <el-button size="small" @click="copyText(v.contentHash)">复制内容哈希</el-button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showVersionHistory = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ─────────────── Certificate Dialog ─────────────── -->
    <el-dialog v-model="showCert" title="确权证书预览" width="620px" class="cert-dialog">
      <div class="certificate" ref="certRef" v-if="certItem">
        <div class="cert-watermark">BLOCKCHAIN</div>
        <div class="cert-header">
          <div class="cert-logo-row">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#cg)"/>
              <path d="M8 14h3l2-4 2 8 2-6 2 2h3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stop-color="#2563EB"/>
                  <stop offset="100%" stop-color="#059669"/>
                </linearGradient>
              </defs>
            </svg>
            <div>
              <div class="cert-org">高校科研成果确权系统</div>
              <div class="cert-org-en">Research Ownership Registry · Blockchain Secured</div>
            </div>
          </div>
          <div class="cert-title-main">科 研 成 果 确 权 证 书</div>
          <div class="cert-title-en">Certificate of Research Ownership</div>
          <div class="cert-sn">证书编号 / SN: {{ certItem.researchId }}</div>
        </div>

        <div class="cert-body">
          <div class="cert-field">
            <span class="cf-label">成果名称</span>
            <span class="cf-value cert-highlight">{{ certItem.title }}</span>
          </div>
          <div class="cert-field">
            <span class="cf-label">成果类型</span>
            <span class="cf-value">{{ getTypeMeta(certItem.type).label }}</span>
          </div>
          <div class="cert-field">
            <span class="cf-label">作者标识</span>
            <span class="cf-value cf-mono">
              {{ certItem.isAnonymous ? 'Anonymous Author (ZKP Verified)' : certItem.authorId }}
            </span>
          </div>
          <div class="cert-field">
            <span class="cf-label">存证时间</span>
            <span class="cf-value">{{ formatDate(certItem.timestamp) }}</span>
          </div>
          <div class="cert-field">
            <span class="cf-label">区块链凭证</span>
            <span class="cf-value cf-mono cf-small">{{ certItem.transactionHash }}</span>
          </div>
          <div class="cert-field" v-if="!isLocalFile(certItem.ipfsHash)">
            <span class="cf-label">IPFS 存储</span>
            <span class="cf-value cf-mono cf-small">{{ certItem.ipfsHash }}</span>
          </div>
          <div class="cert-field" v-if="certItem.abstract">
            <span class="cf-label">成果摘要</span>
            <span class="cf-value cf-abstract">{{ certItem.abstract }}</span>
          </div>
        </div>

        <div class="cert-footer">
          <div class="cert-seal">
            <div class="seal-outer">
              <div class="seal-inner">
                <div class="seal-text">区块链</div>
                <div class="seal-text">存 证</div>
              </div>
            </div>
          </div>
          <div class="cert-footnote">
            <p>本证书由区块链智能合约自动生成，链上数据不可篡改，具有法律效力</p>
            <p>Issued by Blockchain Smart Contract · Cryptographically Tamper-proof</p>
            <p class="cert-issued-at">签发时间: {{ new Date().toLocaleString('zh-CN') }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showCert = false">关闭</el-button>
        <el-button type="primary" @click="printCert">
          <el-icon><printer /></el-icon> 打印 / 保存 PDF
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  User, UserFilled, Upload, Search, CircleCheck, Refresh, Files,
  CopyDocument, Download, View, Clock, Link, Folder, Operation,
  Medal, Printer, Wallet
} from '@element-plus/icons-vue'
import { useBlockchainStore } from '@/stores/blockchain'
import { researchApi, getDownloadUrl, isLocalFile, getTypeMeta, formatDate, type Research } from '@/utils/api'
import type { UploadFile } from 'element-plus'

const store = useBlockchainStore()
const $router = useRouter()

const isConnected = computed(() => store.isConnected)
const userAddress = computed(() => store.userAddress)
const shortAddress = computed(() => {
  const a = userAddress.value
  return a ? `${a.slice(0, 6)}···${a.slice(-4)}` : ''
})

// ── Data ──────────────────────────────────────────────────────────
const loading = ref(false)
const researchList = ref<Research[]>([])

// ── Filters & sort ────────────────────────────────────────────────
const searchQuery = ref('')
const filterType = ref('')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const pageSize = 8

const filteredList = computed(() => {
  let list = [...researchList.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.abstract?.toLowerCase().includes(q) ||
      r.keywords?.toLowerCase().includes(q)
    )
  }
  if (filterType.value) {
    list = list.filter(r => r.type === filterType.value)
  }
  list.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime()
    const tb = new Date(b.timestamp).getTime()
    return sortOrder.value === 'desc' ? tb - ta : ta - tb
  })
  return list
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredList.value.slice(start, start + pageSize)
})

// Reset page on filter change
watch([searchQuery, filterType, sortOrder], () => { currentPage.value = 1 })

// ── Computed stats ────────────────────────────────────────────────
const namedCount = computed(() => researchList.value.filter(r => !r.isAnonymous).length)
const typeCount = computed(() => new Set(researchList.value.map(r => r.type)).size)
const ipfsCount = computed(() => researchList.value.filter(r => !isLocalFile(r.ipfsHash)).length)

const typeDistribution = computed(() => {
  const total = researchList.value.length
  if (!total) return []
  const counts: Record<string, number> = {}
  for (const r of researchList.value) counts[r.type] = (counts[r.type] || 0) + 1
  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      count,
      label: getTypeMeta(type).label,
      color: getTypeMeta(type).color,
      pct: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)
})

// ── Fetch ─────────────────────────────────────────────────────────
async function fetchResearch() {
  if (!userAddress.value) return
  loading.value = true
  try {
    const { data } = await researchApi.getByAuthor(userAddress.value, 1, 200)
    researchList.value = data.results
    if (data.results.length === 0) {
      ElMessage.info('暂无实名存证记录。匿名上传的成果无法通过钱包地址关联。')
    }
  } catch {
    ElMessage.error('获取成果列表失败，请确认后端服务正常运行')
  } finally {
    loading.value = false
  }
}

// Auto-fetch when wallet connects
watch(isConnected, (v) => { if (v) fetchResearch() })
onMounted(() => { if (isConnected.value) fetchResearch() })

// ── Type icon ─────────────────────────────────────────────────────
import { Document, DataLine, EditPen, Ticket } from '@element-plus/icons-vue'
const iconMap: Record<string, any> = {
  paper: Document, data: DataLine, code: EditPen, patent: Ticket, project: Files
}
function getTypeIcon(type: string) { return iconMap[type] ?? Document }

// ── Actions ───────────────────────────────────────────────────────
function clearFilters() {
  searchQuery.value = ''
  filterType.value = ''
  sortOrder.value = 'desc'
  currentPage.value = 1
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
    .then(() => ElMessage.success('已复制到剪贴板'))
    .catch(() => ElMessage.error('复制失败'))
}

function downloadItem(item: Research) {
  const url = getDownloadUrl(item)
  window.open(url, '_blank')
  ElMessage.success('正在打开下载链接...')
}

// ── Detail dialog ─────────────────────────────────────────────────
const showDetail = ref(false)
const detailItem = ref<Research | null>(null)
function openDetail(item: Research) {
  detailItem.value = item
  showDetail.value = true
}

// ── Upload new version dialog ──────────────────────────────────────
const showUploadVersion   = ref(false)
const uploadVersionTarget = ref<Research | null>(null)
const versionFile         = ref<File | null>(null)
const versionChangeNote   = ref('')
const uploadingVersion    = ref(false)

function openUploadVersion(item: Research) {
  uploadVersionTarget.value = item
  versionFile.value         = null
  versionChangeNote.value   = ''
  showUploadVersion.value   = true
}

function onVersionFileChange(file: UploadFile) {
  versionFile.value = file.raw ?? null
}

async function submitNewVersion() {
  if (!versionFile.value)         { ElMessage.warning('请先选择文件'); return }
  if (!uploadVersionTarget.value) return
  const target = uploadVersionTarget.value
  if (!target.versionGroup)       { ElMessage.error('该成果没有 versionGroup，无法上传新版本'); return }

  uploadingVersion.value = true
  try {
    const fd = new FormData()
    fd.append('file',           versionFile.value)
    fd.append('authorId',       userAddress.value)
    fd.append('versionGroupId', target.versionGroup)
    fd.append('changeNote',     versionChangeNote.value)
    fd.append('title',          target.title)
    fd.append('type',           target.type)
    fd.append('abstract',       target.abstract || '')
    fd.append('keywords',       target.keywords || '')

    const { data } = await researchApi.uploadNewVersion(fd)
    ElMessage.success(`新版本 v${data.version} 上传成功！`)
    showUploadVersion.value = false
    await fetchResearch()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.error || '上传失败，请重试')
  } finally {
    uploadingVersion.value = false
  }
}

// ── Version history dialog ─────────────────────────────────────────
const showVersionHistory   = ref(false)
const versionHistoryLoading = ref(false)
const versionHistoryList   = ref<Research[]>([])

async function openVersionHistory(item: Research) {
  if (!item.versionGroup) { ElMessage.warning('该成果暂无版本记录'); return }
  showVersionHistory.value   = true
  versionHistoryLoading.value = true
  versionHistoryList.value   = []
  try {
    const { data } = await researchApi.getVersions(item.versionGroup)
    versionHistoryList.value = data.versions.slice().reverse() // latest first
  } catch {
    ElMessage.error('版本历史加载失败')
  } finally {
    versionHistoryLoading.value = false
  }
}

// ── Certificate dialog ────────────────────────────────────────────
const showCert = ref(false)
const certItem = ref<Research | null>(null)
const certRef = ref<HTMLElement | null>(null)

function openCert(item: Research) {
  certItem.value = item
  showCert.value = true
}

function printCert() {
  const el = certRef.value
  if (!el) return
  const html = el.outerHTML
  const win = window.open('', '_blank', 'width=700,height=900')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>确权证书 - ${certItem.value?.title}</title>
      <style>
        @page { margin: 15mm; }
        body { margin: 0; font-family: 'PingFang SC','Microsoft YaHei',Arial,sans-serif; }
        .certificate {
          border: 3px solid #1D4ED8; border-radius: 12px; padding: 40px;
          max-width: 620px; margin: 0 auto; position: relative; overflow: hidden;
        }
        .cert-watermark {
          position: absolute; font-size: 100px; font-weight: 900; color: rgba(37,99,235,0.04);
          top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg);
          pointer-events: none; user-select: none; white-space: nowrap;
        }
        .cert-header { text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #E2E8F0; }
        .cert-logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
        .cert-org { font-size: 16px; font-weight: 700; color: #1E293B; }
        .cert-org-en { font-size: 11px; color: #94A3B8; }
        .cert-title-main { font-size: 28px; font-weight: 800; color: #1E293B; letter-spacing: 8px; margin: 8px 0 4px; }
        .cert-title-en { font-size: 13px; color: #64748B; margin-bottom: 8px; }
        .cert-sn { font-size: 12px; color: #94A3B8; font-family: monospace; }
        .cert-body { margin: 20px 0; }
        .cert-field { display: flex; margin-bottom: 14px; align-items: flex-start; }
        .cf-label { width: 90px; flex-shrink: 0; font-size: 13px; color: #64748B; font-weight: 600; padding-top: 2px; }
        .cf-value { flex: 1; font-size: 14px; color: #1E293B; }
        .cert-highlight { font-size: 17px; font-weight: 700; color: #1D4ED8; }
        .cf-mono { font-family: monospace; font-size: 12px; word-break: break-all; color: #475569; }
        .cf-small { font-size: 11px; }
        .cf-abstract { font-size: 13px; color: #64748B; line-height: 1.6; }
        .cert-footer { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 28px; padding-top: 20px; border-top: 2px solid #E2E8F0; }
        .seal-outer { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #2563EB; display: flex; align-items: center; justify-content: center; }
        .seal-inner { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #2563EB; display: flex; align-items: center; justify-content: center; flex-direction: column; }
        .seal-text { font-size: 11px; font-weight: 700; color: #2563EB; line-height: 1.4; }
        .cert-footnote { text-align: right; font-size: 12px; color: #94A3B8; line-height: 1.8; }
        .cert-issued-at { color: #64748B; font-weight: 600; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}
</script>

<style scoped>
.page-wrapper { min-height: calc(100vh - 64px); background: #F0F5FF; }

.page-hero {
  background: linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%);
  border-bottom: 1px solid #E2E8F0;
  padding: 32px 40px 24px;
}
.page-hero-content { max-width: 1200px; margin: 0 auto; }
.page-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE;
  border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.page-title { font-size: 26px; font-weight: 700; color: #1E293B; margin: 0 0 6px; }
.page-sub { font-size: 14px; color: #64748B; margin: 0; }
.page-body { max-width: 1200px; margin: 0 auto; padding: 32px 40px; }

/* Connect prompt */
.connect-prompt {
  text-align: center; padding: 80px 20px;
  background: white; border-radius: 14px; border: 1px solid #E2E8F0;
}
.connect-icon-wrap { margin-bottom: 24px; }
.connect-prompt h3 { font-size: 20px; font-weight: 700; color: #1E293B; margin: 0 0 8px; }
.connect-prompt p { color: #64748B; margin: 0 0 20px; }

/* Cards */
.profile-card {
  background: white; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 28px 20px; text-align: center; margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(37,99,235,0.06);
}
.form-card {
  background: white; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 24px; margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(37,99,235,0.06);
}
.form-card-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 600; color: #1E293B;
  margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #F1F5F9;
}
.header-controls { margin-left: auto; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Profile card internals */
.avatar-ring { position: relative; display: inline-block; margin-bottom: 16px; }
.avatar {
  width: 84px; height: 84px; border-radius: 50%;
  background: linear-gradient(135deg, #F5F3FF, #EFF6FF);
  display: flex; align-items: center; justify-content: center;
  border: 3px solid #E2E8F0; margin: 0 auto;
}
.online-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: #059669; border: 2px solid white;
  position: absolute; bottom: 4px; right: 4px;
}
.wallet-label { font-size: 12px; color: #94A3B8; margin-bottom: 2px; }
.wallet-addr-short { font-size: 15px; font-weight: 700; color: #1E293B; margin-bottom: 8px; font-family: monospace; }
.wallet-full-row { display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 0; }
.wallet-full { font-size: 11px; font-family: monospace; color: #64748B; word-break: break-all; background: #F8FAFC; padding: 6px 10px; border-radius: 6px; }

/* Stats grid */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.stat-box { background: #F8FAFC; border-radius: 10px; padding: 12px; text-align: center; }
.stat-val { font-size: 22px; font-weight: 800; color: var(--c); margin-bottom: 2px; }
.stat-k { font-size: 11px; color: #94A3B8; }

/* Type chart */
.type-chart { text-align: left; margin-top: 16px; }
.type-chart-title { font-size: 12px; color: #94A3B8; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.type-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.type-name { font-size: 12px; color: #64748B; width: 52px; flex-shrink: 0; text-align: right; }
.type-bar-bg { flex: 1; height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
.type-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.type-cnt { font-size: 12px; font-weight: 700; width: 20px; text-align: right; flex-shrink: 0; }

/* Quick actions */
.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.quick-btn {
  width: 100%; justify-content: flex-start;
  padding: 0 12px; height: 36px; border-radius: 8px !important;
  border-color: #E2E8F0 !important; color: #475569 !important;
  font-size: 13px !important;
}
.quick-btn:hover { border-color: #2563EB !important; color: #2563EB !important; background: #EFF6FF !important; }

/* Skeleton */
.skeleton-wrap { padding: 8px 0; }

/* Research list */
.research-list { display: flex; flex-direction: column; gap: 0; }
.research-item {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 16px 12px; border-radius: 10px;
  cursor: pointer; transition: background 0.15s;
  border-bottom: 1px solid #F1F5F9;
}
.research-item:last-child { border-bottom: none; }
.research-item:hover { background: #F8FAFF; }

.ri-icon {
  width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; margin-top: 2px;
}
.ri-body { flex: 1; min-width: 0; }
.ri-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.ri-title { font-size: 15px; font-weight: 600; color: #1E293B; }
.ri-tags { display: flex; gap: 4px; flex-shrink: 0; }
.ri-meta { display: flex; gap: 16px; margin-bottom: 4px; flex-wrap: wrap; }
.ri-meta-item { font-size: 12px; color: #94A3B8; display: flex; align-items: center; gap: 4px; }
.ri-meta-item.ipfs { color: #0891B2; }
.ri-meta-item.local { color: #D97706; }
.ri-abstract { font-size: 13px; color: #64748B; line-height: 1.5; margin: 4px 0 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ri-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }

/* Pagination */
.pagination-wrap { margin-top: 20px; display: flex; justify-content: center; }

/* Detail dialog */
.detail-body { max-height: 60vh; overflow-y: auto; }
.hash-row { display: flex; align-items: center; gap: 8px; }
.mono-sm { font-family: monospace; font-size: 12px; color: #475569; word-break: break-all; }

/* ── Version timeline ────────────────────────────────────────── */
.version-timeline { display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding: 4px; }
.vt-item {
  display: flex; gap: 14px; align-items: flex-start;
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px;
}
.vt-item.vt-latest { background: #F0FDF4; border-color: #BBF7D0; }
.vt-badge {
  width: 36px; height: 36px; border-radius: 50%; background: #2563EB; color: white;
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.vt-latest .vt-badge { background: #059669; }
.vt-body { flex: 1; min-width: 0; }
.vt-header-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.vt-title { font-size: 14px; font-weight: 600; color: #1E293B; }
.vt-meta { font-size: 12px; color: #94A3B8; display: flex; align-items: center; margin-bottom: 6px; }
.vt-hashes { font-size: 11px; color: #94A3B8; margin-bottom: 8px; }
.vt-hashes code { font-family: monospace; color: #475569; }
.vt-actions { display: flex; gap: 8px; }

/* ── Certificate ─────────────────────────────────────────────── */
.certificate {
  border: 3px solid #1D4ED8; border-radius: 12px; padding: 36px;
  position: relative; overflow: hidden;
  background: linear-gradient(180deg, #FAFCFF 0%, #F8FAFF 100%);
}
.cert-watermark {
  position: absolute; font-size: 100px; font-weight: 900;
  color: rgba(37,99,235,0.04); top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  pointer-events: none; user-select: none; white-space: nowrap;
}
.cert-header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #E2E8F0; margin-bottom: 24px; }
.cert-logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
.cert-org { font-size: 15px; font-weight: 700; color: #1E293B; }
.cert-org-en { font-size: 11px; color: #94A3B8; }
.cert-title-main { font-size: 26px; font-weight: 800; color: #1E293B; letter-spacing: 8px; margin: 8px 0 4px; }
.cert-title-en { font-size: 12px; color: #64748B; margin-bottom: 8px; }
.cert-sn { font-size: 11px; color: #94A3B8; font-family: monospace; }

.cert-body { margin-bottom: 24px; }
.cert-field { display: flex; margin-bottom: 12px; align-items: flex-start; }
.cf-label { width: 82px; flex-shrink: 0; font-size: 13px; color: #64748B; font-weight: 600; padding-top: 2px; }
.cf-value { flex: 1; font-size: 14px; color: #1E293B; line-height: 1.5; }
.cert-highlight { font-size: 17px; font-weight: 700; color: #1D4ED8; }
.cf-mono { font-family: monospace; font-size: 12px; word-break: break-all; color: #475569; }
.cf-small { font-size: 11px; }
.cf-abstract { font-size: 13px; color: #64748B; line-height: 1.6; }

.cert-footer { display: flex; align-items: flex-end; justify-content: space-between; padding-top: 20px; border-top: 2px solid #E2E8F0; }
.seal-outer { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #2563EB; display: flex; align-items: center; justify-content: center; }
.seal-inner { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #2563EB; display: flex; align-items: center; justify-content: center; flex-direction: column; }
.seal-text { font-size: 11px; font-weight: 700; color: #2563EB; line-height: 1.5; text-align: center; }
.cert-footnote { text-align: right; font-size: 11px; color: #94A3B8; line-height: 1.8; }
.cert-issued-at { color: #64748B; font-weight: 600; }
</style>
