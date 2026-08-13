// Push bildirishnomalar - hozircha yagona maqsad: xodim ishga kirib, jadval
// tugagandan keyin ham chiqishni bosmagan bo'lsa, telefoniga eslatma
// yuborish ("chiqishni unutmang, aks holda bugungi kun uchun oylik
// hisoblanmaydi"). VAPID kalitlar (config.vapid) sozlanmagan bo'lsa, bu
// modul jimgina hech narsa qilmaydi - push majburiy funksiya emas.

const webpush = require('web-push');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const config = require('../config');

let vapidConfigured = false;
let vapidBroken = false;
// MUHIM: `webpush.setVapidDetails` kalit noto'g'ri formatda bo'lsa (masalan
// 32 baytga to'g'ri kelmasa) SYNCHRONOUS throw qiladi. Bu funksiya
// `startShiftReminderJob()` orqali `app.listen` callback'i ichida
// chaqirilgani uchun, try/catch bo'lmasa bitta noto'g'ri env-o'zgaruvchi
// BUTUN SERVERNI ishga tushishidan to'xtatib qo'yar edi (2026-08-13:
// productionda VAPID_PRIVATE_KEY qiymati tasodifan buzilib, aynan shu
// sabab deploy healthcheck'da qulab tushgan holat kuzatildi). Endi xato
// bo'lsa faqat push funksiyasi o'chirilgan holda qoladi, server ishlayveradi.
const ensureVapid = () => {
  if (vapidConfigured) return true;
  if (vapidBroken) return false;
  if (!config.vapid.publicKey || !config.vapid.privateKey) return false;
  try {
    webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
    vapidConfigured = true;
    return true;
  } catch (error) {
    vapidBroken = true;
    logger.error("VAPID kalitlari noto'g'ri formatda - push bildirishnomalar o'chirilgan holda qoladi:", error.message);
    return false;
  }
};

const saveSubscription = async (userId, subscription) => {
  const { endpoint, keys } = subscription || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    const error = new Error("Noto'g'ri obuna ma'lumoti");
    error.statusCode = 400;
    throw error;
  }

  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
};

const removeSubscription = async (endpoint) => {
  if (!endpoint) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
};

// Bitta obunaga xabar yuboradi; obuna endi yaroqsiz bo'lsa (410/404 -
// foydalanuvchi bildirishnomani o'chirgan/brauzer o'zgargan) bazadan olib
// tashlaydi, aks holda xatoni faqat log qiladi (checkout jarayonini
// bloklamaydi).
const sendToSubscription = async (sub, payload) => {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      logger.error('Push yuborishda xatolik:', error.message);
    }
    return false;
  }
};

const sendToUser = async (userId, payload) => {
  if (!ensureVapid()) return { sent: 0, total: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const results = await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
  return { sent: results.filter(Boolean).length, total: subs.length };
};

module.exports = {
  ensureVapid,
  saveSubscription,
  removeSubscription,
  sendToUser,
};
