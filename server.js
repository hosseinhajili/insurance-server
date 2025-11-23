import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import viewDataRouter from './view-data.js';
import smsRouter from './routes/sms.js';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 TEST - اضافه کردن این خطوط
console.log('📁 مسیر جاری:', __dirname);
const envPath = path.join(__dirname, '.env.local');
console.log('📁 مسیر فایل env:', envPath);

dotenv.config({ path: envPath });

// 🔧 TEST - چک کردن متغیرها
console.log('🔑 SMS Key:', process.env.SMSIR_API_KEY ? 'موجود ✅' : 'مفقود ❌');
console.log('📧 Email User:', process.env.EMAIL_USER ? 'موجود ✅' : 'مفقود ❌');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/view-data', viewDataRouter);
app.use('/api/sms', smsRouter);

// تنظیمات multer برای ذخیره فایل‌ها
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    // ایجاد پوشه uploads اگر وجود ندارد
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // نام فایل: timestamp + نام اصلی
    const timestamp = Date.now();
    const originalName = file.originalname;
    const filename = `${timestamp}_${originalName}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // فقط تصاویر و PDF قبول کنیم
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('فقط تصویر و PDF مجاز است'), false);
    }
  }
});

// Route برای آپلود فایل کارت ماشین
app.post('/api/upload-car-card', upload.single('carCard'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'هیچ فایلی آپلود نشده است'
      });
    }

    console.log('📁 فایل کارت ماشین آپلود شد:', req.file.filename);
    
    res.json({
      success: true,
      message: 'فایل با موفقیت آپلود شد',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        fileUrl: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('❌ خطا در آپلود فایل:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در آپلود فایل',
      error: error.message
    });
  }
});

// Route برای سرو کردن فایل‌های آپلود شده
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Log همه درخواست‌ها
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body || '');
  next();
});

// تابع برای ذخیره اطلاعات در فایل
async function saveToFile(data) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `insurance_form_${timestamp}.json`;
    const dataDir = path.join(process.cwd(), 'data');
    
    // ایجاد پوشه data اگر وجود ندارد
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('📁 پوشه data ایجاد شد');
    }
    
    const filePath = path.join(dataDir, filename);
    const fileData = {
      timestamp: new Date().toISOString(),
      persianDate: new Date().toLocaleString('fa-IR'),
      ...data
    };
    
    await fs.writeFile(filePath, JSON.stringify(fileData, null, 2), 'utf8');
    console.log('💾 اطلاعات در فایل ذخیره شد:', filename);
    return filename;
  } catch (error) {
    console.error('❌ خطا در ذخیره فایل:', error);
    return null;
  }
}

// تابع ارسال پیامک واقعی
async function sendSMSReal(phone, message) {
  try {
    const apiKey = process.env.SMSIR_API_KEY;
    const lineNumber = process.env.SMS_LINE_NUMBER;
    
    console.log('🔑 کلید API:', apiKey ? 'وجود دارد' : 'مفقود');
    console.log('📞 شماره خط:', lineNumber);
    
    if (!apiKey) throw new Error('کلید API تنظیم نشده');
    if (!lineNumber) throw new Error('شماره خط تنظیم نشده');

    // تابع برای تبدیل اعداد فارسی به انگلیسی
    function convertPersianToEnglishNumbers(str) {
      const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      
      return str.split('').map(char => {
        const index = persianNumbers.indexOf(char);
        return index !== -1 ? englishNumbers[index] : char;
      }).join('');
    }

    // تبدیل اعداد فارسی و پاکسازی شماره
    const cleanPhone = convertPersianToEnglishNumbers(phone).replace(/[^\d]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `98${cleanPhone.slice(1)}` : cleanPhone;
    
    console.log('📱 شماره اصلی:', phone);
    console.log('📱 شماره تمیز شده:', cleanPhone);
    console.log('📱 شماره فرمت شده:', formattedPhone);

    // بررسی اینکه شماره معتبر است
    if (formattedPhone.length !== 12) {
      throw new Error(`شماره تلفن نامعتبر: ${phone} -> ${formattedPhone}`);
    }

    const payload = {
      LineNumber: lineNumber,
      MessageText: message,
      Mobiles: [formattedPhone],
      SendDateTime: null
    };

    console.log('📤 ارسال به SMS.ir...');
    
    const response = await fetch('https://api.sms.ir/v1/send/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 وضعیت پاسخ:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS.ir error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ پاسخ SMS.ir:', result);
    return result;
  } catch (error) {
    console.error('❌ خطا در ارسال پیامک:', error);
    throw error;
  }
}

// Route ارسال پیامک
app.post('/api/send-sms', async (req, res) => {
  const { phone, message } = req.body;

  try {
    console.log('📱 دریافت درخواست پیامک:', { phone, message });
    
    const result = await sendSMSReal(phone, message);
    
    console.log('✅ پیامک واقعی ارسال شد');
    
    res.json({ 
      success: true, 
      message: 'پیامک با موفقیت ارسال شد',
      data: result 
    });
  } catch (error) {
    console.error('❌ خطا در ارسال پیامک:', error);
    
    console.log('🔄 استفاده از حالت شبیه‌سازی...');
    res.json({ 
      success: true, 
      message: 'پیامک با موفقیت ارسال شد (شبیه‌سازی)',
      data: {
        messageId: 'sim_msg_' + Date.now(),
        cost: 1200,
        simulated: true
      }
    });
  }
});

// Route ارسال ایمیل (شبیه‌سازی)
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;

  try {
    console.log('📧 دریافت درخواست ایمیل:', { to, subject });
    
    console.log('🔄 ایمیل شبیه‌سازی شد');
    res.json({ 
      success: true, 
      message: 'ایمیل با موفقیت ارسال شد (شبیه‌سازی)',
      data: {
        messageId: 'sim_email_' + Date.now(),
        simulated: true
      }
    });
  } catch (error) {
    console.error('❌ خطا در ارسال ایمیل:', error);
    
    res.json({ 
      success: true, 
      message: 'ایمیل با موفقیت ارسال شد (شبیه‌سازی)',
      data: {
        messageId: 'sim_email_' + Date.now(),
        simulated: true
      }
    });
  }
});

// تابع کمکی برای پیدا کردن آخرین فایل آپلود شده
async function findLatestUploadedFile() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // ایجاد خودکار پوشه uploads اگر وجود ندارد
    try {
      await fs.access(uploadsDir);
    } catch {
      console.log('📁 پوشه uploads وجود ندارد - در حال ایجاد...');
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log('✅ پوشه uploads ایجاد شد');
      return null;
    }
    
    const files = await fs.readdir(uploadsDir);
    
    if (files.length === 0) {
      console.log('📭 پوشه uploads خالی است - کاربر فایل آپلود نکرده');
      return null;
    }
    
    // فیلتر کردن فایل‌های تصویر و PDF
    const validFiles = files.filter(file => 
      file.match(/\.(jpg|jpeg|png|pdf)$/i)
    );
    
    if (validFiles.length === 0) {
      console.log('📭 هیچ فایل تصویر یا PDF پیدا نشد');
      return null;
    }
    
    // مرتب کردن بر اساس زمان modification (جدیدترین اول)
    const filesWithStats = await Promise.all(
      validFiles.map(async (file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          mtime: stats.mtime.getTime()
        };
      })
    );
    
    // مرتب کردن نزولی بر اساس زمان modification
    filesWithStats.sort((a, b) => b.mtime - a.mtime);
    
    const latestFile = filesWithStats[0].name;
    console.log('📎 آخرین فایل آپلود شده:', latestFile);
    return latestFile;
    
  } catch (error) {
    console.log('⚠️ خطا در پیدا کردن فایل آپلود شده:', error.message);
    return null;
  }
}

// تابع ارسال ایمیل به مدیر
async function sendEmailToAdmin(formData, savedFilename, uploadedFileName = null) {
  const { fullName, phone, postalCode, message, insuranceType } = formData;

  // ایجاد attachments آرایه
  const attachments = [];

  // اگر فایل آپلود شده وجود دارد، به attachments اضافه کن
  if (uploadedFileName) {
    const filePath = path.join(process.cwd(), 'uploads', uploadedFileName);
    try {
      await fs.access(filePath); // بررسی وجود فایل
      attachments.push({
        filename: `کارت_ماشین_${uploadedFileName}`,
        path: filePath,
        contentType: getMimeType(uploadedFileName)
      });
      console.log('📎 فایل کارت ماشین به ایمیل اضافه شد:', uploadedFileName);
    } catch (error) {
      console.log('⚠️ فایل کارت ماشین پیدا نشد:', uploadedFileName);
    }
  }

  // تابع برای تشخیص نوع فایل
  function getMimeType(filename) {
    if (filename.endsWith('.pdf')) return 'application/pdf';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
    if (filename.endsWith('.png')) return 'image/png';
    return 'application/octet-stream';
  }

  // تابع برای فیلتر کردن فیلدهای پر شده
  const getFilledFields = (fields) => {
    const filled = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'none') {
        filled[key] = value;
      }
    }
    return filled;
  };

  const filledFields = getFilledFields(formData);
  
  const fieldLabels = {
    fullName: 'نام و نام خانوادگی',
    nationalCode: 'کد ملی',
    phone: 'تلفن همراه',
    address: 'آدرس',
    postalCode: 'کد پستی',
    vehicleType1: 'نوع وسیله نقلیه',
    vehicleBrand1: 'برند وسیله نقلیه',
    vehicleModel1: 'تیپ وسیله نقلیه',
    year1: 'سال ساخت',
    persianYear: 'سال شمسی',
    usageType: 'کاربری',
    financialCoverage: 'پوشش تعهدات مالی',
    driverAccidentCoverage: 'تعهدات حوادث راننده',
    previousInsurer: 'شرکت بیمه‌گر قبلی'
  };

  // تولید جدول فیلدهای پر شده
  const generateFilledFieldsTable = () => {
    const fieldEntries = Object.entries(filledFields)
      .filter(([key]) => key !== 'fullName' && key !== 'phone' && key !== 'postalCode' && key !== 'message')
      .map(([key, value]) => {
        const label = fieldLabels[key] || key;
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 35%;">
              <strong>${label}:</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 65%;">
              ${value}
            </td>
          </tr>
        `;
      }).join('');

    if (!fieldEntries) {
      return `<p style="color: #666; text-align: center;">📝 هیچ اطلاعات تکمیلی وارد نشده است</p>`;
    }

    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${fieldEntries}
      </table>
    `;
  };

  const emailHtml = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; padding: 20px; background: #f5f5f5;">
      <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- هدر -->
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #2c5aa0;">
          <div style="background: #2c5aa0; color: white; padding: 15px; border-radius: 8px; display: inline-block;">
            <h1 style="margin: 0; font-size: 24px;">📋 درخواست جدید بیمه آنلاین</h1>
          </div>
        </div>

        <!-- اطلاعات اصلی -->
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c5aa0; margin-top: 0;">👤 اطلاعات مشتری</h3>
          <p><strong>نام:</strong> ${fullName || 'ثبت نشده'}</p>
          <p><strong>تلفن:</strong> ${phone || 'ثبت نشده'}</p>
          <p><strong>کد پستی:</strong> ${postalCode || 'ثبت نشده'}</p>
          <p><strong>نوع بیمه:</strong> ${insuranceType || 'ثالث'}</p>
        </div>

        <!-- اطلاعات تکمیلی -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c5aa0; margin-top: 0;">📝 اطلاعات تکمیلی</h3>
          ${generateFilledFieldsTable()}
        </div>

        ${uploadedFileName ? `
        <div style="background: #e1f5fe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0277BD; margin-top: 0;">📎 فایل ضمیمه</h3>
          <p style="margin: 0;">
            <strong>فایل کارت ماشین:</strong> ${uploadedFileName}<br>
            <small>این فایل به ایمیل ضمیمه شده است.</small>
          </p>
        </div>
        ` : ''}

        ${message ? `
        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #E65100; margin-top: 0;">💬 پیام مشتری</h3>
          <p style="margin: 0;">${message}</p>
        </div>
        ` : ''}

        ${savedFilename ? `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #1565C0; margin-top: 0;">💾 ذخیره اطلاعات</h4>
          <p style="margin: 0;"><strong>فایل ذخیره شده:</strong> ${savedFilename}</p>
        </div>
        ` : ''}

        <!-- فوتر -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
          <div style="color: #2c5aa0; padding: 10px; font-size: 14px;">
            <strong>زمان ثبت:</strong> ${new Date().toLocaleString('fa-IR')}
          </div>
          <p style="color: #888; font-size: 12px;">
            این ایمیل به صورت خودکار از سامانه بیمه آنلاین ارسال شده است.
          </p>
        </div>
      </div>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `درخواست جدید بیمه - ${fullName || 'کاربر'}`,
    html: emailHtml,
    attachments: attachments // اضافه کردن attachments
  };

  return await transporter.sendMail(mailOptions);
}

// Route ارسال اطلاعات کامل - نسخه نهایی
app.post('/api/submit-form', async (req, res) => {
  try {
    console.log('📋 دریافت اطلاعات کاربر:', req.body);

    const formData = req.body;
    
    // ۱. ذخیره اطلاعات در فایل
    let savedFilename = null;
    try {
      savedFilename = await saveToFile(formData);
      console.log('💾 اطلاعات در فایل ذخیره شد:', savedFilename);
    } catch (saveError) {
      console.log('⚠️ اطلاعات در فایل ذخیره نشد:', saveError.message);
    }

    const { fullName, phone, insuranceType } = formData;

    // ۲. پیدا کردن آخرین فایل آپلود شده (از پوشه uploads)
    let latestUploadedFile = await findLatestUploadedFile();
    
    if (latestUploadedFile) {
      console.log('📎 فایل برای ایمیل پیدا شد:', latestUploadedFile);
    } else {
      console.log('📭 هیچ فایلی برای ایمیل پیدا نشد');
    }

    // ۳. ارسال پیامک به مشتری
    let smsSent = false;
    try {
      const smsToCustomer = `پیشنهاد ${fullName} گرامی، بیمه ${insuranceType || 'ثالث'} ثبت شد. باتشکر`;
      // const smsToCustomer = `پیشنهاد بیمه ${insuranceType || 'ثالث'} شما ثبت شد. باتشکر`;
      await sendSMSReal(phone, smsToCustomer);
      smsSent = true;
      console.log('✅ پیامک به مشتری ارسال شد');
    } catch (smsError) {
      console.log('⚠️ پیامک به مشتری ارسال نشد:', smsError.message);
    }

    // ۴. ارسال پاسخ به کلاینت
    res.json({ 
      success: true, 
      message: 'اطلاعات با موفقیت ثبت شد',
      data: { 
        savedToFile: savedFilename,
        smsSent: smsSent,
        uploadedFile: latestUploadedFile,
        received: true
      }
    });

    // ۵. ارسال پیامک و ایمیل به مدیر (غیرهمزمان)
    setTimeout(async () => {
      try {
        // ارسال پیامک به مدیر
        const smsToAdmin = `درخواست جدید بیمه از ${fullName} - ${phone}`;
        await sendSMSReal(process.env.ADMIN_PHONE, smsToAdmin);
        console.log('✅ پیامک به مدیر ارسال شد');
      } catch (adminSmsError) {
        console.log('⚠️ پیامک به مدیر ارسال نشد:', adminSmsError.message);
      }

      try {
        // ارسال ایمیل به مدیر با فایل کارت ماشین
        const emailResult = await sendEmailToAdmin(formData, savedFilename, latestUploadedFile);
        console.log('✅ ایمیل به مدیر ارسال شد:', emailResult.messageId);
      } catch (emailError) {
        console.log('⚠️ ایمیل به مدیر ارسال نشد:', emailError.message);
      }
    }, 100);

  } catch (error) {
    console.error('❌ خطا در ثبت فرم:', error);
    res.status(500).json({ 
      success: false, 
      message: 'خطا در ثبت اطلاعات',
      error: error.message
    });
  }
});

// Route سلامت
app.get('/api/health-check', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'سرور کار می‌کند',
    services: {
      sms: process.env.SMSIR_API_KEY ? 'فعال' : 'غیرفعال',
      email: process.env.EMAIL_USER ? 'فعال' : 'غیرفعال'
    }
  });
});

// Route اصلی
app.get('/', (req, res) => {
  res.json({
    message: 'سرویس بیمه آنلاین',
    version: '1.0.0',
    endpoints: {
      health: '/api/health-check',
      submit: '/api/submit-form',
      sms: '/api/send-sms',
      email: '/api/send-email',
      viewData: '/api/view-data/files'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 سرور در پورت ${PORT}`);
  console.log(`📍 آدرس: http://localhost:${PORT}`);
  console.log(`📱 SMS.ir: ${process.env.SMSIR_API_KEY ? 'فعال ✅' : 'غیرفعال ❌'}`);
  console.log(`📧 ایمیل: ${process.env.EMAIL_USER ? 'فعال ✅' : 'غیرفعال ❌'}`);
});