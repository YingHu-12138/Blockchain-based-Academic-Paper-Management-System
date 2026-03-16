import { create, type IPFSHTTPClient } from 'ipfs-http-client'

// 错误处理辅助函数
function getErrorMessage(error: unknown, defaultMessage: string): string {
  return error instanceof Error ? error.message : defaultMessage
}

class IPFSService {
  private client: IPFSHTTPClient | null = null

  constructor() {
    try {
      this.client = create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        apiPath: '/api/v0'
      })
    } catch (error) {
      console.error(getErrorMessage(error, 'IPFS initialization failed'))
    }
  }

  async uploadFile(file: File): Promise<string> {
    if (!this.client) throw new Error('IPFS client not initialized')
    
    try {
      const added = await this.client.add(file)
      return added.path
    } catch (error) {
      throw new Error(getErrorMessage(error, 'IPFS上传失败'))
    }
  }

  async getFile(cid: string): Promise<string> {
    if (!this.client) throw new Error('IPFS client not initialized')
    
    try {
      const stream = this.client.cat(cid)
      let data = ''
      for await (const chunk of stream) {
        data += new TextDecoder().decode(chunk)
      }
      return data
    } catch (error) {
      throw new Error(getErrorMessage(error, 'IPFS获取失败'))
    }
  }
}

export default new IPFSService()