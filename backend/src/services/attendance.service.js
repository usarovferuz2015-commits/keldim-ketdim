const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const config = require('../config');
const geofenceService = require('./geofence.service');
const googleSheetsService = require('./googleSheets.service');
const { localMinutesOfDay, localIsoWeekday, localDayStart, localDayEnd } = require('../utils/timezone');

const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Eslatma: jadval boshlanish/tugash vaqtlari ("09:00" va h.k.) administrator
// tomonidan Toshkent mahalliy devor soati sifatida kiritiladi - shuning uchun
// hozirgi vaqtni ham xuddi shu bazada (mahalliy daqiqa) hisoblash kerak,
// aks holda kechikish UTC+5 farqi (300 daqiqa) qadar kam ko'rsatiladi.
const dateTimeToMinutes = localMinutesOfDay;
const getWorkDateStart = localDayStart;
const getWorkDateEnd = localDayEnd;

const checkIn = async (userId, data) => {
  const { latitude, longitude, faceVerified, livenessVerified, image } = data;
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      schedule: true,
    },
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (!user.schedule) {
    const error = new Error('Ish jadvali sozlanmagan. Administrator bilan bog\'laning.');
    error.statusCode = 400;
    throw error;
  }

  const schedule = user.schedule;

  const dayOfWeek = localIsoWeekday(now);
  if (!schedule.workDays.includes(dayOfWeek)) {
    const error = new Error('Bugun ish kuni emas');
    error.statusCode = 400;
    throw error;
  }

  const todayStart = getWorkDateStart(now);
  const todayEnd = getWorkDateEnd(now);

  const holiday = await prisma.holiday.findFirst({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  if (holiday) {
    const error = new Error(`Bugun bayram kuni: ${holiday.name}`);
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.attendance.findFirst({
    where: {
      userId,
      workDate: {
        gte: todayStart,
        lte: todayEnd,
      },
      checkOutTime: null,
    },
  });

  // Bugun uchun boshqa (yopilgan) sessiya bor-yo'qligini tekshiramiz - agar
  // bor bo'lsa, bu kunning BIRINCHI kelishi emas, balki tanaffusdan/tashqaridan
  // qaytish. Kechikish faqat kunning birinchi kelishida jadval boshiga nisbatan
  // hisoblanadi; aks holda masalan tushlikdan 14:00da qaytgan xodim jadval
  // 09:00da boshlangani uchun "5 soat kechikdi" deb noto'g'ri belgilanardi.
  // Sessiyalar orasidagi vaqt (necha daqiqaga chiqib kelgani) alohida
  // payroll.service.js orqali hisoblanadi.
  const anySessionToday = existing
    ? true
    : !!(await prisma.attendance.findFirst({
        where: {
          userId,
          workDate: { gte: todayStart, lte: todayEnd },
          checkInTime: { not: null },
        },
        select: { id: true },
      }));

  const workLocation = await geofenceService.findNearestLocation(latitude, longitude);
  if (!workLocation) {
    if (config.nodeEnv === 'production') {
      const error = new Error('Siz hech qaysi ish joyi radiusida emassiz');
      error.statusCode = 400;
      throw error;
    }
    logger.info('Check-in test rejimi');
  }

  if (existing) {
    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        faceVerified,
        livenessVerified,
        gpsVerified: true,
        checkInImage: image || existing.checkInImage,
        workLocationId: workLocation?.id || existing.workLocationId,
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime,
      },
      include: { workLocation: { select: { id: true, name: true } } },
    });
    logger.info(`Qayta check-in: ${userId}`);
    googleSheetsService.syncAttendance(updated).catch(() => {});
    return updated;
  }

  let lateMinutes = 0;
  let status = 'PRESENT';

  if (!anySessionToday) {
    const scheduleStartMinutes = parseTimeToMinutes(schedule.startTime);
    const currentMinutes = dateTimeToMinutes(now);
    if (currentMinutes > scheduleStartMinutes) {
      lateMinutes = currentMinutes - scheduleStartMinutes;
      status = 'LATE';
    }
  }

  const attendance = await prisma.attendance.create({
    data: {
      userId,
      workDate: new Date(todayStart),
      scheduleStart: schedule.startTime,
      scheduleEnd: schedule.endTime,
      checkInTime: now,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      faceVerified,
      livenessVerified,
      gpsVerified: true,
      checkInImage: image || null,
      workLocationId: workLocation?.id || null,
      lateMinutes,
      status,
    },
    include: {
      workLocation: { select: { id: true, name: true } },
    },
  });

  logger.info(`Check-in: ${userId} (kechikish: ${lateMinutes} daqiqa)`);
  googleSheetsService.syncAttendance(attendance).catch(() => {});

  return attendance;
};

