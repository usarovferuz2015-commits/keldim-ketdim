require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
  },
  googleSheets: {
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY
      ? process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '',
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  },
  face: {
    // face.service.js "o'xshashlik"ni `1 - euclideanDistance` sifatida hisoblaydi.
    // face-api.js jamoasining odatiy tavsiyasi: bir xil odamning descriptor
    // masofasi (distance) < 0.6 bo'lsa mos keladi deb hisoblanadi - ya'ni
    // "o'xshashlik" (1-distance) shkаlasida bu ~0.4 chegarasiga to'g'ri keladi,
    // 0.6 EMAS. Threshold=0.6 haddan tashqari qattiq bo'lib, kunlik yorug'lik/
    // burchak farqi bilan haqiqiy xodimlarni ham rad etib qo'yardi (haqiqiy
    // holatda kuzatildi: bir xil odam 57% o'xshashlik bilan rad etilgan edi).
    // 0.45 - xavfsizlik (begona odamni qabul qilmaslik) bilan qulaylik
    // (haqiqiy xodimni rad etmaslik) o'rtasidagi muvozanatlashtirilgan qiymat.
    // 2026-08-09: Feruz so'roviga ko'ra yanada pasaytirildi (0.40) - kirish/
    // chiqishni soddalashtirish uchun, negaki endi admin har bir kirish/
    // chiqish rasmini ko'ra oladi (pastroq threshold begona odamni ham
    // o'tkazib yuborish xavfini oshiradi, lekin rasm orqali admin nazorati bor).
    similarityThreshold: parseFloat(process.env.FACE_SIMILARITY_THRESHOLD) || 0.40,
    livenessBlinkThreshold: parseFloat(process.env.LIVENESS_BLINK_THRESHOLD) || 0.3,
  },
  geofence: {
    defaultRadius: parseInt(process.env.DEFAULT_GEOFENCE_RADIUS, 10) || 100,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 5,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

module.exports = config;
