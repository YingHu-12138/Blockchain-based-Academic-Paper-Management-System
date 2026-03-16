<template>
  <div class="page-wrapper">
    <!-- Page Header -->
    <div class="page-hero">
      <div class="page-hero-content">
        <div class="page-badge">
          <el-icon><upload /></el-icon>
          成果存证
        </div>
        <h1 class="page-title">科研成果确权上传</h1>
        <p class="page-sub">支持实名确权与 ZKP 匿名确权，SHA-256 数字指纹 + 可信时间戳，成果数据永久上链</p>
      </div>
    </div>

    <div class="page-body">
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-position="top"
        class="upload-form"
      >
        <el-row :gutter="24">
          <!-- Left column -->
          <el-col :lg="16" :md="24">
            <!-- Basic Info Card -->
            <div class="form-card">
              <div class="form-card-header">
                <el-icon class="card-icon" style="color:#2563EB"><document /></el-icon>
                <span>基本信息</span>
              </div>
              <el-row :gutter="16">
                <el-col :span="16">
                  <el-form-item label="成果标题" prop="title">
                    <el-input
                      v-model="form.title"
                      placeholder="请输入科研成果标题..."
                      maxlength="100"
                      show-word-limit
                      class="styled-input"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="成果类型" prop="type">
                    <el-select v-model="form.type" placeholder="请选择" style="width:100%">
                      <el-option label="📄 学术论文" value="paper" />
                      <el-option label="💻 代码仓库快照" value="code_repo" />
                      <el-option label="🔬 实验数据" value="experimental_data" />
                      <el-option label="📋 项目报告" value="project_report" />
                      <el-option label="🔏 专利文档" value="patent" />
                      <el-option label="📐 设计图纸" value="design_drawing" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="成果摘要" prop="abstract">
                <el-input
                  v-model="form.abstract"
                  type="textarea"
                  :rows="4"
                  placeholder="简述研究背景、方法与主要创新点..."
                  class="styled-input"
                />
              </el-form-item>
              <el-form-item label="关键词">
                <el-input
                  v-model="form.keywords"
                  placeholder="区块链  零知识证明  分布式存储  （空格分隔）"
                  class="styled-input"
                />
              </el-form-item>
            </div>

            <!-- Creator Info Card -->
            <div class="form-card creator-card">
              <div class="form-card-header">
                <el-icon class="card-icon" style="color:#059669"><user /></el-icon>
                <span>创作者信息绑定</span>
                <el-tag size="small" type="success" style="margin-left:auto">智能合约记录</el-tag>
              </div>

              <!-- Individual / Team Toggle -->
              <div class="creator-mode-row">
                <div
                  class="creator-mode-btn"
                  :class="{ active: !form.isTeam }"
                  @click="form.isTeam = false"
                >
                  <el-icon><user /></el-icon> 个人创作
                </div>
                <div
                  class="creator-mode-btn"
                  :class="{ active: form.isTeam }"
                  @click="setTeamMode"
                >
                  <el-icon><avatar /></el-icon> 团队协作
                </div>
              </div>

              <!-- Individual mode -->
              <el-form-item v-if="!form.isTeam" label="学号 / 工号" prop="creatorId">
                <el-input
                  v-model="form.creatorId"
                  placeholder="请输入您的学号或工号（将绑定至区块链）"
                  class="styled-input"
                  prefix-icon="Postcard"
                />
                <div class="field-tip">该信息将与您的钱包地址一同上链，作为成果归属的可信凭证</div>
              </el-form-item>

              <!-- Team mode -->
              <div v-else>
                <div
                  v-for="(member, idx) in form.creators"
                  :key="idx"
                  class="team-member-row"
                >
                  <div class="member-index">{{ idx + 1 }}</div>
                  <el-input
                    v-model="member.name"
                    placeholder="姓名"
                    class="styled-input member-name"
                  />
                  <el-input
                    v-model="member.creatorId"
                    placeholder="学号/工号"
                    class="styled-input member-id"
                  />
                  <el-input-number
                    v-model="member.sharePercent"
                    :min="1"
                    :max="99"
                    :precision="0"
                    controls-position="right"
                    class="member-share"
                    @change="autoBalanceLastShare(idx)"
                  />
                  <span class="share-pct">%</span>
                  <el-button
                    v-if="form.creators.length > 2"
                    link
                    type="danger"
                    @click="removeMember(idx)"
                    style="margin-left:4px"
                  >
                    <el-icon><delete /></el-icon>
                  </el-button>
                </div>

                <div class="share-sum-row">
                  <span>贡献比例合计：</span>
                  <span :class="totalShareValid ? 'share-ok' : 'share-err'">
                    {{ totalSharePercent }}%
                    {{ totalShareValid ? '✓' : '（需恰好等于 100%）' }}
                  </span>
                </div>

                <el-button
                  class="add-member-btn"
                  @click="addMember"
                  :disabled="form.creators.length >= 8"
                >
                  <el-icon><plus /></el-icon> 添加团队成员
                </el-button>
              </div>
            </div>

            <!-- File Upload Card -->
            <div class="form-card">
              <div class="form-card-header">
                <el-icon class="card-icon" style="color:#059669"><folder-opened /></el-icon>
                <span>上传文件</span>
              </div>
              <el-form-item prop="file">
                <FileUpload
                  ref="fileUploadRef"
                  @fileSelected="handleFileSelected"
                  @fileRemoved="handleFileRemoved"
                />
              </el-form-item>

              <!-- Encryption toggle -->
              <div class="encrypt-toggle">
                <el-switch
                  v-model="form.encrypt"
                  active-color="#059669"
                  inactive-color="#CBD5E1"
                />
                <div class="encrypt-label">
                  <span class="encrypt-title">
                    <el-icon style="color:#059669"><lock /></el-icon>
                    启用 AES-256 文件加密
                  </span>
                  <span class="encrypt-hint">
                    源文件加密存储，仅 SHA-256 指纹上链。上传后请妥善保管返回的密钥。
                  </span>
                </div>
              </div>
            </div>
          </el-col>

          <!-- Right column -->
          <el-col :lg="8" :md="24">
            <!-- Privacy Mode Card -->
            <div class="form-card privacy-card">
              <div class="form-card-header">
                <el-icon class="card-icon" style="color:#7C3AED"><lock /></el-icon>
                <span>存证模式</span>
                <el-button link style="margin-left:auto;color:#64748B" @click="showHelp=true">
                  <el-icon><question-filled /></el-icon>
                </el-button>
              </div>

              <el-form-item label="">
                <div class="mode-cards">
                  <div
                    class="mode-option"
                    :class="{ selected: !form.isAnonymous }"
                    @click="form.isAnonymous = false; handleModeChange()"
                  >
                    <el-icon class="mode-icon" style="color:#2563EB"><user /></el-icon>
                    <div>
                      <div class="mode-name">实名确权</div>
                      <div class="mode-hint">公开您的区块链地址</div>
                    </div>
                  </div>
                  <div
                    class="mode-option"
                    :class="{ selected: form.isAnonymous }"
                    @click="form.isAnonymous = true"
                  >
                    <el-icon class="mode-icon" style="color:#7C3AED"><lock /></el-icon>
                    <div>
                      <div class="mode-name">匿名确权 <el-tag size="small" type="warning">ZKP</el-tag></div>
                      <div class="mode-hint">零知识证明，隐藏身份</div>
                    </div>
                  </div>
                </div>
              </el-form-item>

              <el-transition name="el-zoom-in-top">
                <el-form-item
                  v-if="form.isAnonymous"
                  label="身份秘密 (Secret)"
                  prop="secret"
                >
                  <el-input
                    v-model="form.secret"
                    type="password"
                    show-password
                    placeholder="请输入您的身份秘密值"
                    class="styled-input"
                  />
                  <div class="secret-tip">
                    <el-icon><warning /></el-icon>
                    秘密仅存于本地，丢失将无法证明归属
                  </div>
                </el-form-item>
              </el-transition>
            </div>

            <!-- Technical Features Card -->
            <div class="form-card tech-card">
              <div class="form-card-header">
                <el-icon class="card-icon" style="color:#0891B2"><cpu /></el-icon>
                <span>技术保障</span>
              </div>
              <div class="tech-list">
                <div class="tech-item">
                  <div class="tech-dot" style="background:#2563EB"></div>
                  <div>
                    <div class="tech-name">SHA-256 数字指纹</div>
                    <div class="tech-desc">自动计算，写入区块链</div>
                  </div>
                </div>
                <div class="tech-item">
                  <div class="tech-dot" style="background:#059669"></div>
                  <div>
                    <div class="tech-name">AES-256 文件加密</div>
                    <div class="tech-desc">源文件本地加密，指纹上链</div>
                  </div>
                </div>
                <div class="tech-item">
                  <div class="tech-dot" style="background:#7C3AED"></div>
                  <div>
                    <div class="tech-name">可信时间戳 (RFC 3161)</div>
                    <div class="tech-desc">权威时源，锁定创作时间</div>
                  </div>
                </div>
                <div class="tech-item">
                  <div class="tech-dot" style="background:#D97706"></div>
                  <div>
                    <div class="tech-name">团队贡献比例</div>
                    <div class="tech-desc">合约记录，不可篡改</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit Card -->
            <div class="form-card submit-card">
              <el-button
                class="submit-btn"
                :loading="loading"
                :disabled="!isConnected || (form.isTeam && !totalShareValid)"
                @click="handleSubmit"
              >
                <el-icon v-if="!loading"><circle-check /></el-icon>
                {{ loading
                  ? (form.isAnonymous ? '正在生成 ZKP 证明...' : '正在上链...')
                  : (isConnected ? '提交确权' : '请先连接钱包') }}
              </el-button>
              <el-button class="reset-btn" :disabled="loading" @click="handleReset">
                重置表单
              </el-button>

              <div class="submit-tips">
                <div class="tip-item">
                  <el-icon style="color:#059669"><circle-check /></el-icon>
                  存证后数据不可篡改
                </div>
                <div class="tip-item">
                  <el-icon style="color:#2563EB"><lock /></el-icon>
                  {{ form.encrypt ? 'AES-256 加密存储' : '文件上传至 IPFS' }}
                </div>
                <div class="tip-item">
                  <el-icon style="color:#7C3AED"><key /></el-icon>
                  可信时间戳永久存证
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- Help Dialog -->
    <el-dialog v-model="showHelp" title="ZKP 匿名确权指南" width="480px" class="help-dialog">
      <div class="help-body">
        <div class="help-item">
          <div class="help-num" style="background:#EFF6FF;color:#2563EB">1</div>
          <div>
            <strong>实名模式</strong>：记录您的钱包地址，所有人可见作者身份，适合公开发表的成果。
          </div>
        </div>
        <div class="help-item">
          <div class="help-num" style="background:#F5F3FF;color:#7C3AED">2</div>
          <div>
            <strong>匿名模式</strong>：利用 <b>Groth16</b> 零知识证明，区块链仅验证证明有效性，不记录您的身份。
          </div>
        </div>
        <div class="help-item">
          <div class="help-num" style="background:#F0FDF4;color:#059669">3</div>
          <div>
            <strong>性能说明</strong>：后端 GPU 负责多项式运算，通常在 1 秒内生成证明。
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="showHelp=false">我知道了</el-button>
      </template>
    </el-dialog>

    <!-- Encryption Key Dialog -->
    <el-dialog
      v-model="showKeyDialog"
      title="🔑 请保存加密密钥"
      width="520px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="key-dialog-body">
        <el-alert type="warning" :closable="false" style="margin-bottom:16px">
          <strong>重要提示：</strong>此密钥仅显示一次，丢失后将无法解密您的文件。请立即复制并妥善保管！
        </el-alert>
        <div class="key-label">AES-256 加密密钥（hex）：</div>
        <el-input
          v-model="uploadResult.encryptionKey"
          type="textarea"
          :rows="3"
          readonly
          class="key-input"
        />
        <div class="key-info">
          <div><span class="key-info-label">交易哈希：</span>{{ uploadResult.transactionHash?.slice(0,30) }}...</div>
          <div><span class="key-info-label">可信时间：</span>{{ uploadResult.trustedTimestamp?.time }}</div>
          <div><span class="key-info-label">时间来源：</span>{{ uploadResult.trustedTimestamp?.source }}</div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="copyKey">复制密钥</el-button>
        <el-button @click="showKeyDialog=false">我已保存，关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
  import {
    QuestionFilled, Upload, Document, FolderOpened, Lock, User, Key, Warning,
    CircleCheck, Avatar, Delete, Plus, Cpu
  } from '@element-plus/icons-vue'
  import { useBlockchainStore } from '@/stores/blockchain'
  import FileUpload from '@/components/FileUpload.vue'
  import axios from 'axios'

  const blockchainStore = useBlockchainStore()
  const loading       = ref(false)
  const showHelp      = ref(false)
  const showKeyDialog = ref(false)
  const formRef       = ref<FormInstance>()
  const fileUploadRef = ref<any>(null)

  interface TeamMember {
    name: string
    creatorId: string
    walletAddress: string
    sharePercent: number
  }

  const form = reactive({
    title:      '',
    type:       'paper',
    abstract:   '',
    keywords:   '',
    file:       null as File | null,
    isAnonymous: false,
    secret:     '',
    // Creator fields
    isTeam:     false,
    creatorId:  '',          // Individual student/employee ID
    creators:   [            // Team members (default 2)
      { name: '', creatorId: '', walletAddress: '', sharePercent: 50 },
      { name: '', creatorId: '', walletAddress: '', sharePercent: 50 }
    ] as TeamMember[],
    // Encryption
    encrypt:    false
  })

  const uploadResult = reactive({
    transactionHash: '',
    encryptionKey:   '',
    trustedTimestamp: null as any
  })

  const rules = {
    title:    [{ required: true, message: '请输入标题', trigger: 'blur' }],
    abstract: [{ required: true, message: '请输入摘要', trigger: 'blur' }],
    secret:   [{ required: true, message: '匿名模式必须填写秘密', trigger: 'blur' }]
  }

  const isConnected = computed(() => blockchainStore.isConnected)

  const totalSharePercent = computed(() =>
    form.creators.reduce((sum, m) => sum + (m.sharePercent || 0), 0)
  )
  const totalShareValid = computed(() => totalSharePercent.value === 100)

  function setTeamMode() {
    form.isTeam = true
    if (form.creators.length < 2) {
      form.creators.push({ name: '', creatorId: '', walletAddress: '', sharePercent: 0 })
    }
  }

  function addMember() {
    form.creators.push({ name: '', creatorId: '', walletAddress: '', sharePercent: 0 })
  }

  function removeMember(idx: number) {
    form.creators.splice(idx, 1)
  }

  function autoBalanceLastShare(changedIdx: number) {
    // Sum all except last member, set last to remainder
    const last = form.creators.length - 1
    if (changedIdx === last) return
    const sumExceptLast = form.creators.slice(0, last).reduce((s, m) => s + (m.sharePercent || 0), 0)
    form.creators[last].sharePercent = Math.max(0, 100 - sumExceptLast)
  }

  const handleFileSelected = (file: File) => { form.file = file }
  const handleFileRemoved  = () => { form.file = null }
  const handleModeChange   = () => { if (!form.isAnonymous) form.secret = '' }

  const handleReset = () => {
    formRef.value?.resetFields()
    form.file     = null
    form.creators = [
      { name: '', creatorId: '', walletAddress: '', sharePercent: 50 },
      { name: '', creatorId: '', walletAddress: '', sharePercent: 50 }
    ]
    fileUploadRef.value?.clearFile()
  }

  async function copyKey() {
    await navigator.clipboard.writeText(uploadResult.encryptionKey)
    ElMessage.success('密钥已复制到剪贴板')
  }

  const handleSubmit = async () => {
    if (!formRef.value) return
    try {
      await formRef.value.validate()
      if (!form.file) return ElMessage.warning('请上传成果文件')

      if (form.isTeam && !totalShareValid.value) {
        return ElMessage.warning(`贡献比例之和必须恰好为 100%（当前: ${totalSharePercent.value}%）`)
      }

      await ElMessageBox.confirm('确认提交确权？存证后数据将不可篡改。', '系统提示')
      loading.value = true

      // ZKP proof (anonymous mode)
      let zkpProofStr = null
      if (form.isAnonymous) {
        const PUBLIC_HASH = "7110303097080024260800444665787206606103183587082596139871399733998958991511"
        try {
          const proofRes = await axios.post('http://localhost:3000/api/research/generate-proof', {
            secret:     form.secret,
            publicHash: PUBLIC_HASH
          })
          zkpProofStr = JSON.stringify(proofRes.data)
        } catch (err: any) {
          throw new Error(`证明生成失败: ${err.response?.data?.detail || '路径错误或秘密不匹配'}`)
        }
      }

      const formData = new FormData()
      formData.append('file',     form.file)
      formData.append('title',    form.title)
      formData.append('type',     form.type)
      formData.append('abstract', form.abstract)
      formData.append('keywords', form.keywords)
      formData.append('authorId', form.isAnonymous ? 'Anonymous' : blockchainStore.userAddress)
      if (zkpProofStr) formData.append('zkpProof', zkpProofStr)
      if (form.encrypt) formData.append('encrypt', '1')

      if (!form.isAnonymous) {
        if (form.isTeam) {
          // Team mode: send creators array
          const creatorsPayload = form.creators.map(m => ({
            name:          m.name,
            creatorId:     m.creatorId,
            walletAddress: m.walletAddress || blockchainStore.userAddress,
            share:         Math.round(m.sharePercent * 100)  // Convert % to basis points
          }))
          formData.append('creators', JSON.stringify(creatorsPayload))
        } else {
          // Individual mode: send creatorId
          formData.append('creatorId', form.creatorId)
        }
      }

      const response = await axios.post('http://localhost:3000/api/research/deposit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Handle encryption key dialog
      if (form.encrypt && response.data.encryptionKey) {
        uploadResult.transactionHash  = response.data.transactionHash
        uploadResult.encryptionKey    = response.data.encryptionKey
        uploadResult.trustedTimestamp = response.data.trustedTimestamp
        showKeyDialog.value = true
      } else {
        const tsInfo = response.data.trustedTimestamp
        ElMessage.success({
          message: `确权成功！时间戳来源: ${tsInfo?.source || '—'}  |  TX: ${response.data.transactionHash.slice(0, 16)}...`,
          duration: 10000,
          showClose: true
        })
      }
      handleReset()
    } catch (error: any) {
      if (error !== 'cancel') ElMessage.error(error.message || '存证失败，请检查后端服务')
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
.page-wrapper { min-height: calc(100vh - 64px); background: #F0F5FF; }

/* Page Hero */
.page-hero {
  background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%);
  border-bottom: 1px solid #E2E8F0;
  padding: 32px 40px 24px;
}
.page-hero-content { max-width: 1200px; margin: 0 auto; }
.page-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE;
  border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600;
  margin-bottom: 12px;
}
.page-title { font-size: 26px; font-weight: 700; color: #1E293B; margin: 0 0 6px; }
.page-sub { font-size: 14px; color: #64748B; margin: 0; }

/* Body */
.page-body { max-width: 1200px; margin: 0 auto; padding: 32px 40px; }

/* Form Cards */
.form-card {
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(37,99,235,0.06);
}
.form-card-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 600; color: #1E293B;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F1F5F9;
}
.card-icon { font-size: 18px; }

/* Inputs */
.styled-input :deep(.el-input__wrapper),
.styled-input :deep(.el-textarea__inner) {
  border-radius: 8px !important;
  border-color: #E2E8F0 !important;
  box-shadow: none !important;
}
.styled-input :deep(.el-input__wrapper:hover),
.styled-input :deep(.el-textarea__inner:hover) { border-color: #93C5FD !important; }
.styled-input :deep(.el-input__wrapper.is-focus),
.styled-input :deep(.el-textarea__inner:focus) {
  border-color: #2563EB !important;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
}

/* Creator Card */
.creator-card { border-top: 3px solid #059669; }
.creator-mode-row {
  display: flex; gap: 10px; margin-bottom: 16px;
}
.creator-mode-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px;
  border: 2px solid #E2E8F0;
  border-radius: 8px; cursor: pointer;
  font-size: 14px; font-weight: 500; color: #64748B;
  transition: all 0.2s;
}
.creator-mode-btn:hover { border-color: #86EFAC; background: #F0FDF4; }
.creator-mode-btn.active { border-color: #059669; background: #F0FDF4; color: #059669; font-weight: 600; }

.field-tip { font-size: 12px; color: #94A3B8; margin-top: 5px; }

/* Team members */
.team-member-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.member-index {
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #2563EB, #059669);
  color: white; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.member-name  { flex: 2; }
.member-id    { flex: 2; }
.member-share { width: 100px !important; flex-shrink: 0; }
.share-pct    { font-size: 14px; color: #475569; flex-shrink: 0; }

.share-sum-row {
  font-size: 13px; color: #475569;
  padding: 8px 0; margin-bottom: 10px;
}
.share-ok  { color: #059669; font-weight: 600; }
.share-err { color: #DC2626; font-weight: 600; }

.add-member-btn {
  border: 1.5px dashed #86EFAC !important;
  color: #059669 !important; background: #F0FDF4 !important;
  border-radius: 8px !important; width: 100%; height: 38px;
}

/* Encryption toggle */
.encrypt-toggle {
  display: flex; align-items: center; gap: 14px;
  background: #F0FDF4; border: 1px solid #BBF7D0;
  border-radius: 10px; padding: 12px 16px;
  margin-top: 8px;
}
.encrypt-label { display: flex; flex-direction: column; gap: 2px; }
.encrypt-title { font-size: 14px; font-weight: 600; color: #065F46; display: flex; align-items: center; gap: 6px; }
.encrypt-hint  { font-size: 12px; color: #64748B; }

/* Privacy Mode */
.privacy-card { border-top: 3px solid #7C3AED; }
.mode-cards { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.mode-option {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border: 2px solid #E2E8F0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-option:hover { border-color: #93C5FD; background: #F8FAFF; }
.mode-option.selected { border-color: #2563EB; background: #EFF6FF; }
.mode-icon { font-size: 22px; flex-shrink: 0; }
.mode-name { font-weight: 600; color: #1E293B; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.mode-hint { font-size: 12px; color: #94A3B8; margin-top: 2px; }

.secret-tip {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #D97706; margin-top: 6px;
}

/* Tech list card */
.tech-card { border-top: 3px solid #0891B2; }
.tech-list { display: flex; flex-direction: column; gap: 12px; }
.tech-item { display: flex; align-items: flex-start; gap: 12px; }
.tech-dot  { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.tech-name { font-size: 13px; font-weight: 600; color: #1E293B; }
.tech-desc { font-size: 12px; color: #94A3B8; margin-top: 2px; }

/* Submit Card */
.submit-card { text-align: center; }
.submit-btn {
  width: 100%; height: 48px;
  background: linear-gradient(135deg, #2563EB 0%, #059669 100%) !important;
  border: none !important; color: white !important;
  font-weight: 700 !important; font-size: 16px !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 16px rgba(37,99,235,0.3) !important;
  margin-bottom: 10px;
}
.submit-btn:hover:not(:disabled) { transform: translateY(-1px); }
.reset-btn {
  width: 100%; height: 40px;
  border-radius: 8px !important;
  margin-bottom: 20px;
}
.submit-tips { text-align: left; }
.tip-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #64748B; padding: 4px 0;
}

/* Help dialog */
.help-body { display: flex; flex-direction: column; gap: 16px; }
.help-item { display: flex; align-items: flex-start; gap: 14px; font-size: 14px; color: #475569; line-height: 1.6; }
.help-num {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; flex-shrink: 0;
}

/* Encryption key dialog */
.key-dialog-body { display: flex; flex-direction: column; gap: 12px; }
.key-label { font-size: 14px; font-weight: 600; color: #1E293B; }
.key-input :deep(.el-textarea__inner) {
  font-family: monospace; font-size: 12px;
  background: #F8FAFC; border-color: #E2E8F0;
}
.key-info { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #64748B; }
.key-info-label { font-weight: 600; color: #475569; }
</style>
