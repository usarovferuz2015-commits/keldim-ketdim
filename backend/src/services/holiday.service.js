const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const getAll = async ({ page = 1, limit = 50, year = null }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (year) {
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    where.date = { gte: startOfYear, lte: endOfYear };
  }

  const [data, total] = await Promise.all([
    prisma.holiday.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'asc' },
    }),
    prisma.holiday.count({ where }),
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
  const holiday = await prisma.holiday.findUnique({ where: { id } });

  if (!holiday) {
    const error = new Error('Bayram topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return holiday;
};

const create = async (data) => {
  const { name, date, description, isRecurring } = data;

  if (!name || !date) {
    const error = new Error('Bayram nomi va sanasi talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    const error = new Error('Noto\'g\'ri sana formati');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.holiday.findFirst({
    where: {
      date: parsedDate,
      isRecurring: isRecurring || false,
    },
  });

  if (existing) {
    const error = new Error('Bu sana uchun bayram allaqachon mavjud');
    error.statusCode = 409;
    throw error;
  }

  const holiday = await prisma.holiday.create({
    data: {
      name,
      date: parsedDate,
      description: description || null,
      isRecurring: isRecurring || false,
    },
  });

  logger.info(`Bayram yaratildi: ${holiday.id} - ${name}`);
  return holiday;
};

const update = async (id, data) => {
  const holiday = await prisma.holiday.findUnique({ where: { id } });

  if (!holiday) {
    const error = new Error('Bayram topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;

  if (data.date !== undefined) {
    const parsedDate = new Date(data.date);
    if (isNaN(parsedDate.getTime())) {
      const error = new Error('Noto\'g\'ri sana formati');
      error.statusCode = 400;
      throw error;
    }

    const existing = await prisma.holiday.findFirst({
      where: {
        date: parsedDate,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : holiday.isRecurring,
        id: { not: id },
      },
    });

    if (existing) {
      const error = new Error('Bu sana uchun bayram allaqachon mavjud');
      error.statusCode = 409;
      throw error;
    }

    updateData.date = parsedDate;
  }

  const updated = await prisma.holiday.update({
    where: { id },
    data: updateData,
  });

  logger.info(`Bayram yangilandi: ${id}`);
  return updated;
};

const remove = async (id) => {
  const holiday = await prisma.holiday.findUnique({ where: { id } });

  if (!holiday) {
    const error = new Error('Bayram topilmadi');
    error.statusCode = 404;
    throw error;
  }

  await prisma.holiday.delete({ where: { id } });
  logger.info(`Bayram o\'chirildi: ${id}`);

  return { id };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
