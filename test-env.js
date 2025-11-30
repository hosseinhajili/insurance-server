echo import dotenv from 'dotenv'; > test-env.js
echo. >> test-env.js
echo dotenv.config({ path: '.env.local' }); >> test-env.js
echo. >> test-env.js
echo console.log('🔑 SMS Key:', process.env.SMSIR_API_KEY ? 'موجود ✅' : 'مفقود ❌'); >> test-env.js
echo console.log('📞 SMS Line:', process.env.SMS_LINE_NUMBER ? 'موجود ✅' : 'مفقود ❌'); >> test-env.js
echo console.log('📧 Email User:', process.env.EMAIL_USER ? 'موجود ✅' : 'مفقود ❌'); >> test-env.js
echo console.log('🔐 Email Pass:', process.env.EMAIL_PASS ? 'موجود ✅' : 'مفقود ❌'); >> test-env.js