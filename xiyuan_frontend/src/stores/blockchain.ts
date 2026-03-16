import { defineStore } from 'pinia'
import { ethers } from 'ethers'  // v5统一导入
import { create, type IPFSHTTPClient } from 'ipfs-http-client'

// 扩展 Window
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

interface BlockchainState {
  provider: ethers.providers.Web3Provider | null  // v5: Web3Provider
  signer: ethers.Signer | null  // v5通用Signer
  contract: ethers.Contract | null
  userAddress: string
  isConnected: boolean
  ipfs: IPFSHTTPClient | null
}

interface ResearchFormData {
  title: string
  type: string
  abstract: string
  encryptSensitive: boolean
  encryptFullText: boolean
}

interface UploadResult {
  ipfsHash: string
  txHash: string
}

type ContractMethod = (...args: unknown[]) => Promise<unknown>

export const useBlockchainStore = defineStore('blockchain', {
  state: (): BlockchainState => ({
    provider: null,
    signer: null,
    contract: null,
    userAddress: '',
    isConnected: false,
    ipfs: null
  }),

  actions: {
    async initIPFS(): Promise<void> {
      try {
        // 优先本地IPFS Desktop
        this.ipfs = create({
          host: 'localhost',
          port: 5001,
          protocol: 'http'
        })
        console.log('IPFS Desktop initialized (localhost:5001)')
      } catch (error) {
        console.warn('本地IPFS失败，fallback Infura')
        try {
          // Infura fallback (如果有key)
          this.ipfs = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            apiPath: '/api/v0',
            headers: {
              authorization: `Basic ${btoa(process.env.VITE_IPFS_PROJECT_ID + ':' + process.env.VITE_IPFS_SECRET || '')}`
            }
          })
          console.log('IPFS Infura initialized')
        } catch (infuraError) {
          console.error('IPFS初始化失败:', infuraError)
        }
      }
    },

    async connectWallet(): Promise<boolean> {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          // v5: Web3Provider
          this.provider = new ethers.providers.Web3Provider(window.ethereum)
          await window.ethereum.request({ method: 'eth_requestAccounts' })
          
          if (!this.provider) {
            throw new Error('Provider is null')
          }
          
          this.signer = this.provider.getSigner()
          this.userAddress = await this.signer.getAddress()
          this.isConnected = true
          
          this.initContract()
          await this.initIPFS()
          
          console.log('Wallet connected:', this.userAddress)
          return true
        } catch (error) {
          console.error('Wallet connection failed:', error)
          return false
        }
      } else {
        alert('请安装 MetaMask 钱包!')
        return false
      }
    },

    initContract(): void {
      const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'  // 替换实际地址
      
      // 您的ResearchDeposit.sol ABI (完整)
      const contractABI = [
        "event ResearchDeposited(string indexed researchId, string title, string authorId, uint256 timestamp)",
        "function depositResearch(string calldata researchId, string calldata title, string calldata authorId, string calldata ipfsHash, bytes32 contentHash) external",
        "function getResearch(string calldata researchId) external view returns (string memory title, string memory authorId, string memory ipfsHash, bytes32 contentHash, uint256 timestamp)",
        "function getAllResearchIds() external view returns (string[] memory)",
        "function getResearchCount() external view returns (uint256)"
      ]
      
      if (contractAddress && contractABI.length > 0 && this.signer) {
        this.contract = new ethers.Contract(contractAddress, contractABI, this.signer)
        console.log('Contract initialized')
      }
    },

    async uploadResearch(formData: ResearchFormData, file: File): Promise<UploadResult> {
      if (!this.isConnected) {
        throw new Error('请先连接钱包')
      }

      if (!this.ipfs) {
        throw new Error('IPFS 未初始化')
      }

      try {
        const fileAdded = await this.ipfs.add(file)
        const ipfsHash = fileAdded.path
        console.log('File uploaded to IPFS:', ipfsHash)

        if (this.contract) {
          // v5: crypto哈希 (需import crypto)
          const crypto = require('crypto')
          const contentHash = ethers.utils.hexZeroPad(`0x${crypto.createHash('sha256').update(file).digest('hex')}`, 32)
          const researchId = `research_${Date.now()}`

          const depositResearchMethod = this.contract['depositResearch'] as ContractMethod
          
          if (typeof depositResearchMethod === 'function') {
            const tx = await depositResearchMethod(
              researchId,
              formData.title,
              this.userAddress,  // authorId = 钱包
              ipfsHash,
              contentHash
            )  // v5: tx是Promise<ContractTransaction>
            
            const receipt = await tx.wait()
            
            if (!receipt) {
              throw new Error('Transaction receipt is null')
            }
            
            return {
              ipfsHash,
              txHash: receipt.transactionHash
            }
          } else {
            throw new Error('depositResearch method not found on contract')
          }
        } else {
          // 模拟
          return {
            ipfsHash,
            txHash: '0x模拟交易哈希（合约未部署）'
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`上传失败: ${error.message}`)
        } else {
          throw new Error('上传失败: 未知错误')
        }
      }
    },

    // safeContractCall/callContractMethod (不变)
    async safeContractCall<T>(methodName: string, ...args: unknown[]): Promise<T> {
      if (!this.contract) throw new Error('Contract not initialized')
      const method = this.contract[methodName] as ContractMethod
      if (typeof method !== 'function') throw new Error(`Method ${methodName} not found`)
      return method(...args) as Promise<T>
    },

    async callContractMethod(methodName: string, ...args: unknown[]): Promise<unknown> {
      if (!this.contract) throw new Error('Contract not initialized')
      const method = this.contract[methodName] as ContractMethod
      if (typeof method !== 'function') throw new Error(`Method ${methodName} not found`)
      return method(...args)
    }
  }
})