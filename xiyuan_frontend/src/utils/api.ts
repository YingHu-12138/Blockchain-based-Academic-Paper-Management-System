import axios from 'axios'

export const BACKEND = 'http://localhost:3000'
export const BASE = `${BACKEND}/api/research`

// ── Types ─────────────────────────────────────────────────────────

export interface Creator {
  creatorId: string         // 学号 / 工号
  walletAddress: string
  contributionShare: number // 基点：10000 = 100%
  name?: string
}

export interface Research {
  researchId: string
  title: string
  authorId: string
  type: string
  abstract: string
  keywords: string
  fileUrl: string
  ipfsHash: string
  contentHash: string
  transactionHash: string
  isAnonymous: boolean
  timestamp: string
  metadata: Record<string, unknown>
  // New fields
  creators?: Creator[]
  isEncrypted?: boolean
  trustedTimestamp?: string
  trustedTimestampHash?: string
  trustedTimestampTime?: string
  trustedTimestampSrc?: string
  // Version management
  versionGroup?: string
  version?: number
  isLatest?: boolean
  previousVersionId?: string
  changeNote?: string
}

export interface VersionHistory {
  versionGroup: string
  total: number
  versions: Research[]
}

export interface PagedResult<T> {
  results: T[]
  total: number
  page: number
  limit: number
}

export interface SystemStats {
  total: number
  anonymous: number
  named: number
  byType: Record<string, number>
  recent: Research[]
}

// ── API calls ─────────────────────────────────────────────────────
export const researchApi = {
  getByAuthor: (address: string, page = 1, limit = 100, includeOld = false) =>
    axios.get<PagedResult<Research>>(`${BASE}/author/${address}`, { params: { page, limit, includeOld: includeOld || undefined } }),

  getStats: () =>
    axios.get<SystemStats>(`${BASE}/stats`),

  getList: (params: { page?: number; limit?: number; type?: string; isAnonymous?: string; includeOld?: boolean }) =>
    axios.get<PagedResult<Research>>(`${BASE}/list`, { params }),

  getByHash: (hash: string) =>
    axios.get(`${BASE}/hash/${hash}`),

  getById: (researchId: string) =>
    axios.get(`${BASE}/research/${researchId}`),

  getVersions: (versionGroupId: string) =>
    axios.get<VersionHistory>(`${BASE}/versions/${versionGroupId}`),

  uploadNewVersion: (formData: FormData) =>
    axios.post(`${BASE}/update-version`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    }),

  initContract: (contractAddress: string) =>
    axios.post(`${BACKEND}/api/init-contract`, { contractAddress }),

  checkHealth: () =>
    axios.get(`${BACKEND}/`, { timeout: 3000 }),
}

// ── Download helper ───────────────────────────────────────────────
export const IPFS_GATEWAY = 'http://localhost:8081'

export function isLocalFile(ipfsHash: string | undefined): boolean {
  return !ipfsHash || ipfsHash.startsWith('local:') || ipfsHash.startsWith('local_')
}

export function getDownloadUrl(research: Research): string {
  const { ipfsHash, fileUrl } = research
  if (isLocalFile(ipfsHash)) {
    if (fileUrl && fileUrl.startsWith('/uploads/')) return `${BACKEND}${fileUrl}`
    // Legacy local_ format: strip prefix to get filename
    const filename = ipfsHash?.replace('local_', '') || fileUrl.replace('/uploads/', '')
    return `${BACKEND}/uploads/${filename}`
  }
  return `${IPFS_GATEWAY}/ipfs/${ipfsHash}`
}

// ── Formatting helpers ────────────────────────────────────────────
export const TYPE_META: Record<string, { label: string; color: string; bg: string; tag: string }> = {
  paper:           { label: '学术论文',     color: '#2563EB', bg: '#EFF6FF', tag: 'primary' },
  code:            { label: '代码仓库',     color: '#059669', bg: '#F0FDF4', tag: 'success' },
  code_repo:       { label: '代码仓库',     color: '#059669', bg: '#F0FDF4', tag: 'success' },
  data:            { label: '实验数据',     color: '#0891B2', bg: '#F0F9FF', tag: 'info' },
  experimental_data: { label: '实验数据',   color: '#0891B2', bg: '#F0F9FF', tag: 'info' },
  patent:          { label: '专利文档',     color: '#7C3AED', bg: '#F5F3FF', tag: 'warning' },
  project:         { label: '科研项目',     color: '#D97706', bg: '#FFF7ED', tag: 'warning' },
  project_report:  { label: '项目报告',     color: '#D97706', bg: '#FFF7ED', tag: 'warning' },
  design:          { label: '设计图纸',     color: '#DB2777', bg: '#FDF2F8', tag: 'danger' },
  design_drawing:  { label: '设计图纸',     color: '#DB2777', bg: '#FDF2F8', tag: 'danger' },
  unknown:         { label: '其他',         color: '#64748B', bg: '#F8FAFC', tag: 'info' },
}

export function getTypeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.unknown
}

export function formatDate(ts: string | Date | number | undefined): string {
  if (!ts) return '—'
  return new Date(ts as string).toLocaleString('zh-CN', { hour12: false })
}

/** 贡献比例基点 → 百分比字符串（如 3333 → "33.33%"） */
export function formatShare(share: number): string {
  return `${(share / 100).toFixed(2)}%`
}
