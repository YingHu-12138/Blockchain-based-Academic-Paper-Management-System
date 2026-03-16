/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// 环境变量类型定义（可选）
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BLOCKCHAIN_NETWORK?: string
  // 添加其他环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}