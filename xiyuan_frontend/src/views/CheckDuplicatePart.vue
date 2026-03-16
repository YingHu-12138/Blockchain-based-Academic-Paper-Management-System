<template>
  <div class="page-wrapper">
    <div class="page-hero">
      <div class="page-hero-content">
        <div class="page-badge" style="background:#F0F9FF;color:#0891B2;border-color:#BAE6FD">
          <el-icon><search /></el-icon>
          查重检测
        </div>
        <h1 class="page-title">成果查重检测</h1>
        <p class="page-sub">
          粗筛层：SimHash + 分段索引（papers.db {{ dbStats ? dbStats.count + ' 篇' : '' }}）&nbsp;·&nbsp;
          细排层：TF-IDF + 余弦相似度&nbsp;·&nbsp;
          语义层：BERT 全文深度查重
        </p>
      </div>
    </div>

    <div class="page-body">
      <!-- DB status banner -->
      <div v-if="dbStats" class="db-banner" :class="dbStats.exists ? 'db-ok' : 'db-missing'">
        <el-icon><data-board /></el-icon>
        <span v-if="dbStats.exists">
          papers.db 已连接 &nbsp;|&nbsp; 共 <b>{{ dbStats.count }}</b> 篇论文
          &nbsp;·&nbsp; SimHash 完整 <b>{{ dbStats.withSimhash }}</b> 篇
          <span v-if="dbStats.withSimhash < dbStats.count" class="db-warn">
            &nbsp;⚠ 有 {{ dbStats.count - dbStats.withSimhash }} 篇未生成 SimHash，运行
            <code>node scripts/buildSimhash.js</code> 补全
          </span>
        </span>
        <span v-else>
          papers.db 未找到（{{ dbStats.path }}），SimHash 查重将跳过。
          请将数据库文件放置到 <code>xiyuan_backend/papers.db</code>。
        </span>
      </div>

      <div class="form-card">
        <div class="form-card-header">
          <el-icon class="card-icon" style="color:#0891B2"><search /></el-icon>
          <span>分层多维查重引擎</span>
          <el-tag type="info" style="margin-left:auto">三层查重 + 证据链</el-tag>
        </div>

        <el-tabs v-model="activeTab" class="check-tabs">

          <!-- ── Tab 1：哈希精确查重 ── -->
          <el-tab-pane label="文件哈希查重" name="hash">
            <div class="tab-desc">
              上传成果文件，系统将计算其 <b>SHA-256</b> 哈希值并与链上所有已存证记录进行精确比对，
              同时计算文件的 <b>SimHash 分段指纹</b>并在 papers.db 中检索近似匹配。
            </div>

            <el-upload
              class="hash-upload" drag :auto-upload="false" :limit="1"
              :on-change="handleHashFileChange" :on-remove="handleHashFileRemove"
              :file-list="hashFileList"
            >
              <div class="upload-inner">
                <div class="upload-icon-wrap">
                  <el-icon class="upload-icon"><upload-filled /></el-icon>
                </div>
                <div class="upload-text">拖拽文件至此，或 <em>点击上传</em></div>
                <div class="upload-tip">支持 PDF · Word（docx）· PowerPoint（pptx）· Excel（xlsx）· TXT · 代码等格式</div>
              </div>
            </el-upload>

            <div class="action-row">
              <el-button
                type="primary" size="large"
                :loading="hashLoading" :disabled="!hashFile"
                @click="runHashCheck" class="check-btn"
              >
                {{ hashLoading ? '正在检测...' : '开始哈希查重' }}
              </el-button>
            </div>

            <!-- SHA-256 结果 -->
            <div v-if="hashResult" class="result-section">
              <el-divider>SHA-256 精确匹配结果</el-divider>
              <el-alert
                :title="hashResult.found ? '检测到完全相同的文件！' : '未发现重复文件'"
                :type="hashResult.found ? 'error' : 'success'"
                :closable="false" show-icon class="result-alert"
              >
                <template v-if="hashResult.found" #default>
                  <p>该文件的 SHA-256 哈希已存在于系统中，属于重复提交。</p>
                </template>
              </el-alert>
              <el-descriptions :column="1" border class="hash-desc">
                <el-descriptions-item label="SHA-256 哈希值">
                  <el-text class="hash-value" type="info">{{ hashResult.sha256 }}</el-text>
                </el-descriptions-item>
                <template v-if="hashResult.found">
                  <el-descriptions-item label="已存证标题">{{ hashResult.title }}</el-descriptions-item>
                  <el-descriptions-item label="作者">{{ hashResult.authorId }}</el-descriptions-item>
                  <el-descriptions-item label="存证交易哈希">
                    <el-text type="warning" class="tx-hash">{{ hashResult.transactionHash }}</el-text>
                  </el-descriptions-item>
                  <el-descriptions-item label="存证时间">{{ formatDate(hashResult.timestamp) }}</el-descriptions-item>
                </template>
              </el-descriptions>
            </div>

            <!-- SimHash 结果（文件哈希 tab 展示） -->
            <SimhashResult
              v-if="hashSimhash !== null"
              :matches="hashSimhash"
              :query-simhash="hashQuerySimhash"
              :query-segments="hashQuerySegments"
            />
          </el-tab-pane>

          <!-- ── Tab 2：全文相似度查重 ── -->
          <el-tab-pane label="全文相似度查重" name="similarity">
            <div class="tab-desc">
              上传文件或输入标题/摘要，系统将提取全文（PDF/代码/文本），同时：
              <br>① <b>粗筛层</b>：SimHash 全文 + 分段指纹在 <b>papers.db</b>（{{ dbStats?.count || 0 }} 篇）中检索；
              <br>② <b>细排层</b>：TF-IDF + 余弦相似度在系统存证记录和 papers.db 中全量排序；
              <br>③ <b>语义层</b>：BERT 对候选文档进行深度语义比对（需启动 bert_service）。
            </div>

            <el-upload
              class="hash-upload" drag :auto-upload="false" :limit="1"
              :on-change="handleSimFileChange" :on-remove="handleSimFileRemove"
              :file-list="simFileList" style="margin-bottom:16px"
            >
              <div class="upload-inner">
                <div class="upload-icon-wrap">
                  <el-icon class="upload-icon"><upload-filled /></el-icon>
                </div>
                <div class="upload-text">上传文件自动提取全文（推荐），或 <em>点击上传</em></div>
                <div class="upload-tip">支持 PDF · docx · pptx · xlsx · TXT · 代码等格式；不上传文件时仅用下方元数据</div>
              </div>
            </el-upload>

            <el-form :model="simForm" ref="simFormRef" label-position="top" class="sim-form">
              <el-form-item label="成果标题（可选）">
                <el-input v-model="simForm.title" placeholder="请输入成果标题" maxlength="200" show-word-limit class="styled-input" />
              </el-form-item>
              <el-form-item label="成果摘要（可选）">
                <el-input v-model="simForm.abstract" type="textarea" :rows="3" placeholder="输入摘要以提高查重精度" class="styled-input" />
              </el-form-item>
              <el-form-item label="关键词（可选）">
                <el-input v-model="simForm.keywords" placeholder="多个关键词用空格分隔" class="styled-input" />
              </el-form-item>
              <div class="action-row">
                <el-button
                  type="primary" size="large"
                  :loading="simLoading" :disabled="!simFile && !simForm.title"
                  @click="runSimilarityCheck" class="check-btn"
                >
                  {{ simLoading ? '正在分析...' : '开始全文查重' }}
                </el-button>
                <el-button size="large" @click="resetSim">重置</el-button>
              </div>
            </el-form>

            <!-- SimHash 结果 -->
            <SimhashResult
              v-if="simSimhash !== null"
              :matches="simSimhash"
              :query-simhash="simQuerySimhash"
              :query-segments="simQuerySegments"
            />

            <!-- TF-IDF 结果 -->
            <div v-if="simResult !== null" class="result-section">
              <el-divider>TF-IDF 相似度结果（语料库共 {{ simCorpus?.total || 0 }} 篇）</el-divider>
              <el-alert
                :title="simResult.length === 0 ? '未发现相似成果' : `发现 ${simResult.length} 条相似成果`"
                :type="simResult.length === 0 ? 'success' : (simResult[0]?.similarityScore >= 50 ? 'error' : 'warning')"
                :closable="false" show-icon class="result-alert"
              >
                <template v-if="simResult.length === 0" #default>
                  <p>与系统记录及 papers.db 中所有论文的 TF-IDF 余弦相似度均低于阈值，内容原创性较高。</p>
                </template>
              </el-alert>
              <SimilarityList v-if="simResult.length > 0" :items="simResult" />
            </div>
          </el-tab-pane>

          <!-- ── Tab 3：综合查重报告 ── -->
          <el-tab-pane label="综合查重报告" name="combined">
            <div class="tab-desc">
              同时运行全部三层查重引擎：
              <b>① 粗筛层</b>（SimHash + 分段索引）&nbsp;+&nbsp;
              <b>② 细排层</b>（TF-IDF 余弦相似度）&nbsp;+&nbsp;
              <b>③ 语义层</b>（BERT 全文深度查重）；
              并自动生成 <b>证据链报告</b>，包含来源论文标题、作者及具体匹配内容。
            </div>

            <el-upload
              class="hash-upload" drag :auto-upload="false" :limit="1"
              :on-change="handleCombinedFileChange" :on-remove="handleCombinedFileRemove"
              :file-list="combinedFileList"
            >
              <div class="upload-inner">
                <div class="upload-icon-wrap"><el-icon class="upload-icon"><upload-filled /></el-icon></div>
                <div class="upload-text">拖拽文件至此，或 <em>点击上传</em></div>
              </div>
            </el-upload>

            <el-form :model="combinedForm" label-position="top" class="sim-form" style="margin-top:20px">
              <el-form-item label="成果标题">
                <el-input v-model="combinedForm.title" placeholder="请输入成果标题" class="styled-input" />
              </el-form-item>
              <el-form-item label="成果摘要">
                <el-input v-model="combinedForm.abstract" type="textarea" :rows="3" placeholder="输入摘要（可选）" class="styled-input" />
              </el-form-item>
              <el-form-item label="关键词">
                <el-input v-model="combinedForm.keywords" placeholder="多个关键词用空格分隔（可选）" class="styled-input" />
              </el-form-item>
            </el-form>

            <div class="action-row">
              <el-button
                type="primary" size="large"
                :loading="combinedLoading" :disabled="!combinedFile && !combinedForm.title"
                @click="runCombinedCheck" class="check-btn"
              >
                {{ combinedLoading ? '综合查重中...' : '开始综合查重' }}
              </el-button>
            </div>

            <!-- 综合报告 -->
            <div v-if="combinedResult" class="result-section">
              <el-divider>综合查重报告</el-divider>

              <!-- 风险总览 -->
              <div v-if="combinedResult.report" class="risk-overview" :class="`risk-${combinedResult.report.riskLevel}`">
                <div class="risk-header">
                  <span class="risk-icon">{{ riskIcon(combinedResult.report.riskLevel) }}</span>
                  <span class="risk-label">风险等级：{{ riskLevelLabel(combinedResult.report.riskLevel) }}</span>
                  <span class="risk-score">综合相似度 {{ combinedResult.report.maxSimilarity }}%</span>
                </div>
                <div class="risk-summary">{{ combinedResult.report.summary }}</div>
                <div v-if="combinedResult.report.riskLevel !== 'critical'" class="risk-breakdown">
                  <span v-if="combinedResult.report.simMax">SimHash: {{ combinedResult.report.simMax }}%</span>
                  <span v-if="combinedResult.report.tfidfMax">TF-IDF: {{ combinedResult.report.tfidfMax }}%</span>
                  <span v-if="combinedResult.report.bertMax && combinedResult.bertAvailable">BERT: {{ combinedResult.report.bertMax }}%</span>
                  <span v-if="!combinedResult.bertAvailable" class="bert-offline">BERT 服务离线（启动方式见文档）</span>
                </div>
              </div>

              <!-- 第一节：SHA-256 -->
              <div class="report-section">
                <div class="report-section-title">
                  <span class="report-num">①</span> 粗筛层 — SHA-256 精确匹配
                  <span class="corpus-tag">语料库：系统已存证记录</span>
                </div>
                <template v-if="combinedResult.hashMatch">
                  <el-alert
                    :title="combinedResult.hashMatch.found ? '⚠ 检测到完全相同文件！' : '✓ 文件无重复'"
                    :type="combinedResult.hashMatch.found ? 'error' : 'success'"
                    :closable="false" show-icon class="result-alert"
                  />
                  <el-descriptions :column="1" border class="hash-desc">
                    <el-descriptions-item label="SHA-256">
                      <el-text type="info" class="hash-value">{{ combinedResult.hashMatch.sha256 }}</el-text>
                    </el-descriptions-item>
                    <template v-if="combinedResult.hashMatch.found">
                      <el-descriptions-item label="重复成果标题">{{ combinedResult.hashMatch.title }}</el-descriptions-item>
                      <el-descriptions-item label="存证时间">{{ formatDate(combinedResult.hashMatch.timestamp) }}</el-descriptions-item>
                    </template>
                  </el-descriptions>
                </template>
                <el-empty v-else description="未上传文件，跳过 SHA-256 查重" :image-size="60" />
              </div>

              <!-- 第二节：SimHash + 分段索引 -->
              <div class="report-section">
                <div class="report-section-title">
                  <span class="report-num">②</span> 粗筛层 — SimHash + 分段索引
                  <span class="corpus-tag">语料库：papers.db（{{ dbStats?.count || 0 }} 篇外部论文）</span>
                </div>
                <div v-if="combinedResult.querySegments?.length" class="segment-info">
                  <el-icon style="color:#0891B2;margin-right:4px"><info-filled /></el-icon>
                  已将文档切分为 <b>{{ combinedResult.querySegments.length }}</b> 段独立指纹，捕捉局部抄袭
                </div>
                <SimhashResult
                  v-if="combinedResult.simhashMatches !== undefined"
                  :matches="combinedResult.simhashMatches"
                  :query-simhash="combinedResult.querySimhash"
                  :query-segments="combinedResult.querySegments"
                  compact
                />
                <el-empty v-else description="未提供文本信息，跳过 SimHash 查重" :image-size="60" />
              </div>

              <!-- 第三节：TF-IDF -->
              <div class="report-section">
                <div class="report-section-title">
                  <span class="report-num">③</span> 细排层 — TF-IDF 余弦相似度
                  <span class="corpus-tag">
                    语料库：系统记录 {{ combinedResult.corpus?.system || 0 }} 篇 +
                    papers.db {{ combinedResult.corpus?.papers_db || 0 }} 篇
                  </span>
                </div>
                <template v-if="combinedResult.similarContent !== undefined">
                  <el-alert
                    v-if="combinedResult.similarContent.length === 0"
                    title="✓ 未发现相似成果" type="success" :closable="false" show-icon class="result-alert"
                  />
                  <SimilarityList v-else :items="combinedResult.similarContent" />
                </template>
                <el-empty v-else description="未提供文本信息，跳过相似度查重" :image-size="60" />
              </div>

              <!-- 第四节：BERT 语义层 -->
              <div class="report-section">
                <div class="report-section-title">
                  <span class="report-num">④</span> 语义层 — BERT 全文深度查重
                  <span class="corpus-tag">候选集：TF-IDF top 10 + SimHash 高度相似</span>
                  <el-tag
                    v-if="combinedResult.bertAvailable" type="success" size="small" style="margin-left:8px"
                  >在线</el-tag>
                  <el-tag v-else type="info" size="small" style="margin-left:8px">服务离线</el-tag>
                </div>
                <template v-if="combinedResult.bertAvailable && combinedResult.bertMatches">
                  <el-alert
                    v-if="combinedResult.bertMatches.length === 0"
                    title="✓ 语义层未发现高度相似成果" type="success" :closable="false" show-icon class="result-alert"
                  />
                  <BertResult v-else :items="combinedResult.bertMatches" />
                </template>
                <div v-else class="bert-offline-box">
                  <el-icon style="font-size:22px;color:#94A3B8;margin-bottom:8px"><warning /></el-icon>
                  <div style="color:#64748B;font-size:13px">BERT 微服务未启动，语义层查重跳过</div>
                  <div style="color:#94A3B8;font-size:12px;margin-top:4px">
                    启动方式：<code>cd xiyuan_backend/bert_service && pip install -r requirements.txt && python bert_service.py</code>
                  </div>
                </div>
              </div>

              <!-- 第五节：证据链 -->
              <div class="report-section" v-if="combinedResult.evidenceChain?.length">
                <div class="report-section-title">
                  <span class="report-num">⑤</span> 证据链详情
                  <span class="corpus-tag">具体匹配内容 · 来源标题 · 作者信息</span>
                </div>
                <EvidenceChain :chain="combinedResult.evidenceChain" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, defineComponent, h } from 'vue'
