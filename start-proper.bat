@echo off
echo "🔄 پاکسازی پورت‌ها..."
npx kill-port 5000
npx kill-port 5173
timeout /t 3

echo "🚀 راه‌اندازی سرور..."
start cmd /k "cd /d C:\Users\Public\my-vite-insurance\server && node server.js"

echo "⏳ منتظر راه‌اندازی سرور..."
timeout /t 5

echo "🌐 راه‌اندازی کلاینت..."
cd /d C:\Users\Public\my-vite-insurance
npm run dev

pause