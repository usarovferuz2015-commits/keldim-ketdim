const departmentService = require('../services/department.service');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, search, isActive } = req.query;
    const result = await departmentService.getAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      isActive,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Bo\'limlar ro\'yxatini olish xatolik:', error.message);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const department = await departmentService.getById(req.params.id);
    res.json({ success: true, data: department });
  } catch (error) {
    logger.error('Bo\'lim ma\'lumotini olish xatolik:', error.message);
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const department = await departmentService.create(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    logger.error('Bo\'lim yaratish xatolik:', error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const department = await departmentService.update(req.params.id, req.body);
    res.json({ success: true, data: department });
  } catch (error) {
    logger.error('Bo\'lim yangilash xatolik:', error.message);
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const result = await departmentService.remove(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bo\'lim o\'chirish xatolik:', error.message);
    next(error);
  }
};

const getEmployees = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await departmentService.getEmployees(req.params.id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Bo\'lim xodimlarini olish xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteDepartment,
  getEmployees,
};
