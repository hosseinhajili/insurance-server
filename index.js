const express = require('express');
const cors = require('cors');
const sendSMS = require('./send-sms');
const sendEmail = require('./send-email');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', sendSMS);
app.use('/api', sendEmail);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'سرور API در حال اجرا است',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 سرور API در حال اجرا روی پورت ${PORT}`);
  console.log(`📍 آدرس: http://localhost:${PORT}`);
});