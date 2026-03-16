#!/bin/bash

echo "🚀 正在检查并启动基础环境..."

# 获取当前脚本所在目录的绝对路径，避免硬编码
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. 检查并启动 MongoDB 后台服务 (可能需要你输入本地密码)
if systemctl is-active --quiet mongod || systemctl is-active --quiet mongodb; then
    echo "✅ MongoDB 服务已在运行"
else
    sudo systemctl start mongod || sudo systemctl start mongodb
    echo "✅ MongoDB 服务已启动"
fi

echo "⏳ 正在拉起所有微服务，请稍候..."
echo "💡 提示：按 [Ctrl + C] 即可一键安全停止所有服务"
echo "------------------------------------------------"

# 2. 使用 concurrently 一键启动剩余 5 个服务
# -n 定义每一行的前缀名字，-c 定义前缀的颜色
# 使用 PROJECT_ROOT 替代硬编码路径
concurrently \
  -n "CHAIN,IPFS,BACKEND,BERT,FRONTEND" \
  -c "cyan,magenta,yellow,blue,green" \
  "cd \"$PROJECT_ROOT/xiyuan_smart_contract\" && npx hardhat node" \
  "ipfs daemon" \
  "cd \"$PROJECT_ROOT/xiyuan_backend\" && npm start" \
  "cd \"$PROJECT_ROOT/xiyuan_backend/bert_service\" && source venv/bin/activate && python bert_service.py" \
  "cd \"$PROJECT_ROOT/xiyuan_frontend\" && npm run dev"