require('dotenv').config();
const mongoose = require('mongoose');

const app = require('./app');
const PORT = process.env.PORT || 3000;

// 连接 MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// 启动 HTTP 服务
app.listen(PORT, () => {
  console.log(`🚀 服务器端口 ${PORT}`);
});