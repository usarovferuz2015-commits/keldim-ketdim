// Smena bo'yicha push eslatmalar: kirish (check-in) va chiqish (check-out)
// tomonlarining ikkalasi uchun ham. 2026-08-13: Feruz so'roviga ko'ra
// checkoutReminder.job.js o'rniga to'liq qayta yozildi - endi faqat
// "chiqishni unutmang" emas, balki quyidagi bosqichlarni qamrab oladi:
//
// KIRISH tomoni (agar xodim bugun hali umuman check-in qilmagan bo'lsa):
//   - smena boshlanishidan 20 daq oldin: "tez orada boshlanadi" eslatmasi
//   - smena boshlanishidan 10 daq oldin: xuddi shu eslatma yana bir marta
//   - aynan smena boshlanish onida (agar hali kirmagan bo'lsa): "nega
//     ochmadingiz" degan qattiqroq eslatma (bir marta, keyin qaytarilmaydi)
//
// CHIQISH tomoni (ochiq sessiya - checkInTime bor, checkOutTime yo'q):
//   - smena tugashidan 20 daq oldin: "smenani yopishni unutmang" eslatmasi
//   - smena tugashidan 10 daq oldin: xuddi shu eslatma yana bir marta
//   - aynan smena tugash onida: "ish vaqti tugadi, aks holda oylik
//     hisoblanmaydi" degan qattiqroq eslatma
//   - shundan keyin ham ochiq qolsa: har ~1 soatda xuddi shu qattiq eslatma
//     davom etadi (avvalgi checkoutReminder.job.js'dagi kabi)
//   - smena tugashidan 1 SOAT o'tsa ham hali ochiq bo'lsa: sessiya
//     avtomatik yopiladi (checkOutTime = jadval tugash vaqti, workedHours
//     shunga mos hisoblanadi) va xodimga xabar beriladi
//
// Bu mantiq sessiyaning O'ZINING workDate'iga bog'langan jadval kuni asosida
// ishlaydi (aynan "bugun" emas) - shu sabab avvaldan qolib ketgan (yarim
// tundan o'tib, hatto bir necha kun ochiq turgan) sessiyalar ham keyingi
// tekshiruvda avtomatik yopiladi.

const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const pushService = require('../services/push.service');
const attendanceService = require('../services/attendance.service');
const {
  localMinutesOfDay,
  localIsoWeekday,
  localDayStart,
  localDateString,
  localDateTimeFromMinutes,
} = require('../utils/timezone');

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 daqiqada bir - -20/-10 daqiqalik oynalarni o'tkazib yubormaslik uchun
const PRE_REMINDER_MINUTES = [20, 10]; // smena boshlanishi/tugashidan necha daqiqa oldin ogohlantirish
const HOURLY_COOLDOWN_MS = 55 * 60 * 1000; // "tugash onidan" keyingi qayta-qayta eslatmalar oralig'i
const AUTO_CLOSE_GRACE_MS = 60 * 60 * 1000; // tugashdan necha vaqt o'tsa avtomatik yopish

const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Xotirada saqlanadi - server qayta ishga tushsa tozalanadi, bu holatda eng
// ko'pi bilan bir nechta eslatma qayta yuborilishi mumkin (zararsiz), yoki
// avtomatik yopish biroz kechikishi mumkin (keyingi tekshiruvda baribir
// bajariladi).
const checkinSent = new Map(); // key: `${userId}:${dateStr}` -> Set('pre20'|'pre10'|'start')
const checkoutCheckpointSent = new Map(); // key: attendanceId -> Set('pre20'|'pre10'|'end')
const lastHourlyReminder = new Map(); // key: attendanceId -> Date

const getOrCreateSet = (map, key) => {
  if (!map.has(key)) map.set(key, new Set());
  return map.get(key);
};

