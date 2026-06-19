const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const getDateRange = (start, end) => {
  const startDate = start ? new Date(start) : new Date();
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = end ? new Date(end) : new Date();
  endDate.setUTCHours(23, 59, 59, 999);

  return { startDate, endDate };
};

const computeAttendanceStats = (records) => {
  const totalDays = records.length;
  const totalWorkedHours = records.reduce((sum, r) => sum + (r.workedHours || 0), 0);
  const lateCount = records.filter((r) => r.lateMinutes > 0).length;
  const overtimeHours = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
  const absentDays = records.filter((r) => r.status === 'ABSENT').length;
  const presentDays = records.filter((r) =>
    ['PRESENT', 'LATE', 'EARLY_LEAVE'].includes(r.status)
  ).length;

  return {
    totalDays,
    totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
    lateCount,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    absentDays,
    presentDays,
    attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) / 100 : 0,
  };
};

const fetchAttendances = async (where = {}) => {
  return prisma.attendance.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          employeeId: true,
          department: { select: { id: true, name: true } },
        },
      },
      workLocation: { select: { id: true, name: true } },
    },
    orderBy: { workDate: 'asc' },
  });
};

const generateDailyReport = async (dateStr) => {
  const { startDate, endDate } = getDateRange(dateStr, dateStr);

  const records = await fetchAttendances({
    workDate: { gte: startDate, lte: endDate },
  });

  const stats = computeAttendanceStats(records);

  const userStats = {};
  for (const r of records) {
    const uid = r.userId;
    if (!userStats[uid]) {
      userStats[uid] = {
        user: r.user,
        workedHours: 0,
        lateMinutes: 0,
        overtimeHours: 0,
        status: r.status,
      };
    }
    userStats[uid].workedHours += r.workedHours || 0;
    userStats[uid].lateMinutes += r.lateMinutes || 0;
    userStats[uid].overtimeHours += r.overtimeHours || 0;
  }

  return {
    date: startDate.toISOString().split('T')[0],
    summary: stats,
    employees: Object.values(userStats).map((s) => ({
      ...s,
      workedHours: Math.round(s.workedHours * 100) / 100,
      overtimeHours: Math.round(s.overtimeHours * 100) / 100,
    })),
  };
};

const generateWeeklyReport = async (startDateStr, endDateStr) => {
  const { startDate, endDate } = getDateRange(startDateStr, endDateStr || startDateStr);

  if (!startDateStr) {
    const error = new Error('Boshlanish sanasi talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const records = await fetchAttendances({
    workDate: { gte: startDate, lte: endDate },
  });

  const stats = computeAttendanceStats(records);

  const userStats = {};
  for (const r of records) {
    const uid = r.userId;
    if (!userStats[uid]) {
      userStats[uid] = {
        user: r.user,
        workedHours: 0,
        lateMinutes: 0,
        overtimeHours: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
      };
    }
    userStats[uid].workedHours += r.workedHours || 0;
    userStats[uid].lateMinutes += r.lateMinutes || 0;
    userStats[uid].overtimeHours += r.overtimeHours || 0;

    if (['PRESENT', 'LATE', 'EARLY_LEAVE'].includes(r.status)) {
      userStats[uid].presentDays++;
    } else if (r.status === 'ABSENT') {
      userStats[uid].absentDays++;
    }
    if (r.lateMinutes > 0) {
      userStats[uid].lateDays++;
    }
  }

  return {
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    summary: stats,
    employees: Object.values(userStats).map((s) => ({
      ...s,
      workedHours: Math.round(s.workedHours * 100) / 100,
      overtimeHours: Math.round(s.overtimeHours * 100) / 100,
    })),
  };
};

const generateMonthlyReport = async (year, month) => {
  if (!year || !month) {
    const error = new Error('Yil va oy talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const records = await fetchAttendances({
    workDate: { gte: startDate, lte: endDate },
  });

  const stats = computeAttendanceStats(records);

  const userStats = {};
  for (const r of records) {
    const uid = r.userId;
    if (!userStats[uid]) {
      userStats[uid] = {
        user: r.user,
        workedHours: 0,
        lateMinutes: 0,
        overtimeHours: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        earlyLeaveDays: 0,
      };
    }
    userStats[uid].workedHours += r.workedHours || 0;
    userStats[uid].lateMinutes += r.lateMinutes || 0;
    userStats[uid].overtimeHours += r.overtimeHours || 0;

    if (['PRESENT', 'LATE', 'EARLY_LEAVE'].includes(r.status)) {
      userStats[uid].presentDays++;
    } else if (r.status === 'ABSENT') {
      userStats[uid].absentDays++;
    }
    if (r.lateMinutes > 0) {
      userStats[uid].lateDays++;
    }
    if (r.earlyLeaveMinutes > 0) {
      userStats[uid].earlyLeaveDays++;
    }
  }

  return {
    period: { year, month },
    summary: stats,
    employees: Object.values(userStats).map((s) => ({
      ...s,
      workedHours: Math.round(s.workedHours * 100) / 100,
      overtimeHours: Math.round(s.overtimeHours * 100) / 100,
    })),
  };
};

