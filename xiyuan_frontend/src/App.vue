<template>
  <div id="app">
    <el-container class="app-layout">
      <el-header class="app-header-wrap" height="64px">
        <HeaderComponent />
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import HeaderComponent from '@/components/AppHeader.vue'
</script>

<style>
:root {
  --color-primary: #2563EB;
  --color-primary-light: #3B82F6;
  --color-primary-dark: #1D4ED8;
  --color-green: #059669;
  --color-green-light: #10B981;
  --color-teal: #0891B2;
  --color-teal-light: #0EA5E9;
  --color-bg: #F0F5FF;
  --color-card: #FFFFFF;
  --color-text: #1E293B;
  --color-text-2: #64748B;
  --color-border: #E2E8F0;
  --radius-card: 14px;
  --shadow-card: 0 2px 16px 0 rgba(37,99,235,0.08);
  --shadow-card-hover: 0 8px 32px 0 rgba(37,99,235,0.15);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

#app { min-height: 100vh; }

.app-layout { min-height: 100vh; }

.app-header-wrap {
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 0 var(--color-border), 0 2px 12px rgba(37,99,235,0.06);
}

.app-main {
  padding: 0;
  background: var(--color-bg);
  min-height: calc(100vh - 64px);
}

/* Global card overrides */
.el-card {
  border-radius: var(--radius-card) !important;
  border: 1px solid var(--color-border) !important;
  box-shadow: var(--shadow-card) !important;
}
.el-card:hover {
  box-shadow: var(--shadow-card-hover) !important;
  transition: box-shadow 0.25s ease;
}

/* Global button overrides */
.el-button--primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%) !important;
  border-color: var(--color-primary) !important;
  font-weight: 500;
}
.el-button--primary:hover {
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%) !important;
}
.el-button--success {
  background: linear-gradient(135deg, var(--color-green) 0%, var(--color-green-light) 100%) !important;
  border-color: var(--color-green) !important;
}

/* Global tab style */
.el-tabs__item.is-active {
  color: var(--color-primary) !important;
  font-weight: 600;
}
.el-tabs__active-bar {
  background-color: var(--color-primary) !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-primary-light); }
</style>
