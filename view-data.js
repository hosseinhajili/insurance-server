import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// تبدیل نام فیلدها به فارسی
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
  tonnage: 'تناژ',
  usageType: 'کاربری',
  cargoUsage: 'نوع کاربری',
  financialCoverage: 'پوشش تعهدات مالی',
  driverAccidentCoverage: 'تعهدات حوادث راننده',
  hasPlateChanged: 'تعویض پلاک',
  previousInsurer: 'شرکت بیمه‌گر قبلی',
  startYear: 'سال شروع بیمه قبلی',
  startMonth: 'ماه شروع بیمه قبلی',
  startDay: 'روز شروع بیمه قبلی',
  endYear: 'سال پایان بیمه قبلی',
  endMonth: 'ماه پایان بیمه قبلی',
  endDay: 'روز پایان بیمه قبلی',
  hasPreviousClaims: 'سابقه خسارت',
  financialClaimsCount: 'تعداد خسارت مالی',
  bodilyClaimsCount: 'تعداد خسارت جانی',
  driverAccidentClaimsCount: 'تعداد خسارت حوادث راننده',
  vehicleDiscount: 'تخفیف خودرو',
  driverDiscount: 'تخفیف حوادث راننده',
  timestamp: 'زمان ثبت (میلادی)',
  persianDate: 'زمان ثبت (شمسی)'
};

// فرمت‌سازی مقادیر
const formatValue = (key, value) => {
  if (!value || value === '') return 'ثبت نشده';
  
  if (key === 'hasPlateChanged') {
    return value === 'yes' ? 'بله' : 'خیر';
  } else if (key === 'hasPreviousClaims') {
    return value === 'yes' ? 'بله' : 'خیر';
  } else if (key.includes('Coverage') && !isNaN(value)) {
    return parseInt(value).toLocaleString('fa-IR') + ' ریال';
  } else if (key.includes('Discount') && !isNaN(value)) {
    return value + '%';
  } else if (key === 'vehicleType1') {
    const types = {
      'passenger': 'سواری',
      'van': 'وانت',
      'light_truck': 'کامیونت',
      'truck': 'کامیون',
      'motorcycle': 'موتورسیکلت'
    };
    return types[value] || value;
  } else if (key === 'usageType') {
    const usages = {
      'personal': 'شخصی',
      'taxi_city': 'تاکسی درون شهری',
      'intra_city': 'کرایه شخصی، آژانس و اینترنتی (درون شهر)',
      'inter_city': 'تاکسی و کرایه شخصی، آژانس و اینترنتی (برون شهر)'
    };
    return usages[value] || value;
  } else if (key === 'cargoUsage') {
    const cargo = {
      'cargo': 'بارکش',
      'personal_motorcycle': 'شخصی'
    };
    return cargo[value] || value;
  } else if (key.includes('ClaimsCount')) {
    const claims = {
      'none': 'بدون خسارت',
      '1': 'یکبار خسارت',
      '2': 'دوبار خسارت',
      '3plus': 'سه بار خسارت یا بیشتر'
    };
    return claims[value] || value;
  }
  
  return value;
};

// Route برای لیست فایل‌ها
router.get('/files', async (req, res) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const fileList = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(dataDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        return {
          filename: file,
          customerName: data.fullName || 'نامشخص',
          phone: data.phone || 'ثبت نشده',
          date: data.persianDate || data.timestamp,
          vehicle: `${data.vehicleBrand1 || ''} ${data.vehicleModel1 || ''}`.trim()
        };
      })
    );
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>لیست فرم‌های بیمه</title>
          <style>
              body { font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px; }
              .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #2c5aa0; text-align: center; border-bottom: 2px solid #2c5aa0; padding-bottom: 15px; }
              .file-list { margin-top: 20px; }
              .file-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-right: 4px solid #4CAF50; }
              .file-item:hover { background: #e8f5e8; }
              .file-link { text-decoration: none; color: #333; display: block; }
              .customer-name { font-weight: bold; color: #2c5aa0; }
              .file-info { color: #666; font-size: 14px; margin-top: 5px; }
              .back-link { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>📋 لیست فرم‌های ثبت شده بیمه</h1>
              <div class="file-list">
                  ${fileList.map(file => `
                    <div class="file-item">
                        <a href="/api/view-data/file/${file.filename}" class="file-link">
                            <div class="customer-name">${file.customerName}</div>
                            <div class="file-info">
                                📞 ${file.phone} | 🚗 ${file.vehicle || 'ثبت نشده'} | 📅 ${file.date}
                            </div>
                        </a>
                    </div>
                  `).join('')}
              </div>
              <a href="/" class="back-link">← بازگشت به صفحه اصلی</a>
          </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'خطا در خواندن فایل‌ها', details: error.message });
  }
});

