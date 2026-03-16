import { ethers } from 'ethers'

export class BlockchainUtils {
  static async getNetworkInfo(provider: ethers.BrowserProvider): Promise<{name: string, chainId: number}> {
    const network = await provider.getNetwork()
    return {
      name: network.name,
      chainId: Number(network.chainId)
    }
  }

  static formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  static validateEthereumAddress(address: string): boolean {
    return ethers.isAddress(address)
  }
}