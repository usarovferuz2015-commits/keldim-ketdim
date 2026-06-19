const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const scheduleSelect = {
  id: true,
  userId: true,
  scheduleType: true,
  startTime: true,
  endTime: true,
  workDays: true,
  shiftName: true,
  flexibleStart: true,
  flexibleEnd: true,
  isActive: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeId: true,
    },
  },
  createdAt: true,
  updatedAt: true,
};

const getAll = async ({ page = 1, limit = 20, scheduleType, isActive }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
  if (scheduleType) where.scheduleType = scheduleType;

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      select: scheduleSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.schedule.count({ where }),
  ]);

  return {
    data: schedules,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getByUserId = async (userId) => {
  const schedule = await prisma.schedule.findUnique({
    where: { userId },
    select: scheduleSelect,
  });

  if (!schedule) {
    const error = new Error('Jadval topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return schedule;
};

const create = async (userId, data) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const existing = await prisma.schedule.findUnique({ where: { userId } });
  if (existing) {
    const error = new Error('Bu foydalanuvchi uchun jadval mavjud, yangilash orqali o\'zgartiring');
    error.statusCode = 409;
    throw error;
  }

  const scheduleType = data.scheduleType || 'FIXED';

  if (!['FIXED', 'SHIFT', 'FLEXIBLE'].includes(scheduleType)) {
    const error = new Error('Noto\'g\'ri jadval turi. FIXED, SHIFT yoki FLEXIBLE bo\'lishi kerak');
    error.statusCode = 400;
    throw error;
  }

  if (data.workDays && !Array.isArray(data.workDays)) {
    const error = new Error('Ish kunlari massiv ko\'rinishida bo\'lishi kerak');
    error.statusCode = 400;
    throw error;
  }

  const schedule = await prisma.schedule.create({
    data: {
      userId,
      scheduleType,
      startTime: data.startTime || '09:00',
      endTime: data.endTime || '18:00',
      workDays: data.workDays || [1, 2, 3, 4, 5],
      shiftName: scheduleType === 'SHIFT' ? data.shiftName || null : null,
      flexibleStart: scheduleType === 'FLEXIBLE' ? data.flexibleStart || null : null,
      flexibleEnd: scheduleType === 'FLEXIBLE' ? data.flexibleEnd || null : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    select: scheduleSelect,
  });

  logger.info(`Yangi jadval yaratildi: ${schedule.id}, foydalanuvchi: ${userId}`);
  return schedule;
};

const update = async (userId, data) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const existing = await prisma.schedule.findUnique({ where: { userId } });
  if (!existing) {
    const error = new Error('Jadval topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const scheduleType = data.scheduleType || existing.scheduleType;

  if (scheduleType && !['FIXED', 'SHIFT', 'FLEXIBLE'].includes(scheduleType)) {
    const error = new Error('Noto\'g\'ri jadval turi. FIXED, SHIFT yoki FLEXIBLE bo\'lishi kerak');
    error.statusCode = 400;
    throw error;
  }

  if (data.workDays && !Array.isArray(data.workDays)) {
    const error = new Error('Ish kunlari massiv ko\'rinishida bo\'lishi kerak');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.schedule.update({
    where: { userId },
    data: {
      scheduleType: data.scheduleType !== undefined ? data.scheduleType : undefined,
      startTime: data.startTime !== undefined ? data.startTime : undefined,
      endTime: data.endTime !== undefined ? data.endTime : undefined,
      workDays: data.workDays !== undefined ? data.workDays : undefined,
      shiftName: data.shiftName !== undefined ? data.shiftName : (scheduleType === 'SHIFT' ? existing.shiftName : null),
      flexibleStart: data.flexibleStart !== undefined ? data.flexibleStart : (scheduleType === 'FLEXIBLE' ? existing.flexibleStart : null),
      flexibleEnd: data.flexibleEnd !== undefined ? data.flexibleEnd : (scheduleType === 'FLEXIBLE' ? existing.flexibleEnd : null),
      isActive: data.isActive !== undefined ? data.isActive : undefined,
    },
    select: scheduleSelect,
  });

  logger.info(`Jadval yangilandi: ${updated.id}, foydalanuvchi: ${userId}`);
  return updated;
};

const remove = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const schedule = await prisma.schedule.findUnique({ where: { userId } });
  if (!schedule) {
    const error = new Error('Jadval topilmadi');
    error.statusCode = 404;
    throw error;
  }

  await prisma.schedule.delete({ where: { userId } });
  logger.info(`Jadval o\'chirildi, foydalanuvchi: ${userId}`);
  return { userId };
};

module.exports = {
  getAll,
  getByUserId,
  create,
  update,
  remove,
};
