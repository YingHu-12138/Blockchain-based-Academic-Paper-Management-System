//const { ethers } = require('ethers');
//const ResearchDepositArtifact = require('../artifacts/ResearchDeposit.json');
//const ResearchDepositABI = ResearchDepositArtifact.abi;
//const ResearchDepositBytecode = ResearchDepositArtifact.bytecode;
//const Research = require('../models/Research');

//class BlockchainService {
//  constructor() {
//    this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
//    const privateKey = process.env.PRIVATE_KEY;
//    if (!privateKey) {
//      throw new Error('❌ 环境变量未配置 PRIVATE_KEY，请在 .env 文件中添加');
//    }
//    this.wallet = new ethers.Wallet(privateKey, this.provider);
//    this.contractAddress = process.env.CONTRACT_ADDRESS;
//    if (this.contractAddress) {
//      this.contract = new ethers.Contract(this.contractAddress, ResearchDepositABI, this.wallet);
//    }
//  }

//  setContractAddress(address) {
//    this.contractAddress = address;
//    this.contract = new ethers.Contract(address, ResearchDepositABI, this.wallet);
//  }

//  async depositResearch(researchId, title, authorId, ipfsHash, contentHash) {
//    try {
//      if (!this.contract) throw new Error('合约未初始化');
//      const tx = await this.contract.depositResearch(researchId, title, authorId, ipfsHash, contentHash);
//      const receipt = await tx.wait();
//      return { success: true, transactionHash: receipt.transactionHash };
//    } catch (error) {
//      console.error('合约存证失败:', error);
//      return { success: false, error: error.message };
//    }
//  }

//  async getResearch(researchId) {
//    try {
//      const researchDoc = await Research.findOne({ researchId });
//      if (!researchDoc) return { exists: false };
//      return {
//        exists: true,
//        researchId: researchDoc.researchId,
//        title: researchDoc.title,
//        authorId: researchDoc.authorId,
//        type: researchDoc.type,
//        abstract: researchDoc.abstract,
//        keywords: researchDoc.keywords,
//        fileUrl: researchDoc.fileUrl,
//        ipfsHash: researchDoc.ipfsHash,
//        contentHash: researchDoc.contentHash,
//        transactionHash: researchDoc.transactionHash,
//        metadata: researchDoc.metadata
//      };
//    } catch (error) {
//      return { exists: false, error: error.message };
//    }
//  }

//  async getContractInfo() {
//    if (!this.contract) return { initialized: false };
//    return {
//      initialized: true,
//      address: this.contractAddress,
//      code: await this.provider.getCode(this.contractAddress)
//    };
//  }
//}

//module.exports = new BlockchainService();

/*以上为原有代码*/

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const Research = require('../models/Research');

// -----------------------------------------------------------------
// 1. 路径配置：指向智能合约编译生成的 ABI 文件
// 根据你之前的目录树结构，该路径应指向 xiyuan_smart_contract 的编译产物
// -----------------------------------------------------------------
const CONTRACT_ARTIFACT_PATH = path.join(__dirname, '../../../xiyuan_smart_contract/artifacts/contracts/ResearchDeposit.sol/ResearchDeposit.json');

class BlockchainService {
    constructor() {
        // 初始化 Provider，连接到本地 Hardhat 节点
        this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');

        // 获取部署者/调用者私钥
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            console.warn('⚠️ 环境变量未配置 PRIVATE_KEY，请在 .env 文件中添加');
        } else {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
        }

        // 获取合约地址
        this.contractAddress = process.env.CONTRACT_ADDRESS;
        this.contract = null;
        this.initialized = false;

