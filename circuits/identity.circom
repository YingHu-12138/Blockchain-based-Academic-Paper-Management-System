pragma circom 2.0.0;

// 引入标准哈希库
include "../node_modules/circomlib/circuits/poseidon.circom";

template IdentityProof() {
    // 私有输入：你的秘密通行证（绝不泄露）
    signal input secret;
    // 公开输入：预先在链上存好的通行证哈希值
    signal input publicHash;

    // 实例化哈希组件
    component hasher = Poseidon(1);
    hasher.inputs[0] <== secret;

    // 核心逻辑：证明 (secret的哈希) 等于 (公开的哈希)
    // 如果不相等，证明将无法生成
    publicHash === hasher.out;
}

component main {public [publicHash]} = IdentityProof();