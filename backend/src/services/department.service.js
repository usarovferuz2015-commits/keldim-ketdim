const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const departmentSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  _count: { select: { users: true } },
  createdAt: true,
  updatedAt: true,
};

const getAll = async ({ page = 1, limit = 20, search, isActive }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      select: departmentSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.department.count({ where }),
  ]);

  return {
    data: departments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const department = await prisma.department.findUnique({
    where: { id },
    select: departmentSelect,
  });

  if (!department) {
    const error = new Error('Bo\'lim topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return department;
};

const create = async (data) => {
  const existing = await prisma.department.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    const error = new Error('Bu nom bilan bo\'lim mavjud');
    error.statusCode = 409;
    throw error;
  }

  const department = await prisma.department.create({
    data: {
      name: data.name,
      description: data.description || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    select: departmentSelect,
  });

  logger.info(`Yangi bo\'lim yaratildi: ${department.id}`);
  return department;
};

const update = async (id, data) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    const error = new Error('Bo\'lim topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (data.name && data.name !== department.name) {
    const existing = await prisma.department.findUnique({ where: { name: data.name } });
    if (existing) {
      const error = new Error('Bu nom bilan bo\'lim mavjud');
      error.statusCode = 409;
      throw error;
    }
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      description: data.description !== undefined ? data.description : undefined,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
    },
    select: departmentSelect,
  });

  logger.info(`Bo\'lim yangilandi: ${id}`);
  return updated;
};

const remove = async (id) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    const error = new Error('Bo\'lim topilmadi');
    error.statusCode = 404;
    throw error;
  }

  await prisma.department.delete({ where: { id } });
  logger.info(`Bo\'lim o\'chirildi: ${id}`);
  return { id };
};

const getEmployees = async (id, { page = 1, limit = 20 }) => {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    const error = new Error('Bo\'lim topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: id },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        employeeId: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: { departmentId: id } }),
  ]);

  return {
    data: employees,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getEmployees,
};
