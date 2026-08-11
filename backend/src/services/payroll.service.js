// Ish haqi / kamomad / otrabotka hisob-kitobi.
//
// Nega alohida modul: attendance.service.js har bir check-in/check-out
// "sessiya"sini (bir juft kirish-chiqish) alohida yozadi - kun davomida xodim
// necha marta chiqib-kirsa, shuncha qator hosil bo'ladi. Bu modul o'sha xom
// sessiyalarni KUNLIK va DAVR (masalan har 10 kunlik ish haqi oralig'i) darajasida
// jamlab, foydali ko'rsatkichlarga aylantiradi: kechikish, tashqarida o'tkazgan
// vaqt (session'lar orasidagi bo'shliq), kamomad (qarz) va shu qarzni administrator
// tasdiqlagan otrabotka orqali qanchalik yopgani.

const prisma = require('../utils/prisma');
const { localMinutesOfDay, localIsoWeekday, localDayStart, localDayEnd } = require('../utils/timezone');

const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Jadval vaqtlari ("09:00" va h.k.) Toshkent mahalliy devor soati sifatida
// kiritiladi - shuning uchun "hozir" ni ham xuddi shu bazada hisoblaymiz
// (bevosita UTC bilan solishtirish kechikishni 300 daqiqaga kam ko'rsatardi).
const dateTimeToMinutes = localMinutesOfDay;
const getDayStart = localDayStart;
const getDayEnd = localDayEnd;
const isoWeekday = localIsoWeekday;

const minutesBetween = (from, to) => Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));

/**
 * Bitta xodim uchun bitta kunning to'liq hisob-kitobi: sessiyalar, ular
 * orasidagi bo'shliqlar (tashqarida o'tkazgan vaqt), kechikish, kamomad,
 * qo'shimcha ishlangan vaqt va kunlik holat.
 *
 * @param {object} user - `schedule` va `hourlyRate` bilan birga yuklangan User
 * @param {Date} dateInput
 */
