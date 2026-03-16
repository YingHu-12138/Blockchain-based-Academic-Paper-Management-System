const express = require('express');
const cors = require('cors');
const path = require('path');
const researchRoutes = require('./routes/researchRoutes');
const blockchainService = require('./services/blockchainService');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  console.log(`🔍 请求: ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/research', researchRoutes);

app.post('/api/init-contract', async (req, res) => {
  const { contractAddress } = req.body;
  if (!contractAddress) return res.status(400).json({ error: '合约地址不能为空' });
  blockchainService.setContractAddress(contractAddress);
  res.json({ message: '设置成功' });
});

app.get('/', (req, res) => res.json({ message: '后端服务OK' }));

module.exports = app;
