const reportService = require('../services/report.service');
const logger = require('../utils/logger');

const dailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const result = await reportService.generateDailyReport(date);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Kunlik hisobot xatolik:', error.message);
    next(error);
  }
};

const weeklyReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await reportService.generateWeeklyReport(startDate, endDate);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Haftalik hisobot xatolik:', error.message);
    next(error);
  }
};

const monthlyReport = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const result = await reportService.generateMonthlyReport(
      parseInt(year, 10),
      parseInt(month, 10)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Oylik hisobot xatolik:', error.message);
    next(error);
  }
};

const employeeReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await reportService.generateEmployeeReport(
      req.params.userId,
      startDate,
      endDate
    );
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Xodim hisoboti xatolik:', error.message);
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;
    const buffer = await reportService.exportToExcel({ startDate, endDate, type });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=davomat_hisobot_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Excel export xatolik:', error.message);
    next(error);
  }
};

const exportPdf = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;
    const buffer = await reportService.exportToPdf({ startDate, endDate, type });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=davomat_hisobot_${Date.now()}.pdf`);
    res.send(buffer);
  } catch (error) {
    logger.error('PDF export xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  dailyReport,
  weeklyReport,
  monthlyReport,
  employeeReport,
  exportExcel,
  exportPdf,
};
