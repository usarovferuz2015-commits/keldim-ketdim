const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const config = require('../config');
const geofenceService = require('./geofence.service');
const googleSheetsService = require('./googleSheets.service');

const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const dateTimeToMinutes = (date) => {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

const getWorkDateStart = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getWorkDateEnd = (date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const checkIn = async (userId, data) => {
  const { latitude, longitude, faceVerified, livenessVerified } = data;
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

  const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
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

  const workLocation = await geofenceService.findNearestLocation(latitude, longitude);
  if (!workLocation) {
    if (config.nodeEnv === 'production') {
      const error = new Error('Siz hech qaysi ish joyi radiusida emassiz');
      error.statusCode = 400;
      throw error;
    }
    logger.info('Check-in test rejimi');
  }

  const scheduleStartMinutes = parseTimeToMinutes(schedule.startTime);
  const currentMinutes = dateTimeToMinutes(now);
  let lateMinutes = 0;
  let status = 'PRESENT';

  if (currentMinutes > scheduleStartMinutes) {
    lateMinutes = currentMinutes - scheduleStartMinutes;
    status = 'LATE';
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
      workLocationId: workLocation.id,
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
  const { latitude, longitude, faceVerified, livenessVerified } = data;
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
      workLocationId: attendance.workLocationId || workLocation.id,
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
    if (startDate) where.workDate.gte = new Date(startDate);
    if (endDate) where.workDate.lte = new Date(endDate);
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

  return {
    data: records,
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

  const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
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
    if (startDate) where.workDate.gte = new Date(startDate);
    if (endDate) where.workDate.lte = new Date(endDate);
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

  const totalRecords = records.length;
  const presentDays = records.filter((r) => r.status === 'PRESENT').length;
  const lateDays = records.filter((r) => r.status === 'LATE' || r.lateMinutes > 0).length;
  const earlyLeaveDays = records.filter((r) => r.status === 'EARLY_LEAVE' || r.earlyLeaveMinutes > 0).length;
  const absentDays = records.filter((r) => r.status === 'ABSENT').length;
  const totalWorkedHours = records.reduce((sum, r) => sum + (r.workedHours || 0), 0);
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

module.exports = {
  checkIn,
  checkOut,
  getAttendanceHistory,
  getTodayStatus,
  getStats,
};