import { ElMessage, ElProgress, ElDescriptions, ElDescriptionsItem, ElTag, ElText, ElAlert, ElEmpty, type FormInstance } from 'element-plus'
import { UploadFilled, Search, DataBoard, InfoFilled, Warning } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/research'
const activeTab = ref('hash')

// ── DB 状态 ────────────────────────────────────────────────────────
const dbStats = ref<any>(null)
onMounted(async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/db-stats`)
    dbStats.value = data
  } catch (_) {}
})

// ── 工具函数 ──────────────────────────────────────────────────────
const formatDate = (ts: string | Date | null) => {
  if (!ts) return '—'
  return new Date(ts as string).toLocaleString('zh-CN', { hour12: false })
}

const riskIcon = (level: string) => ({
  critical: '🔴', high: '🟠', medium: '🟡', low: '🟢', none: '✅'
}[level] || '❓')

const riskLevelLabel = (level: string) => ({
  critical: '严重重复', high: '高度重复', medium: '中度相似',
  low: '轻微相似', none: '原创性良好'
}[level] || level)

// ── 子组件：SimHash 结果面板 ───────────────────────────────────────
const SimhashResult = defineComponent({
  props: {
    matches:       { type: Array as () => any[], required: true },
    querySimhash:  { type: String, default: null },
    querySegments: { type: Array as () => string[], default: () => [] },
    compact:       { type: Boolean, default: false }
  },
  setup(props) {
    const levelColor = (level: string) => ({
      exact: '#DC2626', high: '#D97706', medium: '#2563EB', low: '#64748B'
    }[level] || '#64748B')
    const levelLabel = (level: string) => ({
      exact: '高度重复', high: '高度相似', medium: '中度相似', low: '轻微相似'
    }[level] || '相似')
    const levelType  = (level: string): any => ({
      exact: 'danger', high: 'warning', medium: 'primary', low: 'info'
    }[level] || 'info')

    const matchTypeLabel = (mt: string) => {
      if (!mt) return ''
      if (mt === 'full')   return '全文匹配'
      if (mt === 'band')   return '频段命中'
      if (mt.startsWith('segment_')) return `第${parseInt(mt.split('_')[1]) + 1}段匹配`
      return mt
    }

    return () => {
      const items = props.matches
      const noMatch = items.length === 0

      return h('div', { class: 'result-section' }, [
        h('div', { class: 'el-divider el-divider--horizontal', style: 'margin:16px 0' }, [
          h('div', { class: 'el-divider__text' }, 'SimHash 近似匹配结果（papers.db）')
        ]),

        props.querySimhash && !props.compact
          ? h('div', { class: 'simhash-fingerprint' }, [
              h('span', { class: 'fp-label' }, '全文 SimHash：'),
              h('code', { class: 'fp-value' }, props.querySimhash),
              props.querySegments?.length
                ? h('span', { style: 'color:#64748B;font-size:12px;margin-left:8px' },
                    `（分 ${props.querySegments.length} 段）`)
                : null
            ])
          : null,

        noMatch
          ? h(ElAlert, {
              title: '未在 papers.db 中发现近似文档',
              type: 'success', closable: false, showIcon: true, class: 'result-alert'
            })
          : h(ElAlert, {
              title: `papers.db 中发现 ${items.length} 篇近似文档`,
              type: items[0].level === 'exact' ? 'error' : items[0].level === 'high' ? 'warning' : 'primary',
              closable: false, showIcon: true, class: 'result-alert'
            }),

        ...items.map(item =>
          h('div', { class: 'sim-item simhash-item', key: item.id }, [
            h('div', { class: 'sim-item-header' }, [
              h('div', { style: 'flex:1;min-width:0' }, [
                h('div', { class: 'sim-title' }, item.title),
                item.authors ? h('div', { class: 'sim-authors' }, `作者：${item.authors}`) : null
              ]),
              h('div', { class: 'sim-tags' }, [
                h(ElTag, { type: 'info', size: 'small', style: 'margin-right:4px' }, () => `Hamming ${item.hammingDistance}`),
                item.matchType
                  ? h(ElTag, { type: 'info', size: 'small', style: 'margin-right:4px' }, () => matchTypeLabel(item.matchType))
                  : null,
                h(ElTag, { type: levelType(item.level), size: 'large', class: 'sim-score' },
                  () => `${levelLabel(item.level)} ${item.similarityPercent}%`)
              ])
            ]),
            h(ElProgress, {
              percentage: item.similarityPercent,
              color: levelColor(item.level),
              class: 'sim-progress'
            }),
            item.abstract
              ? h('div', { class: 'simhash-abstract' }, item.abstract.slice(0, 200) + (item.abstract.length > 200 ? '…' : ''))
              : null,
            (item.published || item.source)
              ? h('div', { class: 'sim-meta-row' }, [
                  item.published ? h('span', { class: 'sim-meta-tag' }, `📅 ${item.published}`) : null,
                  item.source   ? h('span', { class: 'sim-meta-tag' }, `来源: ${item.source}`) : null
                ])
              : null,
            h('div', { class: 'hamming-bar' },
              Array.from({ length: 64 }, (_, i) =>
                h('span', {
                  class: 'hamming-bit',
                  style: `background:${i < item.hammingDistance ? '#FCA5A5' : '#BBF7D0'}`
                })
              )
            ),
            h('div', { class: 'hamming-legend' }, [
              h('span', { class: 'legend-dot', style: 'background:#FCA5A5' }),
              h('span', { style: 'color:#64748B;font-size:11px' }, `${item.hammingDistance} 位不同 / 64 位`),
              h('span', { class: 'legend-dot', style: 'background:#BBF7D0;margin-left:12px' }),
              h('span', { style: 'color:#64748B;font-size:11px' }, `${64 - item.hammingDistance} 位相同`)
            ])
          ])
        )
      ])
    }
  }
})

// ── 子组件：TF-IDF 结果列表 ──────────────────────────────────────
const SimilarityList = defineComponent({
  props: { items: { type: Array as () => any[], required: true } },
  setup(props) {
    const scoreColor = (s: number) => s >= 50 ? '#f56c6c' : s >= 30 ? '#e6a23c' : '#409eff'
    const scoreType  = (s: number): any => s >= 50 ? 'danger' : s >= 30 ? 'warning' : 'primary'

    return () => h('div', { class: 'sim-results' },
      props.items.map(item =>
        h('div', { class: `sim-item ${item.source === 'papers_db' ? 'sim-item-external' : ''}`, key: item.researchId }, [
          h('div', { class: 'sim-item-header' }, [
            h('div', { style: 'flex:1;min-width:0' }, [
              h('div', { class: 'sim-title' }, item.title),
              item.authors ? h('div', { class: 'sim-authors' }, `作者：${item.authors}`) : null
            ]),
            h('div', { class: 'sim-tags' }, [
              item.source === 'papers_db'
                ? h(ElTag, { type: 'warning', size: 'small', style: 'margin-right:6px' }, () => 'papers.db')
                : (item.usedFullText
                    ? h(ElTag, { type: 'success', size: 'small', style: 'margin-right:6px' }, () => '全文比对')
                    : h(ElTag, { type: 'info', size: 'small', style: 'margin-right:6px' }, () => '元数据')),
              h(ElTag, { type: scoreType(item.similarityScore), size: 'large', class: 'sim-score' },
                () => `相似度 ${item.similarityScore}%`)
            ])
          ]),
          h(ElProgress, {
            percentage: item.similarityScore,
            color: scoreColor(item.similarityScore),
            class: 'sim-progress'
          }),
          h(ElDescriptions, { column: 2, size: 'small', class: 'sim-desc' }, () => [
            h(ElDescriptionsItem, { label: '来源' }, () =>
              item.source === 'papers_db' ? `外部论文库 (papers.db · ${item.dbSource || ''})` : '本系统存证'),
            h(ElDescriptionsItem, { label: '作者' }, () => item.authors || item.authorId || '—'),
            item.published
              ? h(ElDescriptionsItem, { label: '发表日期' }, () => item.published)
              : (item.timestamp
                  ? h(ElDescriptionsItem, { label: '存证时间', span: 2 }, () => formatDate(item.timestamp))
                  : null),
            item.abstract
              ? h(ElDescriptionsItem, { label: '摘要', span: 2 }, () =>
                  h(ElText, { lineClamp: 2 }, () => item.abstract))
              : null
          ].filter(Boolean))
        ])
      )
    )
  }
})

// ── 子组件：BERT 语义层结果 ──────────────────────────────────────
const BertResult = defineComponent({
  props: { items: { type: Array as () => any[], required: true } },
  setup(props) {
    const scoreColor = (s: number) => s >= 70 ? '#f56c6c' : s >= 50 ? '#e6a23c' : '#409eff'
    const scoreType  = (s: number): any => s >= 70 ? 'danger' : s >= 50 ? 'warning' : 'primary'

    return () => h('div', { class: 'sim-results' },
      props.items.map(item =>
        h('div', { class: `sim-item sim-item-bert`, key: item.researchId }, [
          h('div', { class: 'sim-item-header' }, [
            h('div', { style: 'flex:1;min-width:0' }, [
              h('div', { class: 'sim-title' }, item.title || item.researchId),
              item.authors ? h('div', { class: 'sim-authors' }, `作者：${item.authors}`) : null
            ]),
            h('div', { class: 'sim-tags' }, [
              h(ElTag, { type: 'primary', size: 'small', style: 'margin-right:4px' }, () => 'BERT 语义'),
              h(ElTag, { type: scoreType(item.similarityScore), size: 'large', class: 'sim-score' },
                () => `综合 ${item.similarityScore}%`)
            ])
          ]),
          h(ElProgress, {
            percentage: item.similarityScore,
            color: scoreColor(item.similarityScore),
            class: 'sim-progress'
          }),
          // BERT vs TF-IDF 分值对比
          h('div', { class: 'bert-breakdown' }, [
            h('span', { class: 'breakdown-item' }, [
              h('span', { class: 'breakdown-label' }, 'BERT 语义'),
              h('span', { class: 'breakdown-val', style: `color:${scoreColor(item.bertScore)}` },
                `${item.bertScore}%`)
            ]),
            h('span', { class: 'breakdown-sep' }, '·'),
            h('span', { class: 'breakdown-item' }, [
              h('span', { class: 'breakdown-label' }, 'TF-IDF 词频'),
              h('span', { class: 'breakdown-val', style: `color:${scoreColor(item.tfidfScore)}` },
                `${item.tfidfScore}%`)
            ])
          ]),
          item.abstract
            ? h('div', { class: 'simhash-abstract' }, item.abstract.slice(0, 180) + (item.abstract.length > 180 ? '…' : ''))
            : null
        ])
      )
    )
  }
})

// ── 子组件：证据链面板 ────────────────────────────────────────────
const EvidenceChain = defineComponent({
  props: { chain: { type: Array as () => any[], required: true } },
  setup(props) {
    const riskColor = (s: number) => s >= 70 ? '#DC2626' : s >= 40 ? '#D97706' : '#2563EB'

    return () => h('div', { class: 'evidence-chain' },
      props.chain.map((entry, idx) =>
        h('div', { class: 'evidence-item', key: idx }, [
          // 来源头部
          h('div', { class: 'evidence-header' }, [
            h('div', { class: 'evidence-meta' }, [
              h('span', { class: 'evidence-idx' }, `证据 ${idx + 1}`),
              h('span', { class: 'evidence-title' }, entry.sourceTitle),
            ]),
            h('div', { class: 'evidence-score', style: `color:${riskColor(entry.overallSimilarity)}` },
              `${entry.overallSimilarity}%`)
          ]),
          // 来源信息
          h('div', { class: 'evidence-source-info' }, [
            entry.sourceAuthor
              ? h('span', { class: 'evidence-tag' }, `👤 ${entry.sourceAuthor}`)
              : null,
            entry.sourcePublished
              ? h('span', { class: 'evidence-tag' }, `📅 ${formatDate(entry.sourcePublished)}`)
              : null,
            entry.sourceType
              ? h('span', { class: 'evidence-tag' }, entry.sourceType === 'papers_db' ? '外部论文库' : '系统存证')
              : null,
            entry.similarityBreakdown
              ? h('span', { class: 'evidence-tag' },
                  `BERT ${entry.similarityBreakdown.bert || '—'}% · TF-IDF ${entry.similarityBreakdown.tfidf || '—'}%`)
              : null
          ]),
          // 匹配句子对
          entry.matchedSnippets?.length
            ? h('div', { class: 'evidence-snippets' }, [
                h('div', { class: 'snippets-title' }, '匹配内容（句子级对齐）'),
                ...entry.matchedSnippets.map((snippet: any, si: number) =>
                  h('div', { class: 'snippet-pair', key: si }, [
                    h('div', { class: 'snippet-row snippet-query' }, [
                      h('span', { class: 'snippet-label' }, '待查'),
                      h('span', { class: 'snippet-text' }, `"${snippet.querySnippet}"`)
                    ]),
                    h('div', { class: 'snippet-row snippet-target' }, [
                      h('span', { class: 'snippet-label' }, '来源'),
                      h('span', { class: 'snippet-text' }, `"${snippet.targetSnippet}"`)
                    ]),
                    h('div', { class: 'snippet-score' }, [
                      h('span', { class: 'snippet-score-bar', style: `width:${snippet.matchScore}%;background:${riskColor(snippet.matchScore)}` }),
                      h('span', { class: 'snippet-score-text' }, `句子相似度 ${snippet.matchScore}%`)
                    ])
                  ])
                )
              ])
            : h('div', { class: 'no-snippet' }, '未能提取具体匹配句子（摘要过短或无全文）')
        ])
      )
    )
  }
})

// ── Tab 1：哈希查重 ───────────────────────────────────────────────
const hashFile          = ref<File | null>(null)
const hashFileList      = ref<any[]>([])
const hashLoading       = ref(false)
const hashResult        = ref<any>(null)
const hashSimhash       = ref<any[] | null>(null)
const hashQuerySimhash  = ref<string | null>(null)
const hashQuerySegments = ref<string[]>([])

const handleHashFileChange = (_: any, fileList: any[]) => {
  hashFile.value    = fileList[0]?.raw ?? null
  hashResult.value  = null
  hashSimhash.value = null
}
const handleHashFileRemove = () => {
  hashFile.value    = null
  hashResult.value  = null
  hashSimhash.value = null
}

const runHashCheck = async () => {
  if (!hashFile.value) return
  hashLoading.value = true
  try {
    const fd = new FormData()
    fd.append('file', hashFile.value)
    const { data } = await axios.post(`${API_BASE}/check-duplicate`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    hashResult.value        = data.hashMatch
    hashSimhash.value       = data.simhashMatches ?? []
    hashQuerySimhash.value  = data.querySimhash
    hashQuerySegments.value = data.querySegments ?? []

    const found  = data.hashMatch?.found
    const shHits = data.simhashMatches?.length ?? 0
    if (found)        ElMessage.error('发现完全相同的已存证文件！')
    else if (shHits)  ElMessage.warning(`SHA-256 无重复，但 SimHash 在 papers.db 中发现 ${shHits} 篇近似文档`)
    else              ElMessage.success('未发现重复文件')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '查重请求失败')
  } finally {
    hashLoading.value = false
  }
}

// ── Tab 2：相似度查重 ─────────────────────────────────────────────
const simFile           = ref<File | null>(null)
const simFileList       = ref<any[]>([])
const simFormRef        = ref<FormInstance>()
const simForm           = reactive({ title: '', abstract: '', keywords: '' })
const simLoading        = ref(false)
const simResult         = ref<any[] | null>(null)
const simSimhash        = ref<any[] | null>(null)
const simQuerySimhash   = ref<string | null>(null)
const simQuerySegments  = ref<string[]>([])
const simCorpus         = ref<any>(null)

const handleSimFileChange = (_: any, fileList: any[]) => {
  simFile.value    = fileList[0]?.raw ?? null
  simResult.value  = null
  simSimhash.value = null
}
const handleSimFileRemove = () => {
  simFile.value    = null
  simResult.value  = null
  simSimhash.value = null
}

const runSimilarityCheck = async () => {
  simLoading.value = true
  try {
    const fd = new FormData()
    if (simFile.value)      fd.append('file',     simFile.value)
    if (simForm.title)      fd.append('title',    simForm.title)
    if (simForm.abstract)   fd.append('abstract', simForm.abstract)
    if (simForm.keywords)   fd.append('keywords', simForm.keywords)

    const { data } = await axios.post(`${API_BASE}/check-duplicate`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    simResult.value        = data.similarContent ?? []
    simSimhash.value       = data.simhashMatches ?? []
    simQuerySimhash.value  = data.querySimhash
    simQuerySegments.value = data.querySegments ?? []
    simCorpus.value        = data.corpus

    const tHits = simResult.value.length
    const sHits = simSimhash.value.length
    if (tHits || sHits) {
      ElMessage.warning(`发现相似内容：TF-IDF ${tHits} 条，SimHash ${sHits} 条`)
    } else {
      ElMessage.success('未发现相似成果')
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '查重请求失败')
  } finally {
    simLoading.value = false
  }
}

const resetSim = () => {
  simFormRef.value?.resetFields()
  simFile.value          = null
  simFileList.value      = []
  simResult.value        = null
  simSimhash.value       = null
  simQuerySimhash.value  = null
  simQuerySegments.value = []
  simCorpus.value        = null
}

// ── Tab 3：综合查重 ───────────────────────────────────────────────
const combinedFile     = ref<File | null>(null)
const combinedFileList = ref<any[]>([])
const combinedForm     = reactive({ title: '', abstract: '', keywords: '' })
const combinedLoading  = ref(false)
const combinedResult   = ref<any>(null)

const handleCombinedFileChange = (_: any, fileList: any[]) => {
  combinedFile.value   = fileList[0]?.raw ?? null
  combinedResult.value = null
}
const handleCombinedFileRemove = () => {
  combinedFile.value   = null
  combinedResult.value = null
}

const runCombinedCheck = async () => {
  combinedLoading.value = true
  try {
    const fd = new FormData()
    if (combinedFile.value)       fd.append('file',     combinedFile.value)
    if (combinedForm.title)       fd.append('title',    combinedForm.title)
    if (combinedForm.abstract)    fd.append('abstract', combinedForm.abstract)
    if (combinedForm.keywords)    fd.append('keywords', combinedForm.keywords)

    const { data } = await axios.post(`${API_BASE}/check-duplicate`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    combinedResult.value = data

    const report = data.report
    if (report?.riskLevel === 'critical' || report?.riskLevel === 'high') {
      ElMessage.error(`高风险：${report.summary}`)
    } else if (report?.riskLevel === 'medium') {
      ElMessage.warning(`中度相似：${report.summary}`)
    } else {
      ElMessage.success('综合查重完成，原创性良好')
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.error || '查重请求失败')
  } finally {
    combinedLoading.value = false
  }
}
</script>

<style scoped>
.page-wrapper { min-height: calc(100vh - 64px); background: #F0F5FF; }

.page-hero {
  background: linear-gradient(135deg, #F0F9FF 0%, #EFF6FF 100%);
  border-bottom: 1px solid #E2E8F0;
  padding: 32px 40px 24px;
}
.page-hero-content { max-width: 1100px; margin: 0 auto; }
.page-badge {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.page-title { font-size: 26px; font-weight: 700; color: #1E293B; margin: 0 0 6px; }
.page-sub   { font-size: 14px; color: #64748B; margin: 0; }

.page-body { max-width: 1100px; margin: 0 auto; padding: 24px 40px 40px; }

/* DB Banner */
.db-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 8px; font-size: 13px;
  margin-bottom: 16px;
}
.db-ok      { background: #F0FDF4; color: #065F46; border: 1px solid #A7F3D0; }
.db-missing { background: #FFF7ED; color: #92400E; border: 1px solid #FCD34D; }
.db-warn    { color: #D97706; }
code { background: #E2E8F0; padding: 1px 5px; border-radius: 4px; font-size: 12px; }

/* Form Card */
.form-card {
  background: white; border: 1px solid #E2E8F0;
  border-radius: 14px; padding: 28px;
  box-shadow: 0 2px 12px rgba(37,99,235,0.06);
}
.form-card-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 600; color: #1E293B;
  margin-bottom: 20px; padding-bottom: 14px;
  border-bottom: 1px solid #F1F5F9;
}
.card-icon { font-size: 18px; }

.check-tabs { margin-top: 8px; }

.tab-desc {
  background: #F0F9FF; border-left: 4px solid #0891B2;
  padding: 12px 16px; border-radius: 0 8px 8px 0;
  color: #0369A1; font-size: 13px; line-height: 1.7;
  margin-bottom: 20px;
}

/* Upload */
.hash-upload { width: 100%; }
.hash-upload :deep(.el-upload) { width: 100%; }
.hash-upload :deep(.el-upload-dragger) {
  border: 2px dashed #BFDBFE !important; border-radius: 12px !important;
  background: linear-gradient(135deg, #F8FAFF 0%, #F0FDF4 100%) !important;
  transition: all 0.2s; padding: 0;
}
.hash-upload :deep(.el-upload-dragger:hover) { border-color: #2563EB !important; background: #EFF6FF !important; }
.upload-inner { padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.upload-icon-wrap {
  width: 56px; height: 56px; background: white; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(37,99,235,0.12); margin-bottom: 6px;
}
.upload-icon { font-size: 26px; color: #2563EB; }
.upload-text { font-size: 14px; color: #475569; }
.upload-text em { color: #2563EB; font-style: normal; font-weight: 600; }
.upload-tip { font-size: 12px; color: #94A3B8; }

.action-row { margin-top: 20px; display: flex; gap: 12px; }

.check-btn {
  background: linear-gradient(135deg, #0891B2, #2563EB) !important;
  border: none !important; color: white !important;
  font-weight: 600 !important; border-radius: 8px !important;
  padding: 0 28px !important;
}

/* Inputs */
.styled-input :deep(.el-input__wrapper),
.styled-input :deep(.el-textarea__inner) {
  border-radius: 8px !important; border-color: #E2E8F0 !important; box-shadow: none !important;
}
.styled-input :deep(.el-input__wrapper:hover),
.styled-input :deep(.el-textarea__inner:hover) { border-color: #93C5FD !important; }
.styled-input :deep(.el-input__wrapper.is-focus),
.styled-input :deep(.el-textarea__inner:focus) {
  border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
}

/* Results */
.result-section { margin-top: 24px; }
.result-alert   { margin-bottom: 16px; }
.hash-desc      { margin-top: 12px; }
.hash-value, .tx-hash { font-family: monospace; font-size: 12px; word-break: break-all; }
.sim-form { margin-top: 8px; }

/* SimHash fingerprint */
.simhash-fingerprint {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px; font-size: 12px;
}
.fp-label { color: #64748B; font-weight: 600; flex-shrink: 0; }
.fp-value {
  font-family: monospace; font-size: 11px; letter-spacing: 1px;
  color: #0891B2; background: #F0F9FF; padding: 4px 8px;
  border-radius: 6px; word-break: break-all;
}

/* Hamming bit bar */
.hamming-bar {
  display: flex; flex-wrap: wrap; gap: 2px; margin: 8px 0 4px;
}
.hamming-bit {
  width: 9px; height: 9px; border-radius: 2px; display: inline-block;
}
.hamming-legend {
  display: flex; align-items: center; gap: 4px; font-size: 11px; margin-bottom: 4px;
}
.legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

.simhash-abstract {
  font-size: 13px; color: #64748B; line-height: 1.5;
  margin: 8px 0;
}

/* Similarity items */
.sim-results { display: flex; flex-direction: column; gap: 14px; }

.sim-item {
  background: white; border: 1px solid #E2E8F0; border-radius: 12px;
  padding: 20px; box-shadow: 0 2px 8px rgba(37,99,235,0.05);
  transition: box-shadow 0.2s;
}
.sim-item:hover { box-shadow: 0 4px 16px rgba(37,99,235,0.10); }

.sim-item-external { border-left: 3px solid #D97706; }
.simhash-item      { border-left: 3px solid #0891B2; }
.sim-item-bert     { border-left: 3px solid #7C3AED; }

.sim-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px; }
.sim-tags  { display: flex; align-items: center; flex-shrink: 0; flex-wrap: wrap; gap: 4px; }
.sim-title { font-weight: 600; font-size: 15px; color: #1E293B; margin-bottom: 4px; }
.sim-authors { font-size: 12px; color: #64748B; }
.sim-score { flex-shrink: 0; }
.sim-progress { margin-bottom: 12px; }
.sim-desc { margin-top: 8px; }
.sim-meta-row { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.sim-meta-tag {
  font-size: 12px; color: #64748B; background: #F8FAFC;
  padding: 2px 8px; border-radius: 20px; border: 1px solid #E2E8F0;
}

/* BERT breakdown */
.bert-breakdown {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #64748B; margin-bottom: 8px;
}
.breakdown-item { display: flex; align-items: center; gap: 4px; }
.breakdown-label { color: #94A3B8; }
.breakdown-val { font-weight: 700; }
.breakdown-sep { color: #CBD5E1; }

/* Combined report sections */
.report-section {
  background: #F8FAFC; border: 1px solid #E2E8F0;
  border-radius: 10px; padding: 20px; margin-bottom: 16px;
}
.report-section-title {
  font-size: 15px; font-weight: 600; color: #1E293B;
  margin-bottom: 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.report-num {
  width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, #2563EB, #0891B2);
  color: white; font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.corpus-tag {
  font-size: 12px; font-weight: 400; color: #64748B;
  background: white; border: 1px solid #E2E8F0;
  padding: 2px 10px; border-radius: 20px; margin-left: auto;
}
.segment-info {
  display: flex; align-items: center; font-size: 12px; color: #0369A1;
  background: #F0F9FF; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;
}

/* Risk overview */
.risk-overview {
  border-radius: 12px; padding: 20px; margin-bottom: 20px;
  border: 2px solid transparent;
}
.risk-critical { background: #FEF2F2; border-color: #FCA5A5; }
.risk-high     { background: #FFF7ED; border-color: #FCD34D; }
.risk-medium   { background: #FFFBEB; border-color: #FDE68A; }
.risk-low      { background: #F0FDF4; border-color: #A7F3D0; }
.risk-none     { background: #F0FDF4; border-color: #A7F3D0; }

.risk-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
}
.risk-icon  { font-size: 20px; }
.risk-label { font-weight: 700; font-size: 16px; color: #1E293B; flex: 1; }
.risk-score { font-size: 22px; font-weight: 800; color: #1E293B; }
.risk-summary { font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 8px; }
.risk-breakdown {
  display: flex; gap: 12px; font-size: 12px; color: #64748B; flex-wrap: wrap;
}
.risk-breakdown span { background: white; padding: 2px 10px; border-radius: 20px; }
.bert-offline { color: #94A3B8 !important; font-style: italic; }

/* BERT offline box */
.bert-offline-box {
  display: flex; flex-direction: column; align-items: center;
  padding: 24px; background: #F8FAFC; border-radius: 8px;
  border: 1px dashed #CBD5E1; text-align: center;
}

/* Evidence chain */
.evidence-chain { display: flex; flex-direction: column; gap: 16px; }
.evidence-item {
  background: white; border: 1px solid #E2E8F0; border-radius: 10px;
  padding: 18px; border-left: 4px solid #7C3AED;
}
.evidence-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; margin-bottom: 8px;
}
.evidence-meta { flex: 1; }
.evidence-idx {
  font-size: 11px; font-weight: 700; color: #7C3AED;
  background: #F5F3FF; padding: 2px 8px; border-radius: 10px;
  margin-right: 8px; vertical-align: middle;
}
.evidence-title { font-size: 15px; font-weight: 600; color: #1E293B; }
.evidence-score { font-size: 22px; font-weight: 800; color: #7C3AED; flex-shrink: 0; }

.evidence-source-info {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;
}
.evidence-tag {
  font-size: 12px; color: #64748B; background: #F8FAFC;
  padding: 2px 10px; border-radius: 20px; border: 1px solid #E2E8F0;
}

.evidence-snippets { margin-top: 12px; }
.snippets-title {
  font-size: 12px; font-weight: 700; color: #64748B;
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.snippet-pair {
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;
  padding: 12px; margin-bottom: 8px;
}
.snippet-row {
  display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start;
}
.snippet-label {
  font-size: 11px; font-weight: 700; padding: 2px 8px;
  border-radius: 4px; flex-shrink: 0; margin-top: 2px;
}
.snippet-query  .snippet-label { background: #DBEAFE; color: #1D4ED8; }
.snippet-target .snippet-label { background: #FCE7F3; color: #9D174D; }
.snippet-text { font-size: 13px; color: #374151; line-height: 1.5; font-style: italic; }
.snippet-score {
  display: flex; align-items: center; gap: 8px; margin-top: 6px;
}
.snippet-score-bar {
  height: 4px; border-radius: 2px; display: block; min-width: 4px; max-width: 100%;
}
.snippet-score-text { font-size: 11px; color: #94A3B8; }
.no-snippet { font-size: 13px; color: #94A3B8; font-style: italic; padding: 8px 0; }
</style>
