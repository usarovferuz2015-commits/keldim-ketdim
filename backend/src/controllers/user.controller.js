const userService = require('../services/user.service');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, search, role, isActive, departmentId } = req.query;
    const result = await userService.getAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      role,
      isActive,
      departmentId,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Foydalanuvchilar ro\'yxatini olish xatolik:', error.message);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Foydalanuvchi ma\'lumotini olish xatolik:', error.message);
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    logger.error('Foydalanuvchi yaratish xatolik:', error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Foydalanuvchi yangilash xatolik:', error.message);
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.remove(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Foydalanuvchi o\'chirish xatolik:', error.message);
    next(error);
  }
};

const getFaceTemplate = async (req, res, next) => {
  try {
    const result = await userService.getFaceTemplate(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Face template olish xatolik:', error.message);
    next(error);
  }
};

const saveFaceTemplate = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Rasm fayli talab qilinadi',
      });
    }
    const faceDescriptor = req.body.faceDescriptor ? JSON.parse(req.body.faceDescriptor) : null;
    const result = await userService.saveFaceTemplate(req.params.id, req.file.buffer, faceDescriptor);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Face template saqlash xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteUser,
  getFaceTemplate,
  saveFaceTemplate,
};