const checkOut = async (userId, data) => {
  const { latitude, longitude, faceVerified, livenessVerified, image } = data;
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { schedule: true },
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (!user.schedule) {
    const error = new Error('Ish jadvali sozlanmagan');
    error.statusCode = 400;
    throw error;
  }

  const schedule = user.schedule;

  const todayStart = getWorkDateStart(now);
  const todayEnd = getWorkDateEnd(now);

  const attendance = await prisma.attendance.findFirst({
    where: {
      userId,
      workDate: {
        gte: todayStart,
        lte: todayEnd,
      },
      checkInTime: { not: null },
      checkOutTime: null,
    },
    orderBy: { checkInTime: 'desc' },
  });

  if (!attendance) {
    const error = new Error('Siz hali check-in qilmagansiz yoki barcha sessiyalarda check-out qilgansiz');
    error.statusCode = 400;
    throw error;
  }

  const workLocation = await geofenceService.findNearestLocation(latitude, longitude);
  if (!workLocation) {
    if (config.nodeEnv === 'production') {
      const error = new Error('Siz hech qaysi ish joyi radiusida emassiz');
      error.statusCode = 400;
      throw error;
    }
    logger.info('Check-out test rejimi: GPS o\'tkazib yuborildi');
  }

  const checkInMs = new Date(attendance.checkInTime).getTime();
  const checkOutMs = now.getTime();
  const workedMs = checkOutMs - checkInMs;
  let workedHours = Math.round((workedMs / (1000 * 60 * 60)) * 100) / 100;
  if (workedHours < 0) workedHours = 0;

  // Eslatma: bu maydonlar (earlyLeaveMinutes/overtimeHours) har bir sessiya
  // (bitta check-in/check-out juftligi) uchun alohida, jadval oxiriga nisbatan
  // hisoblanadi - shuning uchun kun davomida oraliq chiqishlarda (masalan
  // tushlikka chiqish) ma'nosiz katta qiymat berishi mumkin ("18:00 tugaydi,
  // 13:00da chiqdi" = "5 soat erta ketdi"). Bu OK, chunki ular faqat shu
  // sessiyaning xom ma'lumoti - kunlik to'g'ri kamomad/otrabotka hisobi
  // barcha sessiyalarni jamlagan holda payroll.service.js'da qilinadi.
  const scheduleEndMinutes = parseTimeToMinutes(schedule.endTime);
  const checkoutMinutes = dateTimeToMinutes(now);
  let earlyLeaveMinutes = 0;
  let overtimeHours = 0;

  if (checkoutMinutes < scheduleEndMinutes) {
    earlyLeaveMinutes = scheduleEndMinutes - checkoutMinutes;
  } else if (checkoutMinutes > scheduleEndMinutes) {
    overtimeHours = Math.round(((checkoutMinutes - scheduleEndMinutes) / 60) * 100) / 100;
  }

  let status = attendance.status;
  if (earlyLeaveMinutes > 0 && status === 'PRESENT') {
    status = 'EARLY_LEAVE';
  } else if (earlyLeaveMinutes > 0 && status === 'LATE') {
    status = 'EARLY_LEAVE';
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOutTime: now,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
      workedHours,
      earlyLeaveMinutes,
      overtimeHours,
      status,
      faceVerified: attendance.faceVerified || faceVerified,
      livenessVerified: attendance.livenessVerified || livenessVerified,
      gpsVerified: attendance.gpsVerified || true,
      checkOutImage: image || attendance.checkOutImage,
      workLocationId: attendance.workLocationId || workLocation?.id || null,
    },
    include: {
      workLocation: { select: { id: true, name: true } },
    },
  });

  logger.info(
    `Check-out: ${userId} (ishlangan: ${workedHours}s, erta ketish: ${earlyLeaveMinutes}daq, qo\'shimcha: ${overtimeHours}s)`
  );
  googleSheetsService.syncAttendance(updated).catch(() => {});

  return updated;
};

