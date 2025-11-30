@echo off
title سرویس بیمه ایران - راه‌اندازی
echo ========================================
echo    🚀 سرویس بیمه ایران
echo ========================================
echo.

cd /d "C:\Users\Public\my-vite-insurance"

echo 📁 بررسی فایل‌ها...
if exist "server\server.js" (
    echo ✅ فایل سرور موجود است
) else (
    echo ❌ فایل سرور یافت نشد
    pause
    exit
)

if exist "package.json" (
    echo ✅ فایل package.json موجود است
) else (
    echo ❌ فایل package.json یافت نشد
    pause
    exit
)

echo.
echo 🚀 در حال راه‌اندازی...
echo 📍 سرور: http://localhost:5000
echo 📍 کلاینت: http://localhost:5173
echo.

npm run dev:full

pause