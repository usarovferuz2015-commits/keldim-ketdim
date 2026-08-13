// Har 15 daqiqada ishga tushib, jadvali tugagan-u hali chiqish qilmagan
// xodimlarga push eslatma yuboradi: "chiqishni unutmang". 2026-08-13:
// Feruz so'roviga ko'ra qo'shildi - Feruza Saidovaning chiqishni butunlay
// unutib, sessiyasi keyingi kunga o'tib ketishi (va shu sabab o'sha kun
// uchun kamomad noto'g'ri hisoblanishi) holatidan keyin.
//
// Faqat SMENA TUGAGANDAN keyin ishga tushadi (oddiy ish vaqtida bezovta
// qilmaydi) - Feruz aynan shu variantni tanladi.

const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const pushService = require('../services/push.service');
const { localMinutesOfDay, localDayStart } = require('../utils/timezone');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // har 15 daqiqada tekshiradi
const REMINDER_COOLDOWN_MS = 55 * 60 * 1000; // bitta sessiyaga soatiga ~1 marta

const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Xotirada saqlanadi (bazaga yozilmaydi) - server qayta ishga tushsa
// tozalanadi, bu holatda eng ko'pi bilan bir eslatma muddatidan oldinroq
// qayta yuborilishi mumkin, zararsiz.
const lastReminderAt = new Map(); // attendanceId -> Date

const checkOverdueCheckouts = async () => {
  try {
    const openSessions = await prisma.attendance.findMany({
      where: { checkInTime: { not: null }, checkOutTime: null },
      include: { user: { include: { schedule: true } } },
    });

    if (openSessions.length === 0) return;

    const now = new Date();
    const todayStart = localDayStart(now);
    const nowMinutes = localMinutesOfDay(now);

    for (const session of openSessions) {
      const { user } = session;
      if (!user || !user.isActive || !user.schedule) continue;

      const sessionDayStart = localDayStart(new Date(session.workDate));
      const isPastDay = sessionDayStart.getTime() < todayStart.getTime();

      let overdue = false;
      if (isPastDay) {
        // Sessiya boshqa kundan qolgan - allaqachon kechikkan, shubhasiz eslatma kerak
        overdue = true;
      } else {
        const scheduleEndMinutes = parseTimeToMinutes(user.schedule.endTime);
        overdue = nowMinutes > scheduleEndMinutes;
      }

      if (!overdue) continue;

      const last = lastReminderAt.get(session.id);
      if (last && now.getTime() - last.getTime() < REMINDER_COOLDOWN_MS) continue;

      const { sent, total } = await pushService.sendToUser(user.id, {
        title: 'Chiqishni unutmang!',
        body: "Smenangiz tugadi. Yuzingizni skanerlab 'Chiqish'ni bosing, aks holda bugungi kun uchun oylik to'liq hisoblanmasligi mumkin.",
        tag: `checkout-reminder-${session.id}`,
        url: '/employee/dashboard',
      });

      lastReminderAt.set(session.id, now);
      if (total > 0) {
        logger.info(`Checkout eslatmasi: ${user.id} (sessiya ${session.id}) - ${sent}/${total} qurilmaga yuborildi`);
      }
    }

    // Xotira tozaligi uchun - endi yopilgan sessiyalarni map'dan olib tashlaymiz
    const openIds = new Set(openSessions.map((s) => s.id));
    for (const id of lastReminderAt.keys()) {
      if (!openIds.has(id)) lastReminderAt.delete(id);
    }
  } catch (error) {
    logger.error('Checkout eslatma job xatolik:', error.message);
  }
};

let intervalHandle = null;

const startCheckoutReminderJob = () => {
  if (intervalHandle) return; // ikki marta ishga tushmasligi uchun
  if (!pushService.ensureVapid()) {
    logger.info('VAPID kalitlari sozlanmagan - checkout eslatma job push yubormaydi (o\'chirilgan holatda)');
  }
  intervalHandle = setInterval(checkOverdueCheckouts, CHECK_INTERVAL_MS);
  // Server ishga tushgach ham darhol bir marta tekshiradi (15 daqiqa kutmasdan)
  checkOverdueCheckouts().catch(() => {});
  logger.info('Checkout eslatma job ishga tushdi (har 15 daqiqada tekshiradi)');
};

const stopCheckoutReminderJob = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};

module.exports = { startCheckoutReminderJob, stopCheckoutReminderJob, checkOverdueCheckouts };
