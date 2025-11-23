import express from 'express';

const router = express.Router();

router.post('/send-email', (req, res) => {
  console.log('📧 دریافت درخواست ایمیل:', req.body);
  
  res.json({ 
    success: true, 
    message: 'ایمیل با موفقیت ارسال شد',
    data: {
      messageId: 'email_' + Date.now()
    }
  });
});

// حتما این خط رو داشته باش
export default router;