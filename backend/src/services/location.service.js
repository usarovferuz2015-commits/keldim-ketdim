const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const locationSelect = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
  radiusMeters: true,
  isActive: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
};

const getAll = async ({ page = 1, limit = 20, search, isActive, departmentId }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [locations, total] = await Promise.all([
    prisma.workLocation.findMany({
      where,
      select: locationSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workLocation.count({ where }),
  ]);

  return {
    data: locations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getActive = async () => {
  const locations = await prisma.workLocation.findMany({
    where: { isActive: true },
    select: locationSelect,
    orderBy: { createdAt: 'desc' },
  });

  return locations;
};

const getById = async (id) => {
  const location = await prisma.workLocation.findUnique({
    where: { id },
    select: locationSelect,
  });

  if (!location) {
    const error = new Error('Lokatsiya topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return location;
};

const create = async (data) => {
  if (data.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) {
      const error = new Error('Bo\'lim topilmadi');
      error.statusCode = 404;
      throw error;
    }
  }

  const location = await prisma.workLocation.create({
    data: {
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters || 100,
      isActive: data.isActive !== undefined ? data.isActive : true,
      departmentId: data.departmentId || null,
    },
    select: locationSelect,
  });

  logger.info(`Yangi lokatsiya yaratildi: ${location.id}`);
  return location;
};

const update = async (id, data) => {
  const location = await prisma.workLocation.findUnique({ where: { id } });
  if (!location) {
    const error = new Error('Lokatsiya topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (data.departmentId !== undefined && data.departmentId !== null) {
    if (data.departmentId !== location.departmentId) {
      const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!department) {
        const error = new Error('Bo\'lim topilmadi');
        error.statusCode = 404;
        throw error;
      }
    }
  }

  const updated = await prisma.workLocation.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      latitude: data.latitude !== undefined ? data.latitude : undefined,
      longitude: data.longitude !== undefined ? data.longitude : undefined,
      radiusMeters: data.radiusMeters !== undefined ? data.radiusMeters : undefined,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
      departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
    },
    select: locationSelect,
  });

  logger.info(`Lokatsiya yangilandi: ${id}`);
  return updated;
};

const remove = async (id) => {
  const location = await prisma.workLocation.findUnique({ where: { id } });
  if (!location) {
    const error = new Error('Lokatsiya topilmadi');
    error.statusCode = 404;
    throw error;
  }

  await prisma.workLocation.delete({ where: { id } });
  logger.info(`Lokatsiya o\'chirildi: ${id}`);
  return { id };
};

module.exports = {
  getAll,
  getActive,
  getById,
  create,
  update,
  remove,
};
