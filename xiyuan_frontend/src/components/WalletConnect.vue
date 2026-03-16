<template>
  <div class="wallet-wrap">
    <el-button
      v-if="!isConnected"
      class="connect-btn"
      @click="connectWallet"
      :loading="connecting"
    >
      <template #icon><el-icon><connection /></el-icon></template>
      连接钱包
    </el-button>
    <div v-else class="wallet-info">
      <div class="wallet-dot" />
      <span class="wallet-addr">{{ shortenedAddress }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { useBlockchainStore } from '@/stores/blockchain'

const blockchainStore = useBlockchainStore()
const connecting = ref(false)

const isConnected = computed(() => blockchainStore.isConnected)
const shortenedAddress = computed(() => {
  const addr = blockchainStore.userAddress
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
})

// 错误处理辅助函数
const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return defaultMessage
}

const connectWallet = async () => {
  connecting.value = true
  try {
    const success = await blockchainStore.connectWallet()
    if (success) ElMessage.success('钱包连接成功！')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '钱包连接失败：未知错误'))
  } finally {
    connecting.value = false
  }
}
</script>

<style scoped>
.wallet-wrap { display: flex; align-items: center; }

.connect-btn {
  background: linear-gradient(135deg, #2563EB, #059669) !important;
  border: none !important;
  color: white !important;
  font-weight: 600;
  padding: 0 20px;
  height: 36px;
  border-radius: 8px;
  font-size: 14px;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 20px;
  padding: 6px 14px;
}

.wallet-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #059669;
  box-shadow: 0 0 0 2px #DCFCE7;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 2px #DCFCE7; }
  50% { box-shadow: 0 0 0 4px #BBF7D0; }
}

.wallet-addr {
  font-size: 13px;
  font-weight: 600;
  color: #059669;
  font-family: monospace;
}
</style>
