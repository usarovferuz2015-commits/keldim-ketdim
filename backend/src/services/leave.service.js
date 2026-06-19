const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const leaveInclude = {
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
};

const getAll = async ({ page = 1, limit = 20, userId, status, leaveType }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (leaveType) where.leaveType = leaveType;

  const [data, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: leaveInclude,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

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

const getById = async (id) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: leaveInclude,
  });

  if (!leave) {
    const error = new Error('Ariza topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return leave;
};

const create = async (userId, data) => {
  const { leaveType, startDate, endDate, reason } = data;

  if (!leaveType || !startDate || !endDate) {
    const error = new Error('Dam olish turi, boshlanish va tugash sanalari talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const error = new Error('Noto\'g\'ri sana formati');
    error.statusCode = 400;
    throw error;
  }

  if (start > end) {
    const error = new Error('Boshlanish sanasi tugash sanasidan keyin bo\'lishi mumkin emas');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  if (start < now) {
    const error = new Error('O\'tgan sana uchun ariza yaratib bo\'lmaydi');
    error.statusCode = 400;
    throw error;
  }

  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: { in: ['APPROVED', 'PENDING'] },
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
    },
  });

  if (overlapping) {
    const error = new Error('Bu sana oralig\'ida allaqachon ariza mavjud');
    error.statusCode = 409;
    throw error;
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason || null,
    },
    include: leaveInclude,
  });

  logger.info(`Dam olish arizasi yaratildi: ${leave.id} (${userId})`);
  return leave;
};

const updateStatus = async (id, status, rejectedReason, approvedBy) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });

  if (!leave) {
    const error = new Error('Ariza topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (leave.status !== 'PENDING') {
    const error = new Error('Faqat PENDING holatidagi arizalarni yangilash mumkin');
    error.statusCode = 400;
    throw error;
  }

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    const error = new Error('Holat APPROVED yoki REJECTED bo\'lishi kerak');
    error.statusCode = 400;
    throw error;
  }

  if (status === 'REJECTED' && !rejectedReason) {
    const error = new Error('Rad etish sababi ko\'rsatilishi kerak');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      approvedBy: status === 'APPROVED' ? approvedBy : null,
      rejectedReason: status === 'REJECTED' ? rejectedReason : null,
    },
    include: leaveInclude,
  });

  if (status === 'APPROVED') {
    await prisma.attendance.updateMany({
      where: {
        userId: leave.userId,
        workDate: {
          gte: leave.startDate,
          lte: leave.endDate,
        },
        status: 'ABSENT',
      },
      data: { status: 'ON_LEAVE' },
    });
  }

  logger.info(`Ariza holati yangilandi: ${id} -> ${status}`);
  return updated;
};

const remove = async (id, userId) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });

  if (!leave) {
    const error = new Error('Ariza topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (leave.userId !== userId) {
    const error = new Error('Faqat o\'z arizangizni o\'chirishingiz mumkin');
    error.statusCode = 403;
    throw error;
  }

  if (leave.status === 'APPROVED') {
    const error = new Error('Tasdiqlangan arizani o\'chirib bo\'lmaydi');
    error.statusCode = 400;
    throw error;
  }

  await prisma.leaveRequest.delete({ where: { id } });
  logger.info(`Ariza o\'chirildi: ${id}`);

  return { id };
};

module.exports = {
  getAll,
  getById,
  create,
  updateStatus,
  remove,
};
