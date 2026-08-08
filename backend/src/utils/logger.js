const winston = require('winston');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Railway/Nixpacks konteynerlarida stdout - yagona ishonchli log manzili
// (fayl tizimi vaqtinchalik va logs/ papkasi build vaqtida yaratilmaydi).
// Shuning uchun Console transport har doim, muhitdan qat'i nazar, qo'shiladi.
const transports = [
  new winston.transports.Console({
    format: config.nodeEnv === 'production'
      ? logFormat
      : winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
  }),
];

// Fayllarga yozish faqat logs/ papkasi mavjud bo'lganda (yoki yaratib bo'lsa) yoqiladi,
// aks holda winston File transport xatoligi ilovani yiqitmasligi kerak.
try {
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
} catch (err) {
  // Fayl tizimi yozib bo'lmaydigan holatda (masalan, read-only konteyner)
  // faqat konsolga yozish bilan davom etamiz.
  // eslint-disable-next-line no-console
  console.warn('Log fayllarini yozib bo\'lmadi, faqat konsolga yoziladi:', err.message);
}

const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports,
});

module.exports = logger;
