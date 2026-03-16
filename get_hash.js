const { buildPoseidon } = require("circomlibjs");

async function run() {
    // 1. 初始化 Poseidon 环境
    const poseidon = await buildPoseidon();
    
    // 2. 输入你的秘密通行证 (Secret)
    const secret = BigInt("123456789");
    
    // 3. 计算哈希。注意：Poseidon 的输入必须是一个数组
    const hashBuffer = poseidon([secret]);
    
    // 4. 使用内置的有限域 (Finite Field) 工具将结果转换为字符串格式
    const publicHash = poseidon.F.toString(hashBuffer);
    
    console.log("你的正确 publicHash 应该是：");
    console.log(publicHash);
}

run().catch(console.error);