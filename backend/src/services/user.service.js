const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const userSelect = {
  id: true,
  telegramId: true,
  firstName: true,
  lastName: true,
  username: true,
  phoneNumber: true,
  photoUrl: true,
  role: true,
  isActive: true,
  employeeId: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  schedule: { select: { id: true, startTime: true, endTime: true, scheduleType: true, workDays: true } },
  faceTemplate: true,
  faceTemplateData: true,
  createdAt: true,
  updatedAt: true,
};

const getAll = async ({ page = 1, limit = 20, search, role, isActive, departmentId }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { employeeId: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const create = async (data) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramId: data.telegramId },
        ...(data.employeeId ? [{ employeeId: data.employeeId }] : []),
        ...(data.email ? [{ email: data.email }] : []),
      ],
    },
  });

  if (existing) {
    const error = new Error(
      existing.telegramId === data.telegramId
        ? 'Bu Telegram ID bilan foydalanuvchi mavjud'
        : existing.email === data.email
        ? 'Bu email bilan foydalanuvchi mavjud'
        : 'Bu xodim ID bilan foydalanuvchi mavjud'
    );
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = data.password ? bcrypt.hashSync(data.password, 10) : null;

  const user = await prisma.user.create({
    data: {
      telegramId: data.telegramId,
      email: data.email || null,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName || null,
      username: data.username || null,
      phoneNumber: data.phoneNumber || null,
      photoUrl: data.photoUrl || null,
      role: data.role || 'EMPLOYEE',
      employeeId: data.employeeId || null,
      departmentId: data.departmentId || null,
    },
    select: userSelect,
  });

  logger.info(`Yangi foydalanuvchi yaratildi: ${user.id}`);
  return user;
};

const update = async (id, data) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (data.employeeId && data.employeeId !== user.employeeId) {
    const existing = await prisma.user.findUnique({ where: { employeeId: data.employeeId } });
    if (existing) {
      const error = new Error('Bu xodim ID bilan foydalanuvchi mavjud');
      error.statusCode = 409;
      throw error;
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      firstName: data.firstName !== undefined ? data.firstName : undefined,
      lastName: data.lastName !== undefined ? data.lastName : undefined,
      email: data.email !== undefined ? data.email : undefined,
      passwordHash: data.password ? bcrypt.hashSync(data.password, 10) : undefined,
      username: data.username !== undefined ? data.username : undefined,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : undefined,
      photoUrl: data.photoUrl !== undefined ? data.photoUrl : undefined,
      role: data.role !== undefined ? data.role : undefined,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
      employeeId: data.employeeId !== undefined ? data.employeeId : undefined,
      departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
    },
    select: userSelect,
  });

  logger.info(`Foydalanuvchi yangilandi: ${id}`);
  return updated;
};

const remove = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  await prisma.user.delete({ where: { id } });
  logger.info(`Foydalanuvchi o\'chirildi: ${id}`);
  return { id };
};

const getFaceTemplate = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, faceTemplate: true, faceTemplateData: true },
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const saveFaceTemplate = async (id, faceImageBuffer, faceDescriptor) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const base64Image = faceImageBuffer.toString('base64');

  const updated = await prisma.user.update({
    where: { id },
    data: {
      faceTemplate: base64Image,
      faceTemplateData: faceDescriptor || null,
    },
    select: { id: true, faceTemplate: true, faceTemplateData: true, updatedAt: true },
  });

  logger.info(`Face template saqlandi: ${id}`);
  return updated;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getFaceTemplate,
  saveFaceTemplate,
};
