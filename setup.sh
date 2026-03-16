#!/bin/bash

echo "=============================="
echo "开始配置项目环境"
echo "=============================="

# 更新系统
echo "更新系统..."
sudo apt update

# 安装Node.js
echo "安装 Node.js..."
if ! command -v node &> /dev/null
then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 安装 MongoDB
echo "安装 MongoDB..."
if ! command -v mongod &> /dev/null
then
    sudo apt install -y mongodb
fi

# 安装 IPFS
echo "安装 IPFS..."
if ! command -v ipfs &> /dev/null
then
    wget https://dist.ipfs.tech/kubo/v0.28.0/kubo_v0.28.0_linux-amd64.tar.gz
    tar -xvzf kubo_v0.28.0_linux-amd64.tar.gz
    cd kubo
    sudo bash install.sh
    cd ..
fi

# 初始化 IPFS
if [ ! -d "$HOME/.ipfs" ]; then
    ipfs init
fi

# 安装 Python venv
echo "安装 Python 依赖..."
sudo apt install -y python3-venv python3-pip

echo "=============================="
echo "安装项目依赖"
echo "=============================="

# 智能合约
echo "安装 Hardhat 依赖..."
cd xiyuan_smart_contract
npm install
cd ..

# 后端
echo "安装 Backend 依赖..."
cd xiyuan_backend
npm install
cd ..

# 前端
echo "安装 Frontend 依赖..."
cd xiyuan_frontend
npm install
cd ..

# BERT服务
echo "安装 BERT 服务依赖..."
cd xiyuan_backend/bert_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../../..

echo "=============================="
echo "环境配置完成！"
echo "=============================="

echo "启动项目请运行："
echo "./start_all.sh"
