const payrollService = require('../services/payroll.service');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const getSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    let userIds;
    if (req.user.role === 'ADMIN') {
      userIds = userId ? [userId] : undefined;
    } else {
      // Xodim faqat o'zining hisobini ko'ra oladi
      userIds = [req.user.id];
    }

    const result = await payrollService.getRangeSummary({ userIds, startDate: start, endDate: end });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Payroll summary xatolik:', error.message);
    next(error);
  }
};

const getDaily = async (req, res, next) => {
  try {
    const { date, userId } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    if (req.user.role !== 'ADMIN' && userId && userId !== req.user.id) {
      const error = new Error('Bu amal uchun ruxsat yo\'q');
      error.statusCode = 403;
      throw error;
    }

    // Admin userId bermasa - barcha faol xodimlarning shu kunlik holati
    // (dashboardning "bugungi holat" jadvali uchun)
    if (req.user.role === 'ADMIN' && !userId) {
      const result = await payrollService.getDailyForUsers({ date: targetDate });
      res.json({ success: true, data: result });
      return;
    }

    const targetUserId = req.user.role === 'ADMIN' && userId ? userId : req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { schedule: true },
    });

    if (!user) {
      const error = new Error('Foydalanuvchi topilmadi');
      error.statusCode = 404;
      throw error;
    }

    const result = await payrollService.computeDaySummary(user, targetDate);
    res.json({ success: true, data: { userId: user.id, firstName: user.firstName, lastName: user.lastName, ...result } });
  } catch (error) {
    logger.error('Kunlik hisob xatolik:', error.message);
    next(error);
  }
};

const approveOvertime = async (req, res, next) => {
  try {
    const { userId, minutesApplied, note } = req.body;
    const result = await payrollService.approveOvertime({
      approvedById: req.user.id,
      userId,
      minutesApplied: Number(minutesApplied),
      note,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Otrabotka tasdiqlash xatolik:', error.message);
    next(error);
  }
};

const getOvertimeApprovals = async (req, res, next) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const targetUserId = req.user.role === 'ADMIN' ? userId : req.user.id;
    const result = await payrollService.listOvertimeApprovals({ userId: targetUserId, startDate, endDate });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Otrabotka tarixi xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getSummary,
  getDaily,
  approveOvertime,
  getOvertimeApprovals,
};
