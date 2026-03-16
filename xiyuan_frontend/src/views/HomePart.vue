<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-blob hero-blob-1" />
        <div class="hero-blob hero-blob-2" />
        <div class="hero-blob hero-blob-3" />
      </div>
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot" />
          基于区块链 · 去中心化 · 零知识证明
        </div>
        <h1 class="hero-title">
          高校科研成果
          <span class="title-highlight">确权与保护</span>
          平台
        </h1>
        <p class="hero-subtitle">
          利用区块链不可篡改性与 IPFS 分布式存储，为每一份科研成果提供<br>
          可信时间戳、链上存证与权属验证服务
        </p>
        <div class="hero-actions">
          <el-button class="btn-hero-primary" size="large" @click="$router.push('/upload')">
            <el-icon><upload /></el-icon>
            开始确权上传
          </el-button>
          <el-button class="btn-hero-outline" size="large" @click="$router.push('/verify')">
            <el-icon><circle-check /></el-icon>
            验证成果权属
          </el-button>
        </div>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-num">100%</span>
            <span class="stat-label">链上存证</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-num">ZKP</span>
            <span class="stat-label">匿名保护</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-num">TF-IDF</span>
            <span class="stat-label">智能查重</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="section-header">
        <h2 class="section-title">核心功能</h2>
        <p class="section-sub">为科研工作者提供全流程的成果保护方案</p>
      </div>
      <el-row :gutter="24">
        <el-col :xs="24" :sm="12" :lg="6" v-for="f in features" :key="f.title">
          <div class="feature-card" :style="{ '--accent': f.color }">
            <div class="feature-icon-wrap" :style="{ background: f.bg }">
              <el-icon class="feature-icon" :style="{ color: f.color }">
                <component :is="f.icon" />
              </el-icon>
            </div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.desc }}</p>
            <el-button link :style="{ color: f.color }" @click="$router.push(f.route)">
              立即使用 →
            </el-button>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- How it works -->
    <section class="how-section">
      <div class="section-header">
        <h2 class="section-title">工作流程</h2>
        <p class="section-sub">三步完成成果上链，全程透明可信</p>
      </div>
      <div class="steps">
        <div class="step" v-for="(s, i) in steps" :key="i">
          <div class="step-num" :style="{ background: s.color }">{{ i + 1 }}</div>
          <div class="step-connector" v-if="i < steps.length - 1" />
          <div class="step-body">
            <div class="step-icon-wrap" :style="{ background: s.bg }">
              <el-icon :style="{ color: s.color, fontSize: '22px' }"><component :is="s.icon" /></el-icon>
            </div>
            <h4 class="step-title">{{ s.title }}</h4>
            <p class="step-desc">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Banner -->
    <section class="tech-banner">
      <div class="tech-content">
        <h3>技术栈支撑</h3>
        <div class="tech-chips">
          <span class="chip chip-blue">Ethereum</span>
          <span class="chip chip-green">IPFS</span>
          <span class="chip chip-teal">ZKP Groth16</span>
          <span class="chip chip-indigo">MongoDB</span>
          <span class="chip chip-cyan">TF-IDF</span>
          <span class="chip chip-emerald">SHA-256</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Upload, CircleCheck, Search, Lock,
  Document, DataLine, Files, Key
} from '@element-plus/icons-vue'

const $router = useRouter()

const features = [
  {
    icon: Upload,
    title: '快速确权',
    desc: '区块链时间戳即时存证，支持实名与匿名（ZKP）双模式确权，全程不可篡改。',
    color: '#2563EB',
    bg: '#EFF6FF',
    route: '/upload'
  },
  {
    icon: DataLine,
    title: '安全存储',
    desc: 'IPFS 分布式存储结合链上哈希锚定，确保文件永久可寻址、防篡改。',
    color: '#059669',
    bg: '#F0FDF4',
    route: '/upload'
  },
  {
    icon: Search,
    title: '智能查重',
    desc: 'SHA-256 精确哈希比对 + TF-IDF 余弦相似度全文分析，识别改写抄袭。',
    color: '#0891B2',
    bg: '#F0F9FF',
    route: '/check'
  },
  {
    icon: CircleCheck,
    title: '权属验证',
    desc: '通过 IPFS 哈希或交易哈希即时查询链上存证记录，支持批量验证。',
    color: '#7C3AED',
    bg: '#F5F3FF',
    route: '/verify'
  }
]

const steps = [
  {
    icon: Upload,
    title: '上传成果',
    desc: '选择文件并填写元数据，选择实名或匿名模式',
    color: '#2563EB',
    bg: '#EFF6FF'
  },
  {
    icon: Key,
    title: '生成证明',
    desc: '系统计算 SHA-256 哈希，匿名模式生成 ZKP 证明',
    color: '#0891B2',
    bg: '#F0F9FF'
  },
  {
    icon: Files,
    title: '链上存证',
    desc: '智能合约写入区块链，IPFS 存储文件，永久留存',
    color: '#059669',
    bg: '#F0FDF4'
  }
]
</script>

<style scoped>
.home-page { padding-bottom: 60px; }