// ============================================================
// KIRISH (check-in) eslatmalari
// ============================================================
const checkCheckinReminders = async (now) => {
  const dayStart = localDayStart(now);
  const dateStr = localDateString(now);
  const dayOfWeek = localIsoWeekday(now);
  const nowMinutes = localMinutesOfDay(now);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000 - 1);

  const users = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', isActive: true, schedule: { isNot: null } },
    include: { schedule: true },
  });
  if (users.length === 0) return;

  const holiday = await prisma.holiday.findFirst({ where: { date: { gte: dayStart, lte: dayEnd } } });

  for (const user of users) {
    if (!user.schedule.workDays.includes(dayOfWeek)) continue;
    if (holiday) continue;

    const leave = await prisma.leaveRequest.findFirst({
      where: { userId: user.id, status: 'APPROVED', startDate: { lte: dayEnd }, endDate: { gte: dayStart } },
      select: { id: true },
    });
    if (leave) continue;

    const alreadyCheckedIn = await prisma.attendance.findFirst({
      where: { userId: user.id, workDate: { gte: dayStart, lte: dayEnd }, checkInTime: { not: null } },
      select: { id: true },
    });
    if (alreadyCheckedIn) continue; // bugun allaqachon kirgan - eslatma kerak emas

    const startMinutes = parseTimeToMinutes(user.schedule.startTime);
    const sentKey = `${user.id}:${dateStr}`;
    const sent = getOrCreateSet(checkinSent, sentKey);

    for (const mins of PRE_REMINDER_MINUTES) {
      const checkpoint = `pre${mins}`;
      if (sent.has(checkpoint)) continue;
      if (nowMinutes >= startMinutes) continue; // smena allaqachon boshlangan - oldindan eslatma endi ma'nosiz
      if (nowMinutes < startMinutes - mins) continue; // hali vaqti kelmagan

      await pushService.sendToUser(user.id, {
        title: 'Smena tez orada boshlanadi',
        body: `Smenangiz soat ${user.schedule.startTime.substring(0, 5)} da boshlanadi. Ishga kelgach "Kirish" tugmasini bosib, rasmga tushishni unutmang.`,
        tag: `checkin-pre-${user.id}-${dateStr}`,
        url: '/employee/dashboard',
      });
      sent.add(checkpoint);
    }

    if (!sent.has('start') && nowMinutes >= startMinutes) {
      await pushService.sendToUser(user.id, {
        title: 'Ish vaqtingiz boshlandi',
        body: `Soat ${user.schedule.startTime.substring(0, 5)} da smenangiz boshlandi, lekin hali "Kirish"ni bosmadingiz. Iltimos, tezroq ro'yxatdan o'ting.`,
        tag: `checkin-start-${user.id}-${dateStr}`,
        url: '/employee/dashboard',
      });
      sent.add('start');
    }
  }

  // Xotira tozaligi: boshqa kunga oid yozuvlarni tashlab yuboramiz
  for (const key of checkinSent.keys()) {
    if (!key.endsWith(`:${dateStr}`)) checkinSent.delete(key);
  }
};

