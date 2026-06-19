const leaveService = require('../services/leave.service');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, userId, status, leaveType } = req.query;
    const result = await leaveService.getAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      userId,
      status,
      leaveType,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Barcha arizalarni olish xatolik:', error.message);
    next(error);
  }
};

const getMyLeaves = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await leaveService.getAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      userId: req.user.id,
      status,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('O\'z arizalarini olish xatolik:', error.message);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await leaveService.getById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Ariza ma\'lumotini olish xatolik:', error.message);
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await leaveService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Ariza yaratish xatolik:', error.message);
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, rejectedReason } = req.body;
    const result = await leaveService.updateStatus(req.params.id, status, rejectedReason, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Ariza holatini yangilash xatolik:', error.message);
    next(error);
  }
};

const deleteLeave = async (req, res, next) => {
  try {
    const result = await leaveService.remove(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Ariza o\'chirish xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getAll,
  getMyLeaves,
  getById,
  create,
  updateStatus,
  delete: deleteLeave,
};
