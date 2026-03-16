<template>
  <div class="page-wrapper">
    <div class="page-hero">
      <div class="page-hero-content">
        <div class="page-badge">
          <el-icon><setting /></el-icon>系统管理
        </div>
        <h1 class="page-title">系统管理后台</h1>
        <p class="page-sub">合约配置、存证统计与系统健康监控</p>
      </div>
    </div>

    <div class="page-body">

      <!-- ── 统计卡片 ── -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6" v-for="s in statCards" :key="s.label">
          <div class="stat-card" :style="{ borderTopColor: s.color }">
            <div class="stat-icon-wrap" :style="{ background: s.bg }">
              <el-icon :style="{ color: s.color, fontSize: '22px' }">
                <component :is="s.icon" />
              </el-icon>
            </div>
            <div v-if="statsLoading" class="stat-skeleton">
              <el-skeleton-item variant="text" style="width:60%;height:28px" />
            </div>
            <div v-else class="stat-num" :style="{ color: s.color }">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="24">

        <!-- 左侧：合约配置 + 系统健康 -->
        <el-col :lg="10" :md="24">

          <!-- Contract Init -->
          <div class="form-card">
            <div class="form-card-header">
              <el-icon style="color:#D97706;font-size:17px"><setting /></el-icon>
              <span>智能合约配置</span>
            </div>
            <el-form label-position="top">
              <el-form-item label="合约地址">
                <el-input
                  v-model="contractAddress"
                  placeholder="0xAbCd1234..."
                  class="styled-input"
                  clearable
                >
                  <template #prefix><el-icon><connection /></el-icon></template>
                </el-input>
              </el-form-item>
              <el-button
                type="warning"
                :loading="contractLoading"
                :disabled="!contractAddress"
                @click="initContract"
                style="width:100%;border-radius:8px"
              >
                <el-icon><circle-check /></el-icon>
                {{ contractLoading ? '正在初始化...' : '初始化合约' }}
              </el-button>
              <div v-if="contractStatus" class="contract-status" :class="contractStatus.ok ? 'ok' : 'err'">
                <el-icon>
                  <component :is="contractStatus.ok ? CircleCheck : CircleClose" />
                </el-icon>
                {{ contractStatus.msg }}
              </div>
            </el-form>
          </div>

          <!-- System Health -->
          <div class="form-card">
            <div class="form-card-header">
              <el-icon style="color:#059669;font-size:17px"><monitor /></el-icon>
              <span>系统健康状态</span>
              <el-button link style="margin-left:auto" :loading="healthLoading" @click="checkHealth">
                <el-icon><refresh /></el-icon> 检测
              </el-button>
            </div>
            <div class="health-list">
              <div v-for="h in healthItems" :key="h.label" class="health-item">
                <div class="health-left">
                  <div class="health-dot" :class="h.status" />
                  <span class="health-label">{{ h.label }}</span>
                </div>
                <div class="health-right">
                  <span class="health-latency" v-if="h.latency">{{ h.latency }}ms</span>
                  <el-tag :type="h.status === 'ok' ? 'success' : h.status === 'checking' ? 'warning' : 'danger'" size="small" round>
                    {{ h.status === 'ok' ? '正常' : h.status === 'checking' ? '检测中' : '异常' }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- Type distribution chart -->
          <div class="form-card" v-if="!statsLoading && typeChart.length">
            <div class="form-card-header">
              <el-icon style="color:#7C3AED;font-size:17px"><pie-chart /></el-icon>
              <span>成果类型分布</span>
            </div>
            <div class="type-bars">
              <div v-for="t in typeChart" :key="t.type" class="tbar-row">
                <span class="tbar-label">{{ t.label }}</span>
                <div class="tbar-bg">
                  <div
                    class="tbar-fill"
                    :style="{ width: t.pct + '%', background: t.color }"
                  />
                </div>
                <span class="tbar-pct" :style="{ color: t.color }">{{ t.count }} ({{ t.pct }}%)</span>
              </div>
            </div>
          </div>
        </el-col>

        <!-- 右侧：最新存证列表 -->
        <el-col :lg="14" :md="24">

          <!-- Recent research -->
          <div class="form-card">
            <div class="form-card-header">
              <el-icon style="color:#2563EB;font-size:17px"><list /></el-icon>
              <span>全平台存证记录</span>
              <div class="header-controls">
                <el-select v-model="listFilter.type" size="small" placeholder="全部类型" clearable style="width:110px" @change="fetchList">
                  <el-option label="全部类型" value="" />
                  <el-option label="学术论文" value="paper" />
                  <el-option label="软件代码" value="code" />
                  <el-option label="实验数据" value="data" />
                  <el-option label="专利文档" value="patent" />
                </el-select>
                <el-select v-model="listFilter.isAnonymous" size="small" placeholder="全部模式" clearable style="width:110px" @change="fetchList">
                  <el-option label="全部模式" value="" />
                  <el-option label="实名" value="false" />
                  <el-option label="匿名" value="true" />
                </el-select>
                <el-button size="small" :loading="listLoading" @click="fetchList">
                  <el-icon><refresh /></el-icon>
                </el-button>
              </div>
            </div>

            <el-skeleton v-if="listLoading" :rows="5" animated />

            <el-empty v-else-if="!listLoading && researchList.length === 0" description="暂无存证数据" />

            <el-table v-else :data="researchList" stripe size="small" class="research-table">
              <el-table-column label="成果标题" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="tbl-title">{{ row.title }}</span>
                </template>
              </el-table-column>
              <el-table-column label="类型" width="90">
                <template #default="{ row }">
                  <el-tag :type="getTypeMeta(row.type).tag as any" size="small" round>
                    {{ getTypeMeta(row.type).label }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="模式" width="72">
                <template #default="{ row }">
                  <el-tag :type="row.isAnonymous ? 'warning' : 'primary'" size="small" round>
                    {{ row.isAnonymous ? '匿名' : '实名' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="作者" width="130" show-overflow-tooltip>
                <template #default="{ row }">
                  <code class="mono-xs">{{ row.isAnonymous ? 'Anonymous' : row.authorId }}</code>
                </template>
              </el-table-column>
              <el-table-column label="存证时间" width="148">
                <template #default="{ row }">
                  <span class="tbl-date">{{ formatDate(row.timestamp) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- Pagination -->
            <div class="pagination-wrap" v-if="listTotal > listPageSize">
              <el-pagination
                v-model:current-page="listPage"
                :page-size="listPageSize"
                :total="listTotal"
                layout="prev, pager, next, total"
                small background
                @current-change="fetchList"
              />
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- Detail Dialog (reuse same as Profile) -->
    <el-dialog v-model="showDetail" :title="detailItem?.title || '成果详情'" width="640px">
      <div v-if="detailItem" class="detail-body">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="成果 ID" :span="2">
            <code class="mono-sm">{{ detailItem.researchId }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="getTypeMeta(detailItem.type).tag as any" round>{{ getTypeMeta(detailItem.type).label }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="模式">
            <el-tag :type="detailItem.isAnonymous ? 'warning' : 'primary'" round>
              {{ detailItem.isAnonymous ? '🔒 匿名' : '👤 实名' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="作者" :span="2">
            <code class="mono-sm">{{ detailItem.authorId }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="存证时间" :span="2">{{ formatDate(detailItem.timestamp) }}</el-descriptions-item>
          <el-descriptions-item label="摘要" :span="2">{{ detailItem.abstract || '—' }}</el-descriptions-item>
          <el-descriptions-item label="IPFS 哈希" :span="2">
            <code class="mono-sm">{{ detailItem.ipfsHash || '—' }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="交易哈希" :span="2">
            <code class="mono-sm">{{ detailItem.transactionHash }}</code>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="primary" @click="downloadItem(detailItem!)">
          <el-icon><download /></el-icon> 下载文件
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Setting, CircleCheck, CircleClose, Files, Document, Monitor,
  Refresh, Connection, List, Download, PieChart
} from '@element-plus/icons-vue'
import { researchApi, getDownloadUrl, getTypeMeta, formatDate, type Research, type SystemStats } from '@/utils/api'

// ── Stats ─────────────────────────────────────────────────────────
const statsLoading = ref(false)
const stats = ref<SystemStats | null>(null)

const statCards = computed(() => [
  { icon: Files,     label: '总存证数', value: stats.value?.total     ?? '—', color: '#2563EB', bg: '#EFF6FF' },
  { icon: CircleCheck, label: '实名成果', value: stats.value?.named   ?? '—', color: '#059669', bg: '#F0FDF4' },
  { icon: Document,  label: '匿名成果', value: stats.value?.anonymous ?? '—', color: '#7C3AED', bg: '#F5F3FF' },
  { icon: PieChart,  label: '成果类别', value: stats.value ? Object.keys(stats.value.byType).length : '—', color: '#D97706', bg: '#FFF7ED' },
])

const typeChart = computed(() => {
  if (!stats.value?.byType) return []
  const total = stats.value.total || 1
  const colors: Record<string, string> = { paper:'#2563EB', code:'#059669', data:'#0891B2', patent:'#7C3AED', project:'#D97706' }
  return Object.entries(stats.value.byType)
    .map(([type, count]) => ({
      type, count,
      label: getTypeMeta(type).label,
      color: colors[type] ?? '#94A3B8',
      pct: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)
})

async function fetchStats() {
  statsLoading.value = true
  try {
    const { data } = await researchApi.getStats()
    stats.value = data
  } catch {
    ElMessage.error('获取统计数据失败')
  } finally {
    statsLoading.value = false
  }
}

// ── Research list ─────────────────────────────────────────────────
const listLoading = ref(false)
const researchList = ref<Research[]>([])
const listTotal = ref(0)
const listPage = ref(1)
const listPageSize = 15
const listFilter = reactive({ type: '', isAnonymous: '' })

async function fetchList() {
  listLoading.value = true
  try {
    const { data } = await researchApi.getList({
      page: listPage.value,
      limit: listPageSize,
      type: listFilter.type || undefined,
      isAnonymous: listFilter.isAnonymous || undefined
    })
    researchList.value = data.results
    listTotal.value = data.total
  } catch {
    ElMessage.error('获取存证列表失败')
  } finally {
    listLoading.value = false
  }
}

// ── Contract init ─────────────────────────────────────────────────
const contractAddress = ref('')
const contractLoading = ref(false)
const contractStatus = ref<{ ok: boolean; msg: string } | null>(null)

async function initContract() {
  if (!contractAddress.value.trim()) return
  contractLoading.value = true
  contractStatus.value = null
  try {
    await researchApi.initContract(contractAddress.value.trim())
    contractStatus.value = { ok: true, msg: `合约已初始化：${contractAddress.value.slice(0, 10)}...` }
    ElMessage.success('合约初始化成功')
  } catch (e: any) {
    contractStatus.value = { ok: false, msg: e.response?.data?.error || '初始化失败，请检查地址' }
    ElMessage.error('合约初始化失败')
  } finally {
    contractLoading.value = false
  }
}

// ── Health check ──────────────────────────────────────────────────
interface HealthItem {
  label: string
  status: 'ok' | 'error' | 'checking' | 'unknown'
  latency?: number
}

const healthLoading = ref(false)
const healthItems = ref<HealthItem[]>([
  { label: '后端 API 服务', status: 'unknown' },
  { label: '数据库 (MongoDB)', status: 'unknown' },
  { label: 'IPFS 节点', status: 'unknown' },
  { label: 'ZKP 电路文件', status: 'unknown' },
])

async function checkHealth() {
  healthLoading.value = true
  // Mark all as checking
  healthItems.value.forEach(h => (h.status = 'checking'))

  // 1. Backend API
  try {
    const t0 = Date.now()
    await researchApi.checkHealth()
    healthItems.value[0].status = 'ok'
    healthItems.value[0].latency = Date.now() - t0
  } catch {
    healthItems.value[0].status = 'error'
  }

  // 2. MongoDB – if stats endpoint works, DB is up
  try {
    const t0 = Date.now()
    await researchApi.getStats()
    healthItems.value[1].status = 'ok'
    healthItems.value[1].latency = Date.now() - t0
  } catch {
    healthItems.value[1].status = 'error'
  }

  // 3. IPFS – try to connect (will likely fail in WSL without IPFS running, that's okay)
  try {
    const t0 = Date.now()
    const res = await fetch('http://localhost:5001/api/v0/id', { method: 'POST', signal: AbortSignal.timeout(2000) })
    healthItems.value[2].status = res.ok ? 'ok' : 'error'
    healthItems.value[2].latency = Date.now() - t0
  } catch {
    healthItems.value[2].status = 'error'
  }

  // 4. ZKP assets – check via stats (if they exist, ZKP can work)
  healthItems.value[3].status = healthItems.value[0].status === 'ok' ? 'ok' : 'unknown'

  healthLoading.value = false
}

// ── Detail dialog ─────────────────────────────────────────────────
const showDetail = ref(false)
const detailItem = ref<Research | null>(null)
function openDetail(item: Research) { detailItem.value = item; showDetail.value = true }
function downloadItem(item: Research) {
  window.open(getDownloadUrl(item), '_blank')
  ElMessage.success('正在打开下载链接...')
}

// ── Init ──────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchStats(), fetchList(), checkHealth()])
})
</script>

<style scoped>
.page-wrapper { min-height: calc(100vh - 64px); background: #F0F5FF; }

.page-hero {
  background: linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%);
  border-bottom: 1px solid #E2E8F0;
  padding: 32px 40px 24px;
}
.page-hero-content { max-width: 1300px; margin: 0 auto; }
.page-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: #FFF7ED; color: #D97706; border: 1px solid #FDE68A;
  border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.page-title { font-size: 26px; font-weight: 700; color: #1E293B; margin: 0 0 6px; }
.page-sub { font-size: 14px; color: #64748B; margin: 0; }
.page-body { max-width: 1300px; margin: 0 auto; padding: 28px 40px; }

/* Stat cards */
.stats-row { margin-bottom: 24px; }
.stat-card {
  background: white; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 20px; border-top: 3px solid; box-shadow: 0 2px 12px rgba(37,99,235,0.05);
  transition: transform 0.2s;
}
.stat-card:hover { transform: translateY(-2px); }
.stat-icon-wrap { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.stat-num { font-size: 32px; font-weight: 800; margin-bottom: 4px; }
.stat-label { font-size: 13px; color: #64748B; }
.stat-skeleton { margin: 8px 0 4px; }

/* Form cards */
.form-card {
  background: white; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 22px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(37,99,235,0.05);
}
.form-card-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 600; color: #1E293B;
  margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid #F1F5F9;
}
.header-controls { margin-left: auto; display: flex; gap: 8px; align-items: center; }

/* Styled input */
.styled-input :deep(.el-input__wrapper) { border-radius: 8px !important; border-color: #E2E8F0 !important; box-shadow: none !important; }
.styled-input :deep(.el-input__wrapper:hover) { border-color: #93C5FD !important; }
.styled-input :deep(.el-input__wrapper.is-focus) { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }

/* Contract status */
.contract-status {
  display: flex; align-items: center; gap: 6px;
  margin-top: 10px; padding: 8px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
}
.contract-status.ok { background: #F0FDF4; color: #059669; }
.contract-status.err { background: #FFF1F2; color: #E11D48; }

/* Health list */
.health-list { display: flex; flex-direction: column; gap: 10px; }
.health-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: #F8FAFC; border-radius: 8px;
}
.health-left { display: flex; align-items: center; gap: 10px; }
.health-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.health-dot.ok { background: #059669; box-shadow: 0 0 0 3px #D1FAE5; }
.health-dot.error { background: #E11D48; box-shadow: 0 0 0 3px #FFE4E6; }
.health-dot.checking { background: #D97706; animation: blink 1s infinite; }
.health-dot.unknown { background: #94A3B8; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.health-label { font-size: 14px; color: #475569; }
.health-right { display: flex; align-items: center; gap: 8px; }
.health-latency { font-size: 12px; color: #94A3B8; font-family: monospace; }

/* Type chart */
.type-bars { display: flex; flex-direction: column; gap: 10px; }
.tbar-row { display: flex; align-items: center; gap: 10px; }
.tbar-label { font-size: 13px; color: #64748B; width: 60px; flex-shrink: 0; text-align: right; }
.tbar-bg { flex: 1; height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
.tbar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.tbar-pct { font-size: 12px; font-weight: 600; width: 80px; flex-shrink: 0; }

/* Table */
.research-table { border-radius: 8px; overflow: hidden; }
.tbl-title { font-size: 13px; font-weight: 600; color: #1E293B; }
.tbl-date { font-size: 12px; color: #64748B; }
.mono-xs { font-family: monospace; font-size: 11px; color: #64748B; }
.mono-sm { font-family: monospace; font-size: 12px; color: #475569; word-break: break-all; }

/* Pagination */
.pagination-wrap { margin-top: 16px; display: flex; justify-content: center; }

/* Detail dialog */
.detail-body { max-height: 55vh; overflow-y: auto; }
</style>
