const holidayService = require('../services/holiday.service');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, year } = req.query;
    const result = await holidayService.getAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
      year: year ? parseInt(year, 10) : null,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Bayramlar ro\'yxatini olish xatolik:', error.message);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await holidayService.getById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bayram ma\'lumotini olish xatolik:', error.message);
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await holidayService.create(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Bayram yaratish xatolik:', error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await holidayService.update(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bayram yangilash xatolik:', error.message);
    next(error);
  }
};

const deleteHoliday = async (req, res, next) => {
  try {
    const result = await holidayService.remove(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bayram o\'chirish xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteHoliday,
};