// Route برای مشاهده یک فایل خاص
router.get('/file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, filename);
    
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>مشاهده فرم بیمه - ${data.fullName || 'نامشخص'}</title>
          <style>
              body { font-family: Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px; }
              .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #2c5aa0; text-align: center; border-bottom: 2px solid #2c5aa0; padding-bottom: 15px; }
              .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .section-title { color: #2c5aa0; margin-top: 0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px; }
              .field-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
              .field-label { font-weight: bold; color: #333; width: 40%; }
              .field-value { color: #666; width: 60%; text-align: left; }
              .back-link { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; }
              .print-btn { display: inline-block; margin-right: 10px; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>📋 فرم ثبت شده بیمه</h1>
              
              <div class="section">
                  <h3 class="section-title">👤 اطلاعات شخصی</h3>
                  ${['fullName', 'nationalCode', 'phone', 'address', 'postalCode', 'persianDate', 'timestamp']
                    .map(key => data[key] ? `
                      <div class="field-row">
                          <span class="field-label">${fieldLabels[key]}:</span>
                          <span class="field-value">${formatValue(key, data[key])}</span>
                      </div>
                    ` : '').join('')}
              </div>

              <div class="section">
                  <h3 class="section-title">🚗 اطلاعات وسیله نقلیه</h3>
                  ${['vehicleType1', 'vehicleBrand1', 'vehicleModel1', 'year1', 'persianYear', 'tonnage', 'usageType', 'cargoUsage']
                    .map(key => data[key] ? `
                      <div class="field-row">
                          <span class="field-label">${fieldLabels[key]}:</span>
                          <span class="field-value">${formatValue(key, data[key])}</span>
                      </div>
                    ` : '').join('')}
              </div>

              <div class="section">
                  <h3 class="section-title">📄 اطلاعات بیمه</h3>
                  ${['financialCoverage', 'driverAccidentCoverage', 'previousInsurer', 'hasPlateChanged']
                    .map(key => data[key] ? `
                      <div class="field-row">
                          <span class="field-label">${fieldLabels[key]}:</span>
                          <span class="field-value">${formatValue(key, data[key])}</span>
                      </div>
                    ` : '').join('')}
              </div>

              <div class="section">
                  <h3 class="section-title">📅 تاریخ بیمه قبلی</h3>
                  ${['startYear', 'startMonth', 'startDay', 'endYear', 'endMonth', 'endDay']
                    .map(key => data[key] ? `
                      <div class="field-row">
                          <span class="field-label">${fieldLabels[key]}:</span>
                          <span class="field-value">${formatValue(key, data[key])}</span>
                      </div>
                    ` : '').join('')}
              </div>

              <div class="section">
                  <h3 class="section-title">⚡ سوابق خسارت و تخفیف</h3>
                  ${['hasPreviousClaims', 'financialClaimsCount', 'bodilyClaimsCount', 'driverAccidentClaimsCount', 'vehicleDiscount', 'driverDiscount']
                    .map(key => data[key] ? `
                      <div class="field-row">
                          <span class="field-label">${fieldLabels[key]}:</span>
                          <span class="field-value">${formatValue(key, data[key])}</span>
                      </div>
                    ` : '').join('')}
              </div>

              <div style="text-align: center; margin-top: 30px;">
                  <button onclick="window.print()" class="print-btn">🖨️ چاپ فرم</button>
                  <a href="/api/view-data/files" class="back-link">← بازگشت به لیست</a>
              </div>
          </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'خطا در خواندن فایل', details: error.message });
  }
});

export default router;