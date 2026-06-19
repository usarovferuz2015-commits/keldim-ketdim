const scheduleService = require('../services/schedule.service');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, scheduleType, isActive } = req.query;
    const result = await scheduleService.getAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      scheduleType,
      isActive,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Jadvallar ro\'yxatini olish xatolik:', error.message);
    next(error);
  }
};

const getMySchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.getByUserId(req.user.id);
    res.json({ success: true, data: schedule });
  } catch (error) {
    logger.error('Shaxsiy jadvalni olish xatolik:', error.message);
    next(error);
  }
};

const getByUserId = async (req, res, next) => {
  try {
    const schedule = await scheduleService.getByUserId(req.params.userId);
    res.json({ success: true, data: schedule });
  } catch (error) {
    logger.error('Foydalanuvchi jadvalini olish xatolik:', error.message);
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const schedule = await scheduleService.create(req.params.userId, req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    logger.error('Jadval yaratish xatolik:', error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const schedule = await scheduleService.update(req.params.userId, req.body);
    res.json({ success: true, data: schedule });
  } catch (error) {
    logger.error('Jadval yangilash xatolik:', error.message);
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.remove(req.params.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Jadval o\'chirish xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getAll,
  getMySchedule,
  getByUserId,
  create,
  update,
  delete: deleteSchedule,
};
