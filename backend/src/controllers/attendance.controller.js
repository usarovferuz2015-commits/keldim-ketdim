const attendanceService = require('../services/attendance.service');
const logger = require('../utils/logger');

const checkIn = async (req, res, next) => {
  try {
    const result = await attendanceService.checkIn(req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Check-in xatolik:', error.message);
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const result = await attendanceService.checkOut(req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Check-out xatolik:', error.message);
    next(error);
  }
};

const getMyAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate, page, limit } = req.query;
    const result = await attendanceService.getAttendanceHistory({
      userId: req.user.id,
      startDate,
      endDate,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Davomat tarixini olish xatolik:', error.message);
    next(error);
  }
};

const getTodayStatus = async (req, res, next) => {
  try {
    const result = await attendanceService.getTodayStatus(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bugungi davomat holati xatolik:', error.message);
    next(error);
  }
};

const getMyStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await attendanceService.getStats({
      userId: req.user.id,
      startDate,
      endDate,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Statistika olish xatolik:', error.message);
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, status, page, limit } = req.query;
    const result = await attendanceService.getAttendanceHistory({
      userId,
      startDate,
      endDate,
      status,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Barcha davomatlarni olish xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getTodayStatus,
  getMyStats,
  getAll,
};