const getAttendanceHistory = async ({ userId, startDate, endDate, status, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.workDate = {};
    // Eslatma: `workDate` Toshkent mahalliy kun boshlanishi sifatida
    // saqlanadi (getWorkDateStart orqali) - masalan "10-avgust Toshkent"
    // haqiqatda Aug9 19:00 UTC sifatida yotadi. Agar frontenddan kelgan
    // sana satri (masalan "2026-08-10") to'g'ridan-to'g'ri `new Date()`ga
    // berilsa, natija UTC yarim tunga to'g'ri keladi (Aug10 00:00 UTC) -
    // bu esa haqiqiy workDate'dan (Aug9 19:00 UTC) KEYIN bo'lgani uchun
    // "bugun" filtri bugungi yozuvlarni chetlab o'tardi. Shu sabab bu yerda
    // ham getWorkDateStart/End orqali Toshkent kun chegaralariga o'tkazamiz.
    if (startDate) where.workDate.gte = getWorkDateStart(new Date(startDate));
    if (endDate) where.workDate.lte = getWorkDateEnd(new Date(endDate));
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { workDate: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            employeeId: true,
            photoUrl: true,
          },
        },
        workLocation: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  // Ochiq sessiyalar (hali check-out qilinmagan) uchun `workedHours` bazada
  // hali 0 - bu maydon faqat check-out paytida hisoblanadi. Xodim hali ishda
  // ekanini ko'rsatish uchun (Hisob-kitob sahifasidagi kabi) shu yerda "hozircha
  // ishlagan vaqt"ni jonli hisoblab qo'shamiz - bazaga yozilmaydi, faqat javobda
  // ko'rsatiladi.
  const now = new Date();
  const data = records.map((r) => {
    if (r.checkInTime && !r.checkOutTime) {
      const liveWorkedHours = Math.round(((now.getTime() - new Date(r.checkInTime).getTime()) / (1000 * 60 * 60)) * 100) / 100;
      return { ...r, workedHours: Math.max(0, liveWorkedHours), isOpenSession: true };
    }
    return { ...r, isOpenSession: false };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getTodayStatus = async (userId) => {
  const now = new Date();
  const todayStart = getWorkDateStart(now);
  const todayEnd = getWorkDateEnd(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { schedule: true },
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const schedule = user.schedule;

  if (!schedule) {
    return {
      today: now.toISOString().split('T')[0],
      isWorkDay: false,
      status: 'NO_SCHEDULE',
      attendance: null,
    };
  }

  const dayOfWeek = localIsoWeekday(now);
  const isWorkDay = schedule.workDays.includes(dayOfWeek);

  const holiday = await prisma.holiday.findFirst({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const openSession = await prisma.attendance.findFirst({
    where: {
      userId,
      workDate: {
        gte: todayStart,
        lte: todayEnd,
      },
      checkInTime: { not: null },
      checkOutTime: null,
    },
    orderBy: { checkInTime: 'desc' },
    include: {
      workLocation: { select: { id: true, name: true } },
    },
  });

  const totalSessions = await prisma.attendance.count({
    where: {
      userId,
      workDate: { gte: todayStart, lte: todayEnd },
      checkInTime: { not: null },
    },
  });

  return {
    today: now.toISOString().split('T')[0],
    isWorkDay: isWorkDay && !holiday,
    isHoliday: !!holiday,
    holidayName: holiday?.name || null,
    checkedIn: !!openSession,
    checkedOut: !openSession && totalSessions > 0,
    sessionsCount: totalSessions,
    status: openSession?.status || null,
    schedule: {
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      type: schedule.scheduleType,
    },
    attendance: openSession,
  };
};

const getStats = async ({ userId, startDate, endDate }) => {
  const where = { userId };
  if (startDate || endDate) {
    where.workDate = {};
    // Eslatma: attendance.service.js'ning boshqa joylarida bo'lgani kabi,
    // sana satrlari (masalan "2026-08-01") to'g'ridan-to'g'ri `new Date()`ga
    // berilsa UTC yarim tunga to'g'ri keladi, lekin `workDate` Toshkent
    // mahalliy kun boshlanishi sifatida saqlanadi - shu farq oy boshidagi/
    // oxiridagi kunlarni statistikadan chetlab qo'yishi mumkin edi.
    if (startDate) where.workDate.gte = getWorkDateStart(new Date(startDate));
    if (endDate) where.workDate.lte = getWorkDateEnd(new Date(endDate));
  }

  const records = await prisma.attendance.findMany({
    where,
    select: {
      id: true,
      workDate: true,
      checkInTime: true,
      checkOutTime: true,
      workedHours: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      overtimeHours: true,
      status: true,
    },
    orderBy: { workDate: 'desc' },
  });

  // Ochiq sessiya (hali check-out qilinmagan) uchun bazadagi workedHours=0 -
  // faqat check-out paytida hisoblanadi. Statistikada "bugun ishlagan
  // vaqt"ni yo'qotib qo'ymaslik uchun (masalan xodim hozir ishda bo'lsa ham
  // "Jami soat" 0 ko'rsatmasligi kerak) shu yerda jonli hisoblab qo'shamiz.
  const now = new Date();
  const liveWorkedHours = (r) => {
    if (r.checkInTime && !r.checkOutTime) {
      const h = (now.getTime() - new Date(r.checkInTime).getTime()) / (1000 * 60 * 60);
      return Math.max(0, Math.round(h * 100) / 100);
    }
    return r.workedHours || 0;
  };

  const totalRecords = records.length;
  const presentDays = records.filter((r) => r.status === 'PRESENT').length;
  const lateDays = records.filter((r) => r.status === 'LATE' || r.lateMinutes > 0).length;
  const earlyLeaveDays = records.filter((r) => r.status === 'EARLY_LEAVE' || r.earlyLeaveMinutes > 0).length;
  const absentDays = records.filter((r) => r.status === 'ABSENT').length;
  const totalWorkedHours = records.reduce((sum, r) => sum + liveWorkedHours(r), 0);
  const totalLateMinutes = records.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
  const totalOvertimeHours = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
  const avgWorkedHours = totalRecords > 0 ? totalWorkedHours / totalRecords : 0;

  return {
    totalRecords,
    presentDays,
    lateDays,
    earlyLeaveDays,
    absentDays,
    totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
    avgWorkedHours: Math.round(avgWorkedHours * 100) / 100,
    totalLateMinutes,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    attendanceRate: totalRecords > 0 ? Math.round((presentDays / totalRecords) * 100) : 0,
    records,
  };
};

// Admin uchun: bir kunlik davomat yozuvini qo'lda yaratish/tuzatish.
// 2026-08-12: Feruz so'roviga ko'ra qo'shildi - 10-12 avgust kunlarida
// telefonda yuz aniqlash nosozligi tufayli ko'plab xodimlar umuman
// check-in qila olmagan (Attendance yozuvi butunlay yo'q qolgan), bu esa
// Hisob-kitobda ularga haqiqatda bo'lmagan katta kamomad/qarz chiqarib
// qo'ygan. Admin bu funksiya orqali o'sha kunlar uchun kirish/chiqish
// vaqtini qo'lda kiritib, hisoblarni to'g'irlay oladi.
//
// Xavfsizlik/soddalik uchun: agar shu kun uchun BITTADAN KO'P sessiya
// (bir necha marta kirish-chiqish) mavjud bo'lsa, xato qaytaramiz - bu
// holatda avtomatik "birinchisini tuzatish" chalkash/xato bo'lishi mumkin,
// admin developer bilan bog'lanishi kerak. Oddiy holat (0 yoki 1 sessiya)
// uchun bu funksiya to'liq yetarli.
const adminUpsertAttendance = async ({ userId, date, checkInTime, checkOutTime }) => {
  if (!userId || !date) {
    const error = new Error('userId va date talab qilinadi');
    error.statusCode = 400;
    throw error;
  }
  if (!checkInTime && !checkOutTime) {
    const error = new Error('checkInTime yoki checkOutTime dan kamida bittasi kerak');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { schedule: true },
  });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }
  if (!user.schedule) {
    const error = new Error('Bu xodim uchun ish jadvali sozlanmagan');
    error.statusCode = 400;
    throw error;
  }
  const schedule = user.schedule;

  const dayStart = getWorkDateStart(new Date(date));
  const dayEnd = getWorkDateEnd(new Date(date));

  const checkInDate = checkInTime ? new Date(checkInTime) : null;
  const checkOutDate = checkOutTime ? new Date(checkOutTime) : null;
  if (checkInDate && Number.isNaN(checkInDate.getTime())) {
    const error = new Error("checkInTime yaroqsiz sana formati");
    error.statusCode = 400;
    throw error;
  }
  if (checkOutDate && Number.isNaN(checkOutDate.getTime())) {
    const error = new Error("checkOutTime yaroqsiz sana formati");
    error.statusCode = 400;
    throw error;
  }
  if (checkInDate && checkOutDate && checkOutDate.getTime() <= checkInDate.getTime()) {
    const error = new Error("Chiqish vaqti kirish vaqtidan keyin bo'lishi kerak");
    error.statusCode = 400;
    throw error;
  }

  const existingSessions = await prisma.attendance.findMany({
    where: { userId, workDate: { gte: dayStart, lte: dayEnd } },
    orderBy: { checkInTime: 'asc' },
  });

  if (existingSessions.length > 1) {
    const error = new Error(
      "Bu kun uchun bir nechta sessiya mavjud - avtomatik tuzatish xavfli, developer bilan bog'laning"
    );
    error.statusCode = 400;
    throw error;
  }

  const existing = existingSessions[0] || null;

  let lateMinutes = existing?.lateMinutes || 0;
  if (checkInDate) {
    const scheduleStartMinutes = parseTimeToMinutes(schedule.startTime);
    const checkInMinutes = dateTimeToMinutes(checkInDate);
    lateMinutes = Math.max(0, checkInMinutes - scheduleStartMinutes);
  }

  let earlyLeaveMinutes = existing?.earlyLeaveMinutes || 0;
  let overtimeHours = existing?.overtimeHours || 0;
  if (checkOutDate) {
    let scheduleEndMinutes = parseTimeToMinutes(schedule.endTime);
    const scheduleStartMinutes = parseTimeToMinutes(schedule.startTime);
    if (scheduleEndMinutes <= scheduleStartMinutes) scheduleEndMinutes += 24 * 60; // tungi smena
    const checkoutMinutes = dateTimeToMinutes(checkOutDate);
    earlyLeaveMinutes = 0;
    overtimeHours = 0;
    if (checkoutMinutes < scheduleEndMinutes) {
      earlyLeaveMinutes = scheduleEndMinutes - checkoutMinutes;
    } else if (checkoutMinutes > scheduleEndMinutes) {
      overtimeHours = Math.round(((checkoutMinutes - scheduleEndMinutes) / 60) * 100) / 100;
    }
  }

  let workedHours = existing?.workedHours || 0;
  const effectiveCheckIn = checkInDate || (existing?.checkInTime ? new Date(existing.checkInTime) : null);
  const effectiveCheckOut = checkOutDate || (existing?.checkOutTime ? new Date(existing.checkOutTime) : null);
  if (effectiveCheckIn && effectiveCheckOut) {
    const workedMs = effectiveCheckOut.getTime() - effectiveCheckIn.getTime();
    workedHours = Math.max(0, Math.round((workedMs / (1000 * 60 * 60)) * 100) / 100);
  } else if (!effectiveCheckOut) {
    workedHours = 0;
  }

  let status = 'PRESENT';
  if (!effectiveCheckIn) status = 'ABSENT';
  else if (earlyLeaveMinutes > 0) status = 'EARLY_LEAVE';
  else if (lateMinutes > 0) status = 'LATE';

  const data = {
    scheduleStart: schedule.startTime,
    scheduleEnd: schedule.endTime,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeHours,
    workedHours,
    status,
    // Bu yozuv qo'lda kiritilgan - haqiqiy qurilma orqali GPS/yuz tekshiruvi
    // bo'lmagani uchun bularni tasdiqlangan deb ko'rsatmaymiz (halollik uchun).
    faceVerified: existing?.faceVerified || false,
    gpsVerified: existing?.gpsVerified || false,
  };
  if (checkInDate) data.checkInTime = checkInDate;
  if (checkOutDate) data.checkOutTime = checkOutDate;

  let after;
  if (existing) {
    after = await prisma.attendance.update({ where: { id: existing.id }, data });
  } else {
    after = await prisma.attendance.create({
      data: {
        userId,
        workDate: dayStart,
        ...data,
      },
    });
  }

  logger.info(`Admin davomat tuzatishi: ${userId} (${date})`);
  googleSheetsService.syncAttendance(after).catch(() => {});

  return { before: existing, after };
};

module.exports = {
  checkIn,
  checkOut,
  getAttendanceHistory,
  getTodayStatus,
  getStats,
  adminUpsertAttendance,
};
