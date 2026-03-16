<template>
  <header class="header">
    <!-- Logo -->
    <div class="header-logo" @click="$router.push('/')">
      <div class="logo-icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="url(#grad)"/>
          <path d="M8 14h3l2-4 2 8 2-6 2 2h3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
              <stop offset="0%" stop-color="#2563EB"/>
              <stop offset="100%" stop-color="#059669"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="logo-text">科研确权平台</span>
    </div>

    <!-- Navigation -->
    <nav class="header-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-link"
        :class="{ active: $route.path === item.path }"
      >
        <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
        {{ item.label }}
      </router-link>
    </nav>

    <!-- Wallet -->
    <div class="header-right">
      <WalletConnect />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import WalletConnect from './WalletConnect.vue'
import { House, Upload, CircleCheck, Search, User } from '@element-plus/icons-vue'

const $route = useRoute()

const navItems = [
  { path: '/', label: '首页', icon: House },
  { path: '/upload', label: '成果上传', icon: Upload },
  { path: '/verify', label: '权属验证', icon: CircleCheck },
  { path: '/check', label: '查重检测', icon: Search },
  { path: '/profile', label: '个人中心', icon: User },
]
</script>

<style scoped>
.header {
  height: 64px;
  background: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 0;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-shrink: 0;
  text-decoration: none;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  background: linear-gradient(135deg, #2563EB 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.3px;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748B;
  text-decoration: none;
  transition: all 0.2s ease;
}
.nav-link:hover {
  background: #EFF6FF;
  color: #2563EB;
}
.nav-link.active {
  background: linear-gradient(135deg, #EFF6FF 0%, #ECFDF5 100%);
  color: #2563EB;
  font-weight: 600;
}
.nav-link.active .nav-icon {
  color: #2563EB;
}

.nav-icon {
  font-size: 15px;
}

.header-right {
  flex-shrink: 0;
}
</style>