        this.initContract();
    }

    // 初始化合约实例
    initContract() {
        try {
            if (fs.existsSync(CONTRACT_ARTIFACT_PATH)) {
                const artifact = JSON.parse(fs.readFileSync(CONTRACT_ARTIFACT_PATH, 'utf8'));
                if (this.contractAddress && this.wallet) {
                    this.contract = new ethers.Contract(this.contractAddress, artifact.abi, this.wallet);
                    this.initialized = true;
                    console.log("✅ BlockchainService 初始化成功，合约地址:", this.contractAddress);
                }
            } else {
                console.error("❌ 找不到合约 ABI 文件，请确保已运行 npx hardhat compile ");
            }
        } catch (error) {
            console.error("❌ 初始化合约失败:", error.message);
        }
    }

    setContractAddress(address) {
        this.contractAddress = address;
        this.initContract();
    }

    // -----------------------------------------------------------------
    // 2a. 个人实名存证：deposit(title, author, abstract, fileHash, fileType, trustedTimestamp)
    // -----------------------------------------------------------------
    async depositResearch(researchId, title, author, ipfsHash, contentHash,
                          { abstract = '', fileType = 'unknown', trustedTimestampHash = '' } = {}) {
        try {
            if (!this.contract) throw new Error('合约未初始化');

            const tx = await this.contract.deposit(
                title,
                author,
                abstract || 'Standard Research Deposit',
                ipfsHash,
                fileType,
                trustedTimestampHash
            );

            const receipt = await tx.wait();
            return { success: true, transactionHash: receipt.transactionHash };
        } catch (error) {
            console.error('❌ 合约实名存证失败:', error);
            return { success: false, error: error.message };
        }
    }

    // -----------------------------------------------------------------
    // 2b. 团队存证：depositWithTeam(...)
    // -----------------------------------------------------------------
    async depositWithTeam(title, abstractText, fileHash, fileType, trustedTimestampHash,
                          creatorIds, walletAddresses, shares) {
        try {
            if (!this.contract) throw new Error('合约未初始化');

            const tx = await this.contract.depositWithTeam(
                title,
                abstractText || '',
                fileHash,
                fileType,
                trustedTimestampHash,
                creatorIds,
                walletAddresses,
                shares
            );

            const receipt = await tx.wait();
            return { success: true, transactionHash: receipt.transactionHash };
        } catch (error) {
            console.error('❌ 合约团队存证失败:', error);
            return { success: false, error: error.message };
        }
    }

    // -----------------------------------------------------------------
    // 3. 匿名存证功能：对应合约中的 anonymousDeposit 方法
    // 集成零知识证明 (ZKP) 参数 
    // -----------------------------------------------------------------
    async anonymousDeposit(title, author, abstract, fileHash, fileType, a, b, c, input) {
        try {
            if (!this.contract) throw new Error('合约未初始化');

            console.log("正在发起 ZKP 匿名存证交易...");

            // 调用合约的匿名接口，传入 ZKP 证明参数 a, b, c 和公开输入 input
            const tx = await this.contract.anonymousDeposit(
                title,
                author,
                abstract,
                fileHash,
                fileType,
                a,
                b,
                c,
                input
            );

            const receipt = await tx.wait();
            return { success: true, transactionHash: receipt.transactionHash };
        } catch (error) {
            console.error('❌ 合约匿名存证失败 (ZKP 验证未通过):', error);
            return { success: false, error: error.message };
        }
    }

    // -----------------------------------------------------------------
    // 4. 数据查询功能
    // -----------------------------------------------------------------
    async getResearch(researchId) {
        try {
            // 从 MongoDB 获取本地记录
            const researchDoc = await Research.findOne({ researchId });
            if (!researchDoc) return { exists: false };

            return {
                exists: true,
                researchId: researchDoc.researchId,
                title: researchDoc.title,
                authorId: researchDoc.authorId,
                type: researchDoc.type,
                abstract: researchDoc.abstract,
                ipfsHash: researchDoc.ipfsHash,
                contentHash: researchDoc.contentHash,
                transactionHash: researchDoc.transactionHash,
                isAnonymous: researchDoc.isAnonymous || false, // 标记是否为匿名成果
                metadata: researchDoc.metadata
            };
        } catch (error) {
            return { exists: false, error: error.message };
        }
    }

    async getContractInfo() {
        if (!this.contract) return { initialized: false };
        try {
            return {
                initialized: true,
                address: this.contractAddress,
                code: await this.provider.getCode(this.contractAddress)
            };
        } catch (error) {
            return { initialized: false, error: error.message };
        }
    }
}

module.exports = new BlockchainService();