/* Hero */
.hero {
  position: relative;
  overflow: hidden;
  min-height: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 50%, #F0F9FF 100%);
  padding: 60px 40px;
}

.hero-bg { position: absolute; inset: 0; pointer-events: none; }

.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
}
.hero-blob-1 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #BFDBFE, transparent);
  top: -100px; left: -80px;
}
.hero-blob-2 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, #A7F3D0, transparent);
  bottom: -80px; right: 10%;
}
.hero-blob-3 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, #BAE6FD, transparent);
  top: 30%; right: -60px;
}

.hero-content {
  position: relative;
  text-align: center;
  max-width: 780px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  color: #64748B;
  font-weight: 500;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(37,99,235,0.08);
}

.badge-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563EB, #059669);
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%,100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

.hero-title {
  font-size: 44px;
  font-weight: 800;
  color: #1E293B;
  line-height: 1.2;
  margin: 0 0 16px;
  letter-spacing: -0.5px;
}
.title-highlight {
  background: linear-gradient(135deg, #2563EB 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 16px;
  color: #64748B;
  line-height: 1.8;
  margin: 0 0 32px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
}

.btn-hero-primary {
  background: linear-gradient(135deg, #2563EB 0%, #059669 100%) !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  height: 48px !important;
  padding: 0 28px !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 16px rgba(37,99,235,0.3) !important;
}
.btn-hero-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(37,99,235,0.4) !important;
}

.btn-hero-outline {
  background: white !important;
  border: 2px solid #E2E8F0 !important;
  color: #1E293B !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  height: 48px !important;
  padding: 0 28px !important;
  border-radius: 10px !important;
}
.btn-hero-outline:hover {
  border-color: #2563EB !important;
  color: #2563EB !important;
}

.hero-stats {
  display: inline-flex;
  align-items: center;
  gap: 24px;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 16px 32px;
  box-shadow: 0 2px 12px rgba(37,99,235,0.06);
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { font-size: 20px; font-weight: 800; color: #2563EB; }
.stat-label { font-size: 12px; color: #94A3B8; }
.stat-divider { width: 1px; height: 32px; background: #E2E8F0; }

/* Features */
.features { padding: 64px 40px 40px; }

.section-header { text-align: center; margin-bottom: 40px; }
.section-title {
  font-size: 28px; font-weight: 700; color: #1E293B; margin: 0 0 8px;
}
.section-sub { font-size: 15px; color: #64748B; margin: 0; }

.feature-card {
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  padding: 28px 24px;
  margin-bottom: 24px;
  transition: all 0.25s ease;
  cursor: default;
  border-top: 3px solid var(--accent);
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(37,99,235,0.12);
  border-color: var(--accent);
}

.feature-icon-wrap {
  width: 52px; height: 52px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.feature-icon { font-size: 24px; }
.feature-title { font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 8px; }
.feature-desc { font-size: 14px; color: #64748B; line-height: 1.6; margin: 0 0 16px; }

/* How it works */
.how-section {
  padding: 40px 40px;
  background: white;
  margin: 0 40px;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 2px 16px rgba(37,99,235,0.06);
}

.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  position: relative;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step-num {
  width: 32px; height: 32px;
  border-radius: 50%;
  color: white;
  font-size: 14px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  z-index: 1;
  margin-bottom: 20px;
}

.step-connector {
  position: absolute;
  top: 16px;
  left: calc(50% + 16px);
  right: calc(-50% + 16px);
  height: 2px;
  background: linear-gradient(90deg, #E2E8F0, #BFDBFE);
}

.step-body { text-align: center; padding: 0 16px; }
.step-icon-wrap {
  width: 64px; height: 64px;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
}
.step-title { font-size: 16px; font-weight: 600; color: #1E293B; margin: 0 0 6px; }
.step-desc { font-size: 13px; color: #64748B; line-height: 1.5; margin: 0; }

/* Tech banner */
.tech-banner {
  margin: 40px 40px 0;
  background: linear-gradient(135deg, #1E293B 0%, #1D4ED8 100%);
  border-radius: 16px;
  padding: 32px 40px;
  text-align: center;
}
.tech-content h3 { color: white; font-size: 18px; margin: 0 0 20px; }
.tech-chips { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.chip {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}
.chip-blue    { background: rgba(59,130,246,0.3); color: #93C5FD; border: 1px solid rgba(59,130,246,0.4); }
.chip-green   { background: rgba(16,185,129,0.3); color: #6EE7B7; border: 1px solid rgba(16,185,129,0.4); }
.chip-teal    { background: rgba(8,145,178,0.3);  color: #67E8F9; border: 1px solid rgba(8,145,178,0.4); }
.chip-indigo  { background: rgba(99,102,241,0.3); color: #A5B4FC; border: 1px solid rgba(99,102,241,0.4); }
.chip-cyan    { background: rgba(6,182,212,0.3);  color: #67E8F9; border: 1px solid rgba(6,182,212,0.4); }
.chip-emerald { background: rgba(5,150,105,0.3);  color: #6EE7B7; border: 1px solid rgba(5,150,105,0.4); }
</style>