const generateEmployeeReport = async (userId, startDateStr, endDateStr) => {
  const { startDate, endDate } = getDateRange(startDateStr, endDateStr);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      employeeId: true,
      department: { select: { id: true, name: true } },
      schedule: { select: { startTime: true, endTime: true, scheduleType: true } },
    },
  });

  if (!user) {
    const error = new Error('Xodim topilmadi');
    error.statusCode = 404;
    throw error;
  }

  const records = await fetchAttendances({
    userId,
    workDate: { gte: startDate, lte: endDate },
  });

  const stats = computeAttendanceStats(records);

  const dailyDetails = records.map((r) => ({
    date: r.workDate.toISOString().split('T')[0],
    checkInTime: r.checkInTime,
    checkOutTime: r.checkOutTime,
    workedHours: r.workedHours,
    lateMinutes: r.lateMinutes,
    earlyLeaveMinutes: r.earlyLeaveMinutes,
    overtimeHours: r.overtimeHours,
    status: r.status,
    workLocation: r.workLocation?.name || null,
  }));

  return {
    employee: user,
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    summary: stats,
    dailyDetails,
  };
};

const getReportData = async (startDateStr, endDateStr) => {
  const { startDate, endDate } = getDateRange(startDateStr, endDateStr || startDateStr);

  const records = await fetchAttendances({
    workDate: { gte: startDate, lte: endDate },
  });

  const userStats = {};
  for (const r of records) {
    const uid = r.userId;
    if (!userStats[uid]) {
      userStats[uid] = {
        user: r.user,
        totalWorkedHours: 0,
        lateCount: 0,
        overtimeHours: 0,
        absentDays: 0,
        presentCount: 0,
      };
    }
    userStats[uid].totalWorkedHours += r.workedHours || 0;
    userStats[uid].overtimeHours += r.overtimeHours || 0;

    if (r.status === 'ABSENT') {
      userStats[uid].absentDays++;
    } else {
      userStats[uid].presentCount++;
    }
    if (r.lateMinutes > 0) {
      userStats[uid].lateCount++;
    }
  }

  return Object.values(userStats).map((s) => ({
    ...s,
    totalWorkedHours: Math.round(s.totalWorkedHours * 100) / 100,
    overtimeHours: Math.round(s.overtimeHours * 100) / 100,
  }));
};

const exportToExcel = async ({ startDate, endDate, type }) => {
  const reportData = await getReportData(startDate, endDate);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Davomat hisoboti');

  sheet.columns = [
    { header: 'Xodim', key: 'name', width: 30 },
    { header: 'Xodim ID', key: 'employeeId', width: 15 },
    { header: 'Bo\'lim', key: 'department', width: 20 },
    { header: 'Jami ishlangan soat', key: 'totalWorkedHours', width: 20 },
    { header: 'Kechikishlar soni', key: 'lateCount', width: 18 },
    { header: 'Qo\'shimcha soatlar', key: 'overtimeHours', width: 18 },
    { header: 'Kelmagan kunlar', key: 'absentDays', width: 18 },
    { header: 'Kelgan kunlar', key: 'presentCount', width: 18 },
  ];

  for (const row of reportData) {
    sheet.addRow({
      name: `${row.user.firstName || ''} ${row.user.lastName || ''}`.trim(),
      employeeId: row.user.employeeId || '-',
      department: row.user.department?.name || '-',
      totalWorkedHours: row.totalWorkedHours,
      lateCount: row.lateCount,
      overtimeHours: row.overtimeHours,
      absentDays: row.absentDays,
      presentCount: row.presentCount,
    });
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const exportToPdf = async ({ startDate, endDate, type }) => {
  const reportData = await getReportData(startDate, endDate);

  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  const buffers = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(16).text('Davomat hisoboti', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(
      `Hisobot davri: ${startDate || 'Boshidan'} - ${endDate || 'Hozirgacha'}`,
      { align: 'center' }
    );
    doc.moveDown();

    const tableTop = doc.y;
    const colWidths = [130, 70, 80, 80, 70, 70, 60, 60];
    const headers = [
      'Xodim', 'ID', 'Bo\'lim', 'Ish. soat',
      'Kechikish', 'Qo\'sh. soat', 'Kelmagan', 'Kelgan',
    ];

    doc.fontSize(8).font('Helvetica-Bold');
    let xPos = 30;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos, tableTop, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    }

    doc.moveDown(0.5);
    doc.font('Helvetica');

    let yPos = doc.y;
    for (const row of reportData) {
      if (yPos > doc.page.height - 60) {
        doc.addPage();
        yPos = 30;
      }

      const name = `${row.user.firstName || ''} ${row.user.lastName || ''}`.trim();
      const values = [
        name.length > 18 ? name.substring(0, 16) + '..' : name,
        row.user.employeeId || '-',
        row.user.department?.name || '-',
        String(row.totalWorkedHours),
        String(row.lateCount),
        String(row.overtimeHours),
        String(row.absentDays),
        String(row.presentCount),
      ];

      xPos = 30;
      for (let i = 0; i < values.length; i++) {
        doc.text(values[i], xPos, yPos, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      }

      yPos += 16;
    }

    doc.end();
  });
};

module.exports = {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateEmployeeReport,
  exportToExcel,
  exportToPdf,
};
