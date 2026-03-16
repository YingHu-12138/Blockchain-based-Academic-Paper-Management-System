//const { expect } = require("chai");
//const { ethers } = require("hardhat");

//describe("ResearchDeposit合约测试", function () {
//  let researchDeposit; // 合约实例
//  let owner; // 测试账户（部署者）

//  // 测试前准备：部署合约
//  beforeEach(async function () {
//    [owner] = await ethers.getSigners(); // 获取Hardhat内置测试账户
//    const ResearchDeposit = await ethers.getContractFactory("ResearchDeposit");
//    researchDeposit = await ResearchDeposit.deploy(); // 部署合约
//    await researchDeposit.deployed(); // 等待部署完成
//  });

//  // 测试1：成果上链功能
//  it("应成功存储科研成果", async function () {
//    // 模拟前端传入的参数
//    const researchId = "24300240167-1720000000000"; // 作者ID（李珏言学号）+ 时间戳
//    const title = "基于区块链的高校科研成果确权系统设计";
//    const authorId = "24300240167";
//    const ipfsHash = "QmXxxxxxxxxx"; // 模拟IPFS哈希
//    const contentHash = ethers.utils.id("title-authorId-fileContent"); // 模拟内容哈希

//    // 调用合约上链函数
//    await researchDeposit.depositResearch(
//      researchId,
//      title,
//      authorId,
//      ipfsHash,
//      contentHash
//    );

//    // 查询上链成果，验证数据正确性
//    const research = await researchDeposit.getResearch(researchId);
//    expect(research.title).to.equal(title);
//    expect(research.authorId).to.equal(authorId);
//    expect(research.ipfsHash).to.equal(ipfsHash);
//    expect(research.contentHash).to.equal(contentHash);
//    expect(research.timestamp).to.be.gt(0); // 时间戳应大于0
//  });

//  // 测试2：重复上链应失败
//  it("重复上链同一成果应报错", async function () {
//    const researchId = "24300240167-1720000000000";
//    const title = "基于区块链的高校科研成果确权系统设计";
//    const authorId = "24300240167";
//    const ipfsHash = "QmXxxxxxxxxx";
//    const contentHash = ethers.utils.id("title-authorId-fileContent");

//    // 第一次上链（成功）
//    await researchDeposit.depositResearch(
//      researchId,
//      title,
//      authorId,
//      ipfsHash,
//      contentHash
//    );

//    // 第二次上链（应失败）
//    await expect(
//      researchDeposit.depositResearch(
//        researchId,
//        title,
//        authorId,
//        ipfsHash,
//        contentHash
//      )
//    ).to.be.revertedWith("Research already deposited");
//  });

//  // 测试3：查询不存在的成果应报错
//  it("查询不存在的成果应报错", async function () {
//    const nonExistentId = "24300240167-1720000000001";
//    await expect(
//      researchDeposit.getResearch(nonExistentId)
//    ).to.be.revertedWith("Research does not exist");
//  });
//});

/*以上为原有代码before20260228*/

const { expect } = require("chai");
const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");
const path = require("path");

describe("科研成果确权系统集成测试 (含 ZKP)", function () {
    let researchDeposit;
    let verifier;
    let owner;

    // 测试前准备：部署验证合约与主业务合约
    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // 1. 部署 Groth16Verifier (注意这里类名已更新)
        const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
        verifier = await VerifierFactory.deploy();
        await verifier.deployed();

        // 2. 部署 ResearchDeposit，并将验证合约地址传入构造函数
        const ResearchDepositFactory = await ethers.getContractFactory("ResearchDeposit");
        researchDeposit = await ResearchDepositFactory.deploy(verifier.address);
        await researchDeposit.deployed();
    });

    // -----------------------------------------------------------------
    // 场景 1：标准实名存证测试 (保留你之前的逻辑)
    // -----------------------------------------------------------------
    it("应成功存储实名科研成果", async function () {
        const title = "基于区块链的高校科研成果确权系统设计";
        const author = "李珏言";
        const abstractText = "这是一个研究区块链确权的课题";
        const fileHash = "QmXxxxxxxxxx_RealName";
        const fileType = "pdf";

        await researchDeposit.deposit(
            title,
            author,
            abstractText,
            fileHash,
            fileType
        );

        const research = await researchDeposit.getResearch(fileHash);
        expect(research.title).to.equal(title);
        expect(research.uploader).to.equal(owner.address);
    });

    // -----------------------------------------------------------------
    // 场景 2：匿名 ZKP 存证测试 (核心创新点)
    // -----------------------------------------------------------------
    it("应能够通过零知识证明完成匿名存证", async function () {
        // 模拟电路输入
        const secret = "123456789";
        // 预计算的公开哈希值 (需与电路 identity.circom 逻辑匹配)
        const publicHash = "7110303097080024260800444665787206606103183587082596139871399733998958991511";

        // A. 在本地生成证明 (路径相对于 test 目录)
        const wasmPath = path.join(__dirname, "../../zkp_assets/identity.wasm");
        const zkeyPath = path.join(__dirname, "../../zkp_assets/identity_final.zkey");

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            { secret: secret, publicHash: publicHash },
            wasmPath,
            zkeyPath
        );

        // B. 将证明转换为 Solidity 合约可接受的数组格式
        const rawCallData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
        const argv = JSON.parse("[" + rawCallData + "]");

        // C. 调用匿名存证函数
        const title = "匿名研究成果";
        const fileHash = "QmXxxxxxxxxx_Anonymous";

        await expect(researchDeposit.anonymousDeposit(
            title,
            "匿名作者",
            "使用 ZKP 隐藏身份的存证测试",
            fileHash,
            "pdf",
            argv[0], // a
            argv[1], // b
            argv[2], // c
            argv[3]  // input (publicHash)
        )).to.emit(researchDeposit, "ResearchDeposited");

        // D. 验证匿名性：uploader 应为全 0 地址
        const research = await researchDeposit.getResearch(fileHash);
        expect(research.uploader).to.equal("0x0000000000000000000000000000000000000000");
        console.log("匿名存证 ZKP 验证通过！");
    });

    // -----------------------------------------------------------------
    // 场景 3：异常路径测试
    // -----------------------------------------------------------------
    it("重复上链同一文件哈希应报错", async function () {
        const fileHash = "Qm_Duplicate_Test";
        await researchDeposit.deposit("标题", "作者", "摘要", fileHash, "pdf");

        await expect(
            researchDeposit.deposit("标题2", "作者2", "摘要2", fileHash, "pdf")
        ).to.be.revertedWith("Research already deposited");
    });
});