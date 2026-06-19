const dashboardService = require('../services/dashboard.service');
const logger = require('../utils/logger');

const getSummary = async (req, res, next) => {
  try {
    const result = await dashboardService.getSummary();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Dashboard xulosasi xatolik:', error.message);
    next(error);
  }
};

const getPresentToday = async (req, res, next) => {
  try {
    const result = await dashboardService.getPresentToday();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bugun kelganlar ro\'yxati xatolik:', error.message);
    next(error);
  }
};

const getAbsentToday = async (req, res, next) => {
  try {
    const result = await dashboardService.getAbsentToday();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bugun kelmaganlar ro\'yxati xatolik:', error.message);
    next(error);
  }
};

const getCurrentlyWorking = async (req, res, next) => {
  try {
    const result = await dashboardService.getCurrentlyWorking();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Hozir ishlayotganlar ro\'yxati xatolik:', error.message);
    next(error);
  }
};

const getLateToday = async (req, res, next) => {
  try {
    const result = await dashboardService.getLateToday();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Bugun kechikkanlar ro\'yxati xatolik:', error.message);
    next(error);
  }
};

const getAttendanceRate = async (req, res, next) => {
  try {
    const result = await dashboardService.getAttendanceRate();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Davomat foizi xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getSummary,
  getPresentToday,
  getAbsentToday,
  getCurrentlyWorking,
  getLateToday,
  getAttendanceRate,
};