const computeDaySummary = async (user, dateInput) => {
  const dayStart = getDayStart(dateInput);
  const dayEnd = getDayEnd(dateInput);
  const now = new Date();
  const isToday = dayStart.getTime() === getDayStart(now).getTime();
  const isPast = dayStart.getTime() < getDayStart(now).getTime();

  const base = {
    date: dayStart.toISOString().split('T')[0],
    scheduleStart: user.schedule?.startTime || null,
    scheduleEnd: user.schedule?.endTime || null,
    scheduledMinutes: 0,
    sessions: [],
    gaps: [],
    firstCheckIn: null,
    lastCheckOut: null,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    workedMinutes: 0,
    shortfallMinutes: 0,
    overtimeMinutes: 0,
    inProgress: false,
    status: 'PRESENT',
  };

  if (!user.schedule) {
    return { ...base, status: 'JADVAL_YOQ' };
  }

  const dayOfWeek = isoWeekday(dayStart);
  const isScheduledWorkDay = user.schedule.workDays.includes(dayOfWeek);

  const holiday = await prisma.holiday.findFirst({
    where: { date: { gte: dayStart, lte: dayEnd } },
    select: { id: true, name: true },
  });

  const leave = await prisma.leaveRequest.findFirst({
    where: {
      userId: user.id,
      status: 'APPROVED',
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
    select: { id: true, leaveType: true },
  });

  const scheduleStartMinutes = parseTimeToMinutes(user.schedule.startTime);
  let scheduleEndMinutes = parseTimeToMinutes(user.schedule.endTime);
  if (scheduleEndMinutes <= scheduleStartMinutes) scheduleEndMinutes += 24 * 60; // tungi smena
  const scheduledMinutes = scheduleEndMinutes - scheduleStartMinutes;

  const sessions = await prisma.attendance.findMany({
    where: { userId: user.id, workDate: { gte: dayStart, lte: dayEnd } },
    orderBy: { checkInTime: 'asc' },
    include: { workLocation: { select: { id: true, name: true } } },
  });

  const sessionsOut = sessions.map((s) => {
    const closedAt = s.checkOutTime || (isToday && !s.checkOutTime ? now : null);
    const workedMin = s.checkInTime && closedAt ? minutesBetween(new Date(s.checkInTime), new Date(closedAt)) : 0;
    return {
      id: s.id,
      checkInTime: s.checkInTime,
      checkOutTime: s.checkOutTime,
      workLocation: s.workLocation,
      faceVerified: s.faceVerified,
      livenessVerified: s.livenessVerified,
      workedMinutes: workedMin,
      isOpen: !s.checkOutTime,
    };
  });

  const gaps = [];
  for (let i = 1; i < sessions.length; i++) {
    const prevOut = sessions[i - 1].checkOutTime;
    const nextIn = sessions[i].checkInTime;
    if (prevOut && nextIn) {
      gaps.push({
        fromTime: prevOut,
        toTime: nextIn,
        minutes: minutesBetween(new Date(prevOut), new Date(nextIn)),
      });
    }
  }

  const workedMinutes = sessionsOut.reduce((sum, s) => sum + s.workedMinutes, 0);
  const firstCheckIn = sessions[0]?.checkInTime || null;
  const lastSession = sessions[sessions.length - 1] || null;
  const lastCheckOut = lastSession && !lastSession.checkOutTime ? null : lastSession?.checkOutTime || null;
  const hasOpenSession = sessionsOut.some((s) => s.isOpen);

  let lateMinutes = 0;
  if (firstCheckIn) {
    const firstCheckInMinutes = dateTimeToMinutes(new Date(firstCheckIn));
    lateMinutes = Math.max(0, firstCheckInMinutes - scheduleStartMinutes);
  }

  let earlyLeaveMinutes = 0;
  if (lastCheckOut && !hasOpenSession) {
    const lastCheckOutMinutes = dateTimeToMinutes(new Date(lastCheckOut));
    earlyLeaveMinutes = Math.max(0, scheduleEndMinutes - lastCheckOutMinutes);
  }

  const exempt = !isScheduledWorkDay || !!holiday || !!leave;
  const shortfallMinutes = exempt ? 0 : Math.max(0, scheduledMinutes - workedMinutes);
  const overtimeMinutes = exempt ? 0 : Math.max(0, workedMinutes - scheduledMinutes);

  // Kun "yakunlangan" hisoblanadi agar: barcha sessiyalar yopilgan va (bugun
  // jadval tugash vaqtidan o'tgan YOKI bu bugun emas - o'tgan/kelajak sana),
  // YOKI hali biror sessiya ochiq bo'lmasa ham jadval tugash vaqti allaqachon
  // o'tgan bo'lsa. Aks holda (bugun, jadval tugamagan, oxirgi sessiya yopiq)
  // xodim hali qaytishi mumkin - "tashqarida" holati.
  const allSessionsClosed = sessions.length > 0 && !hasOpenSession;
  const stillWithinScheduleToday = isToday && dateTimeToMinutes(now) < scheduleEndMinutes;
  const dayFinished = allSessionsClosed
    ? !stillWithinScheduleToday
    : isPast || (isToday && dateTimeToMinutes(now) >= scheduleEndMinutes);
  const inProgress = !exempt && !dayFinished;

  let status;
  if (!isScheduledWorkDay) status = 'DAM_OLISH_KUNI';
  else if (holiday) status = 'BAYRAM';
  else if (leave) status = 'TATIL';
  else if (sessions.length === 0) status = isPast || (isToday && dateTimeToMinutes(now) > scheduleStartMinutes + 60) ? 'KELMADI' : 'KUTILMOQDA';
  else if (hasOpenSession) status = 'ISHDA';
  else if (!dayFinished) status = 'TASHQARIDA';
  else if (lateMinutes > 0 && earlyLeaveMinutes > 0) status = 'KECHIKKAN_VA_ERTA_KETGAN';
  else if (lateMinutes > 0) status = 'KECHIKKAN';
  else if (earlyLeaveMinutes > 0) status = 'ERTA_KETGAN';
  else if (gaps.length > 0 && shortfallMinutes > 0) status = 'BOSHLIQ_BOR';
  else status = 'PRESENT';

  return {
    ...base,
    scheduledMinutes,
    sessions: sessionsOut,
    gaps,
    firstCheckIn,
    lastCheckOut,
    lateMinutes,
    earlyLeaveMinutes,
    workedMinutes,
    shortfallMinutes,
    overtimeMinutes,
    inProgress,
    isHoliday: !!holiday,
    holidayName: holiday?.name || null,
    isOnLeave: !!leave,
    status,
  };
};

/**
 * Bir nechta (yoki barcha faol) xodimning BITTA kun uchun to'liq hisobi -
 * dashboardning "bugungi holat" ko'rinishi uchun (kim ishda, kim tashqarida,
 * kim kechikkan va h.k. - real vaqtda).
 */
const getDailyForUsers = async ({ userIds, date }) => {
  const users = await prisma.user.findMany({
    where: {
      id: userIds && userIds.length ? { in: userIds } : undefined,
      role: 'EMPLOYEE',
      isActive: true,
    },
    include: { schedule: true },
    orderBy: { firstName: 'asc' },
  });

  const results = [];
  for (const user of users) {
    const day = await computeDaySummary(user, new Date(date));
    results.push({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      hourlyRate: user.hourlyRate,
      ...day,
    });
  }
  return results;
};

const eachDate = (startDate, endDate) => {
  const dates = [];
  const cur = getDayStart(new Date(startDate));
  const end = getDayStart(new Date(endDate));
  while (cur.getTime() <= end.getTime()) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
};

/**
 * Berilgan davr (masalan 10 kunlik ish haqi oralig'i) uchun bir yoki bir nechta
 * xodimning jamlangan hisobi: jami kechikish, jami kamomad, tasdiqlangan
 * otrabotka bilan qoplangan qismi, qolgan qarz (daqiqa va so'mda).
 */
const getRangeSummary = async ({ userIds, startDate, endDate }) => {
  if (!startDate || !endDate) {
    const error = new Error('startDate va endDate talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const users = await prisma.user.findMany({
    where: {
      id: userIds && userIds.length ? { in: userIds } : undefined,
      role: 'EMPLOYEE',
      isActive: true,
    },
    include: { schedule: true },
    orderBy: { firstName: 'asc' },
  });

  const dates = eachDate(startDate, endDate);

  const approvals = await prisma.overtimeApproval.groupBy({
    by: ['userId'],
    where: {
      userId: { in: users.map((u) => u.id) },
      createdAt: { gte: getDayStart(new Date(startDate)), lte: getDayEnd(new Date(endDate)) },
    },
    _sum: { minutesApplied: true },
  });
  const approvedByUser = new Map(approvals.map((a) => [a.userId, a._sum.minutesApplied || 0]));

  const results = [];
  for (const user of users) {
    let totalScheduledMinutes = 0;
    let totalWorkedMinutes = 0;
    let totalLateMinutes = 0;
    let totalShortfallMinutes = 0;
    let totalOvertimeMinutes = 0;
    let daysAbsent = 0;
    let daysLate = 0;
    let daysWithGaps = 0;

    for (const date of dates) {
      const day = await computeDaySummary(user, date);
      totalScheduledMinutes += day.scheduledMinutes;
      totalWorkedMinutes += day.workedMinutes;
      totalLateMinutes += day.lateMinutes;
      totalShortfallMinutes += day.shortfallMinutes;
      totalOvertimeMinutes += day.overtimeMinutes;
      if (day.status === 'KELMADI') daysAbsent += 1;
      if (day.lateMinutes > 0) daysLate += 1;
      if (day.gaps.length > 0) daysWithGaps += 1;
    }

    const approvedOvertimeMinutesRaw = approvedByUser.get(user.id) || 0;

    // Xavfsizlik chegarasi: admin tasdiqlagan daqiqa naqadar katta bo'lmasin,
    // uning moliyaviy ta'siri (qarzni yopish + ustama) xodim HAQIQATDA ortiqcha
    // ishlagan vaqtdan (qarz + jadvaldan tashqari ishlagan soatlar) oshib
    // ketmasligi kerak - aks holda operator xatosi (masalan noto'g'ri son
    // kiritish) "havodan" pul yaratib qo'yishi mumkin edi.
    // 2026-08-11: Feruz so'roviga ko'ra qo'shildi - jadvaldan tashqari
    // ishlangan soatlar endi faqat qarzni yopish uchun emas, balki qarzdan
    // ortiqcha qismi xodimning soatbay stavkasi bo'yicha ALOHIDA USTAMA
    // sifatida ham qo'shiladi (avvalgidek "otrabotka" faqat qarzni kamaytirar,
    // ortig'i hech qanday ta'sir qilmasdan yo'qolib ketardi).
    const approvedOvertimeMinutes = Math.min(
      approvedOvertimeMinutesRaw,
      totalShortfallMinutes + totalOvertimeMinutes
    );

    const outstandingDebtMinutes = Math.max(0, totalShortfallMinutes - approvedOvertimeMinutes);
    const outstandingDebtAmount =
      user.hourlyRate != null ? Math.round((outstandingDebtMinutes / 60) * user.hourlyRate) : null;

    // Tasdiqlangan otrabotka avval qarzni yopadi; qolgan (agar bo'lsa) qismi
    // ustama - xodimning ANKETASIDAGI soatbay stavkasi bo'yicha to'g'ridan-to'g'ri
    // qo'shiladi (masalan stavka 10 000 so'm/soat bo'lsa, 2 soat ustama = 20 000 so'm).
    const bonusOvertimeMinutes = Math.max(0, approvedOvertimeMinutes - totalShortfallMinutes);
    const bonusPay =
      user.hourlyRate != null ? Math.round((bonusOvertimeMinutes / 60) * user.hourlyRate) : null;

    // Admin panelida "hali tasdiqlash mumkin bo'lgan" miqdorni ko'rsatish uchun
    // (tugmani yoqish/o'chirish va modal'dagi standart qiymat uchun ham ishlatiladi)
    const approvableOvertimeMinutes = Math.max(
      0,
      totalShortfallMinutes + totalOvertimeMinutes - approvedOvertimeMinutesRaw
    );

    const estimatedPay =
      user.hourlyRate != null
        ? Math.round(((totalScheduledMinutes - outstandingDebtMinutes) / 60) * user.hourlyRate) +
          (bonusPay || 0)
        : null;

    results.push({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      hourlyRate: user.hourlyRate,
      totalScheduledMinutes,
      totalWorkedMinutes,
      totalLateMinutes,
      totalShortfallMinutes,
      totalOvertimeMinutes,
      approvedOvertimeMinutes,
      approvableOvertimeMinutes,
      bonusOvertimeMinutes,
      bonusPay,
      outstandingDebtMinutes,
      outstandingDebtAmount,
      estimatedPay,
      daysAbsent,
      daysLate,
      daysWithGaps,
    });
  }

  return results;
};

const approveOvertime = async ({ approvedById, userId, minutesApplied, note }) => {
  if (!userId || !Number.isFinite(minutesApplied) || minutesApplied <= 0) {
    const error = new Error('userId va musbat minutesApplied talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const approval = await prisma.overtimeApproval.create({
    data: {
      userId,
      approvedById,
      minutesApplied: Math.round(minutesApplied),
      note: note || null,
    },
  });

  return approval;
};

const listOvertimeApprovals = async ({ userId, startDate, endDate }) => {
  const where = {};
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = getDayStart(new Date(startDate));
    if (endDate) where.createdAt.lte = getDayEnd(new Date(endDate));
  }

  return prisma.overtimeApproval.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
};

module.exports = {
  computeDaySummary,
  getDailyForUsers,
  getRangeSummary,
  approveOvertime,
  listOvertimeApprovals,
};
