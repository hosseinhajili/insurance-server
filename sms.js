import express from 'express';

const router = express.Router();

router.post('/send-sms', (req, res) => {
  console.log('📱 دریافت درخواست پیامک:', req.body);
  
  res.json({ 
    success: true, 
    message: 'پیامک با موفقیت ارسال شد',
    data: {
      messageId: 'msg_' + Date.now(),
      cost: 1200
    }
  });
});

export default router;