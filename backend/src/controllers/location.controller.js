const locationService = require('../services/location.service');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, search, isActive, departmentId } = req.query;
    const result = await locationService.getAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      isActive,
      departmentId,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Lokatsiyalar ro\'yxatini olish xatolik:', error.message);
    next(error);
  }
};

const getActive = async (req, res, next) => {
  try {
    const locations = await locationService.getActive();
    res.json({ success: true, data: locations });
  } catch (error) {
    logger.error('Faol lokatsiyalarni olish xatolik:', error.message);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const location = await locationService.getById(req.params.id);
    res.json({ success: true, data: location });
  } catch (error) {
    logger.error('Lokatsiya ma\'lumotini olish xatolik:', error.message);
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const location = await locationService.create(req.body);
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    logger.error('Lokatsiya yaratish xatolik:', error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const location = await locationService.update(req.params.id, req.body);
    res.json({ success: true, data: location });
  } catch (error) {
    logger.error('Lokatsiya yangilash xatolik:', error.message);
    next(error);
  }
};

const deleteLocation = async (req, res, next) => {
  try {
    const result = await locationService.remove(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Lokatsiya o\'chirish xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getAll,
  getActive,
  getById,
  create,
  update,
  delete: deleteLocation,
};