// ============================================================
// CHIQISH (check-out) eslatmalari + avtomatik yopish
// ============================================================
const checkCheckoutReminders = async (now) => {
  const openSessions = await prisma.attendance.findMany({
    where: { checkInTime: { not: null }, checkOutTime: null },
    include: { user: { include: { schedule: true } } },
  });
  if (openSessions.length === 0) return;

  for (const session of openSessions) {
    const { user } = session;
    if (!user || !user.isActive || !user.schedule) continue;

    const sessionDayStart = localDayStart(new Date(session.workDate));
    const startMinutes = parseTimeToMinutes(user.schedule.startTime);
    let endMinutes = parseTimeToMinutes(user.schedule.endTime);
    if (endMinutes <= startMinutes) endMinutes += 24 * 60; // tungi smena

    const scheduleEndDate = localDateTimeFromMinutes(sessionDayStart, endMinutes);
    const msUntilEnd = scheduleEndDate.getTime() - now.getTime();
    const msSinceEnd = -msUntilEnd;

    const sent = getOrCreateSet(checkoutCheckpointSent, session.id);
    const endTimeLabel = user.schedule.endTime.substring(0, 5);

    // -20 / -10 daqiqalik oldindan eslatmalar (faqat hali tugamagan bo'lsa)
    if (msUntilEnd > 0) {
      for (const mins of PRE_REMINDER_MINUTES) {
        const checkpoint = `pre${mins}`;
        if (sent.has(checkpoint)) continue;
        if (msUntilEnd > mins * 60 * 1000) continue; // hali vaqti kelmagan

        await pushService.sendToUser(user.id, {
          title: 'Smenani yopishni unutmang',
          body: `Soat ${endTimeLabel} da smenangiz tugaydi. Chiqishdan oldin "Chiqish" tugmasini bosishni unutmang.`,
          tag: `checkout-pre-${session.id}`,
          url: '/employee/dashboard',
        });
        sent.add(checkpoint);
      }
      continue; // tugash vaqti hali kelmagan - qolgan tekshiruvlar kerak emas
    }

    // Tugash onida (yoki undan keyin) - kuchli ogohlantirish, keyin soatlik davom etadi
    const strongMessage = {
      title: 'Ish vaqti tugadi!',
      body: "Smenangiz tugadi. Iltimos, yuzingizni rasmga olib 'Chiqish'ni bosing, aks holda bugungi kun uchun oylik hisoblanmasligi mumkin.",
      tag: `checkout-end-${session.id}`,
      url: '/employee/dashboard',
    };

    if (!sent.has('end')) {
      await pushService.sendToUser(user.id, strongMessage);
      sent.add('end');
      lastHourlyReminder.set(session.id, now);
    } else {
      const last = lastHourlyReminder.get(session.id);
      if (!last || now.getTime() - last.getTime() >= HOURLY_COOLDOWN_MS) {
        await pushService.sendToUser(user.id, strongMessage);
        lastHourlyReminder.set(session.id, now);
      }
    }

    // Avtomatik yopish: tugashdan 1 soat o'tgan bo'lsa
    if (msSinceEnd >= AUTO_CLOSE_GRACE_MS) {
      const closed = await attendanceService.autoCloseOverdueSession(session.id, scheduleEndDate);
      if (closed) {
        logger.info(`Auto-close: ${user.id} (attendance ${session.id}) - smena tugashidan 1 soat o'tgach avtomatik yopildi`);
        await pushService.sendToUser(user.id, {
          title: 'Smenangiz avtomatik yopildi',
          body: `Chiqishni bosmaganingiz uchun smenangiz jadval bo'yicha (soat ${endTimeLabel}) avtomatik yopildi. Savol bo'lsa, administratorga murojaat qiling.`,
          tag: `checkout-autoclose-${session.id}`,
          url: '/employee/dashboard',
        });
      }
      checkoutCheckpointSent.delete(session.id);
      lastHourlyReminder.delete(session.id);
    }
  }

  // Xotira tozaligi: endi yopilgan sessiyalarni map'lardan olib tashlaymiz
  const openIds = new Set(openSessions.map((s) => s.id));
  for (const id of checkoutCheckpointSent.keys()) {
    if (!openIds.has(id)) checkoutCheckpointSent.delete(id);
  }
  for (const id of lastHourlyReminder.keys()) {
    if (!openIds.has(id)) lastHourlyReminder.delete(id);
  }
};

const runChecks = async () => {
  const now = new Date();
  try {
    await checkCheckinReminders(now);
  } catch (error) {
    logger.error('Checkin eslatma xatolik:', error.message);
  }
  try {
    await checkCheckoutReminders(now);
  } catch (error) {
    logger.error('Checkout eslatma/auto-close xatolik:', error.message);
  }
};

let intervalHandle = null;

const startShiftReminderJob = () => {
  if (intervalHandle) return; // ikki marta ishga tushmasligi uchun
  if (!pushService.ensureVapid()) {
    logger.info("VAPID kalitlari sozlanmagan - smena eslatma job push yubormaydi (o'chirilgan holatda)");
  }
  intervalHandle = setInterval(runChecks, CHECK_INTERVAL_MS);
  runChecks().catch(() => {});
  logger.info('Smena eslatma job ishga tushdi (har 5 daqiqada tekshiradi)');
};

const stopShiftReminderJob = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};

module.exports = {
  startShiftReminderJob,
  stopShiftReminderJob,
  checkCheckinReminders,
  checkCheckoutReminders,
  runChecks,
};
