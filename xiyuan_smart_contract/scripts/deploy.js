const hre = require("hardhat");

async function main() {
    console.log("正在开始部署流程...");

    // 1. 部署 Groth16Verifier (注意：这里必须用 Groth16Verifier 而不是 Verifier)
    const VerifierFactory = await hre.ethers.getContractFactory("Groth16Verifier");
    const verifier = await VerifierFactory.deploy();
    await verifier.deployed();
    console.log("Groth16Verifier 合约已部署到:", verifier.address);

    // 2. 部署主业务合约 ResearchDeposit，并将验证者地址作为构造参数传入
    const ResearchDepositFactory = await hre.ethers.getContractFactory("ResearchDeposit");
    // 传入刚才部署好的 verifier 地址
    const researchDeposit = await ResearchDepositFactory.deploy(verifier.address);
    await researchDeposit.deployed();

    console.log("ResearchDeposit 合约已部署到:", researchDeposit.address);
    console.log("--------------------------------------------------");
    console.log("部署完成！请将上面的 ResearchDeposit 地址复制到后端的 .env 文件中。");
}

main().catch((error) => {
    console.error("部署失败：", error);
    process.exitCode = 1;
});