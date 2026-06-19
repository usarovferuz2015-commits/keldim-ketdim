const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

const getSummary = async () => {
  const { start, end } = getTodayRange();

  const [totalEmployees, todayAttendances, currentlyWorking, todayLate] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.attendance.count({
      where: { workDate: { gte: start, lte: end }, checkInTime: { not: null } },
    }),
    prisma.attendance.count({
      where: { workDate: { gte: start, lte: end }, checkInTime: { not: null }, checkOutTime: null },
    }),
    prisma.attendance.count({
      where: { workDate: { gte: start, lte: end }, lateMinutes: { gt: 0 } },
    }),
  ]);

  const absentToday = Math.max(0, totalEmployees - todayAttendances);
  const attendanceRate = totalEmployees > 0
    ? Math.round((todayAttendances / totalEmployees) * 100)
    : 0;

  return {
    totalEmployees,
    presentToday: todayAttendances,
    absentToday,
    currentlyWorking,
    lateToday: todayLate,
    attendanceRate,
    onLeaveToday: 0,
    date: start.toISOString().split('T')[0],
  };
};

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  employeeId: true,
  photoUrl: true,
  department: { select: { id: true, name: true } },
};

const getPresentToday = async () => {
  const { start, end } = getTodayRange();

  const attendances = await prisma.attendance.findMany({
    where: {
      workDate: { gte: start, lte: end },
      checkInTime: { not: null },
    },
    include: {
      user: { select: userSelect },
      workLocation: { select: { id: true, name: true } },
    },
    orderBy: { checkInTime: 'asc' },
  });

  return attendances.map((a) => ({
    id: a.id,
    checkInTime: a.checkInTime,
    checkOutTime: a.checkOutTime,
    lateMinutes: a.lateMinutes,
    status: a.status,
    user: a.user,
    workLocation: a.workLocation,
  }));
};

const getAbsentToday = async () => {
  const { start, end } = getTodayRange();

  const todayAttendances = await prisma.attendance.findMany({
    where: {
      workDate: { gte: start, lte: end },
    },
    select: { userId: true },
  });

  const presentUserIds = todayAttendances.map((a) => a.userId);

  const absentUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { notIn: presentUserIds },
    },
    select: userSelect,
    orderBy: { firstName: 'asc' },
  });

  return absentUsers;
};

const getCurrentlyWorking = async () => {
  const { start, end } = getTodayRange();

  const attendances = await prisma.attendance.findMany({
    where: {
      workDate: { gte: start, lte: end },
      checkInTime: { not: null },
      checkOutTime: null,
    },
    include: {
      user: { select: userSelect },
      workLocation: { select: { id: true, name: true } },
    },
    orderBy: { checkInTime: 'asc' },
  });

  return attendances.map((a) => ({
    id: a.id,
    checkInTime: a.checkInTime,
    lateMinutes: a.lateMinutes,
    status: a.status,
    user: a.user,
    workLocation: a.workLocation,
  }));
};

const getLateToday = async () => {
  const { start, end } = getTodayRange();

  const attendances = await prisma.attendance.findMany({
    where: {
      workDate: { gte: start, lte: end },
      lateMinutes: { gt: 0 },
    },
    include: {
      user: { select: userSelect },
      workLocation: { select: { id: true, name: true } },
    },
    orderBy: { lateMinutes: 'desc' },
  });

  return attendances.map((a) => ({
    id: a.id,
    checkInTime: a.checkInTime,
    checkOutTime: a.checkOutTime,
    lateMinutes: a.lateMinutes,
    status: a.status,
    user: a.user,
    workLocation: a.workLocation,
  }));
};

const getAttendanceRate = async () => {
  const now = new Date();
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 30);
  start.setUTCHours(0, 0, 0, 0);

  const attendances = await prisma.attendance.findMany({
    where: {
      workDate: { gte: start, lte: end },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          employeeId: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { workDate: 'asc' },
  });

  const totalActiveUsers = await prisma.user.count({ where: { isActive: true } });

  const userStats = {};
  for (const a of attendances) {
    const uid = a.userId;
    if (!userStats[uid]) {
      userStats[uid] = {
        user: a.user,
        presentDays: 0,
        totalDays: 0,
      };
    }
    userStats[uid].totalDays++;
    if (['PRESENT', 'LATE', 'EARLY_LEAVE'].includes(a.status)) {
      userStats[uid].presentDays++;
    }
  }

  const employees = Object.values(userStats).map((s) => ({
    ...s,
    rate: s.totalDays > 0 ? Math.round((s.presentDays / s.totalDays) * 10000) / 100 : 0,
  }));

  const overallPresent = employees.reduce((sum, e) => sum + e.presentDays, 0);
  const overallTotal = employees.reduce((sum, e) => sum + e.totalDays, 0);
  const overallRate = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 10000) / 100 : 0;

  return {
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    days: 30,
    totalActiveUsers,
    overallRate,
    overallPresentDays: overallPresent,
    overallTotalDays: overallTotal,
    employees,
  };
};

module.exports = {
  getSummary,
  getPresentToday,
  getAbsentToday,
  getCurrentlyWorking,
  getLateToday,
  getAttendanceRate,
};
