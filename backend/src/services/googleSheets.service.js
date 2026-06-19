const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const config = require('../config');

let sheetsClient = null;
let initialized = false;

const initializeSheets = async () => {
  if (!config.googleSheets.clientEmail || !config.googleSheets.privateKey) {
    return null;
  }

  if (initialized) return sheetsClient;

  try {
    const { google } = require('googleapis');

    const auth = new google.auth.JWT({
      email: config.googleSheets.clientEmail,
      key: config.googleSheets.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    initialized = true;
    logger.info('Google Sheets API muvaffaqiyatli ulandi');
    return sheetsClient;
  } catch (error) {
    logger.error('Google Sheets API ulanishda xatolik:', error.message);
    return null;
  }
};

const getOrCreateSheet = async (sheets, spreadsheetId, sheetName) => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    const existingSheet = response.data.sheets.find(
      (s) => s.properties.title === sheetName
    );

    if (existingSheet) {
      return sheetName;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    return sheetName;
  } catch (error) {
    logger.error('Google Sheets jadval yaratishda xatolik:', error.message);
    return sheetName;
  }
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const syncAttendance = async (data) => {
  try {
    const sheets = await initializeSheets();
    if (!sheets) return;

    const spreadsheetId = config.googleSheets.spreadsheetId;
    if (!spreadsheetId) return;

    const sheetName = 'Davomat';
    await getOrCreateSheet(sheets, spreadsheetId, sheetName);

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { firstName: true, lastName: true, employeeId: true },
    });

    const values = [[
      formatDate(data.workDate),
      data.userId,
      user ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
      user?.employeeId || '',
      formatDate(data.checkInTime),
      formatDate(data.checkOutTime),
      data.workedHours || 0,
      data.lateMinutes || 0,
      data.earlyLeaveMinutes || 0,
      data.overtimeHours || 0,
      data.status,
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:K`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    const existingConfig = await prisma.googleSheetsConfig.findFirst({
      where: { spreadsheetId },
    });

    if (existingConfig) {
      await prisma.googleSheetsConfig.update({
        where: { id: existingConfig.id },
        data: { lastSyncAt: new Date() },
      });
    } else {
      await prisma.googleSheetsConfig.create({
        data: {
          spreadsheetId,
          sheetName,
          lastSyncAt: new Date(),
        },
      });
    }

    logger.debug(`Google Sheets sinxronlandi: ${data.userId}`);
  } catch (error) {
    logger.error('Google Sheets sinxronlashda xatolik:', error.message);
  }
};

const syncEmployeeList = async (employees) => {
  try {
    const sheets = await initializeSheets();
    if (!sheets) return;

    const spreadsheetId = config.googleSheets.spreadsheetId;
    if (!spreadsheetId) return;

    const sheetName = 'Xodimlar';
    await getOrCreateSheet(sheets, spreadsheetId, sheetName);

    const values = employees.map((user) => [
      user.id,
      user.employeeId || '',
      `${user.firstName} ${user.lastName || ''}`.trim(),
      user.username || '',
      user.phoneNumber || '',
      user.department?.name || '',
      user.role,
      user.isActive ? 'Faol' : 'Faol emas',
      user.createdAt ? formatDate(user.createdAt) : '',
    ]);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:I${employees.length + 1}`,
    });

    if (values.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:I`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
    }

    logger.debug(`Google Sheets: ${employees.length} ta xodim sinxronlandi`);
  } catch (error) {
    logger.error('Google Sheets xodimlar sinxronlashda xatolik:', error.message);
  }
};

const exportToSheet = async (attendanceRecords) => {
  try {
    const sheets = await initializeSheets();
    if (!sheets) return null;

    const spreadsheetId = config.googleSheets.spreadsheetId;
    if (!spreadsheetId) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sheetName = `Eksport_${timestamp}`;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      },
    });

    const headers = [[
      'Sana', 'Xodim ID', 'Ism Familiya', 'Xodim №',
      'Kirish vaqti', 'Chiqish vaqti', 'Ishlangan soat',
      'Kechikish (daq)', 'Erta ketish (daq)', 'Qo\'shimcha soat', 'Holat',
    ]];

    const rows = attendanceRecords.map((r) => [
      formatDate(r.workDate),
      r.userId,
      r.user ? `${r.user.firstName} ${r.user.lastName || ''}`.trim() : '',
      r.user?.employeeId || '',
      formatDate(r.checkInTime),
      formatDate(r.checkOutTime),
      r.workedHours || 0,
      r.lateMinutes || 0,
      r.earlyLeaveMinutes || 0,
      r.overtimeHours || 0,
      r.status,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: headers },
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows },
      });
    }

    logger.info(`Google Sheets eksport: ${attendanceRecords.length} ta yozuv "${sheetName}" jadvaliga`);
    return { sheetName, recordCount: attendanceRecords.length };
  } catch (error) {
    logger.error('Google Sheets eksport xatolik:', error.message);
    return null;
  }
};

module.exports = {
  initializeSheets,
  syncAttendance,
  syncEmployeeList,
  exportToSheet,
};
