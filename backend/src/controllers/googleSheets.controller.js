const prisma = require('../utils/prisma');
const googleSheetsService = require('../services/googleSheets.service');
const logger = require('../utils/logger');

const syncNow = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { department: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    await googleSheetsService.syncEmployeeList(users);

    const attendanceRecords = await prisma.attendance.findMany({
      where: req.body.startDate || req.body.endDate
        ? {
            workDate: {
              ...(req.body.startDate ? { gte: new Date(req.body.startDate) } : {}),
              ...(req.body.endDate ? { lte: new Date(req.body.endDate) } : {}),
            },
          }
        : {},
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
      },
      orderBy: { workDate: 'desc' },
      take: 500,
    });

    for (const record of attendanceRecords) {
      await googleSheetsService.syncAttendance(record);
    }

    logger.info(`Google Sheets sinxronlandi: ${users.length} xodim, ${attendanceRecords.length} davomat`);

    res.json({
      success: true,
      data: {
        employeesCount: users.length,
        attendanceCount: attendanceRecords.length,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Google Sheets sinxronlash xatolik:', error.message);
    next(error);
  }
};

const getSyncStatus = async (req, res, next) => {
  try {
    const configs = await prisma.googleSheetsConfig.findMany({
      orderBy: { lastSyncAt: 'desc' },
    });

    if (configs.length === 0) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: 'Google Sheets konfiguratsiyasi topilmadi',
        },
      });
    }

    res.json({
      success: true,
      data: configs.map((c) => ({
        id: c.id,
        spreadsheetId: c.spreadsheetId,
        sheetName: c.sheetName,
        lastSyncAt: c.lastSyncAt,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Sinxronlash holatini olish xatolik:', error.message);
    next(error);
  }
};

const updateConfig = async (req, res, next) => {
  try {
    const { spreadsheetId, sheetName, isActive } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'spreadsheetId talab qilinadi',
      });
    }

    const existing = await prisma.googleSheetsConfig.findFirst({
      where: { spreadsheetId },
    });

    let config;
    if (existing) {
      config = await prisma.googleSheetsConfig.update({
        where: { id: existing.id },
        data: {
          sheetName: sheetName || existing.sheetName,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        },
      });
    } else {
      config = await prisma.googleSheetsConfig.create({
        data: {
          spreadsheetId,
          sheetName: sheetName || 'Davomat',
          isActive: isActive !== undefined ? isActive : true,
        },
      });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    logger.error('Google Sheets konfiguratsiyasini yangilash xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  syncNow,
  getSyncStatus,
  updateConfig,
};
