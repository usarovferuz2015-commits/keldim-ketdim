const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Davomat');

sheet.columns = [
  { header: 'Sana', key: 'date', width: 14 },
  { header: 'Xodim', key: 'name', width: 25 },
  { header: "Bo'lim", key: 'department', width: 18 },
  { header: 'Jadval boshi', key: 'scheduleStart', width: 14 },
  { header: 'Jadval oxiri', key: 'scheduleEnd', width: 14 },
  { header: 'Kirish vaqti', key: 'checkIn', width: 14 },
  { header: 'Chiqish vaqti', key: 'checkOut', width: 14 },
  { header: 'Ishlangan soat', key: 'workedHours', width: 14 },
  { header: 'Kechikish (daq)', key: 'lateMinutes', width: 14 },
  { header: 'Erta ketish (daq)', key: 'earlyLeave', width: 14 },
  { header: 'Overtime (soat)', key: 'overtime', width: 14 },
  { header: 'Status', key: 'status', width: 14 },
];

const headerRow = sheet.getRow(1);
headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
headerRow.height = 25;

const sampleData = [
  ['2026-06-01', 'Alisher Karimov', "Sotuv bo'limi", '09:00', '18:00', '08:55', '18:05', 9.2, 0, 0, 0.1, 'PRESENT'],
  ['2026-06-01', 'Barno Rahimova', 'Kassir', '08:00', '17:00', '08:15', '17:00', 8.8, 15, 0, 0, 'LATE'],
  ['2026-06-01', 'Dilshod Nurmatov', 'Ombor', '06:00', '14:00', '06:02', '14:00', 8.0, 0, 0, 0, 'PRESENT'],
  ['2026-06-01', "Elmira Saidova", "Ma'muriyat", '09:00', '18:00', '09:00', '17:30', 8.5, 0, 30, 0, 'EARLY_LEAVE'],
  ['2026-06-02', 'Alisher Karimov', "Sotuv bo'limi", '09:00', '18:00', '09:00', '18:00', 9.0, 0, 0, 0, 'PRESENT'],
  ['2026-06-02', 'Barno Rahimova', 'Kassir', '08:00', '17:00', '', '', 0, 0, 0, 0, 'ABSENT'],
  ['2026-06-02', 'Farhod Toshmatov', "Qo'riqlash", '08:00', '17:00', '07:45', '17:30', 9.8, 0, 0, 0.5, 'PRESENT'],
];

sampleData.forEach((row, idx) => {
  const r = sheet.addRow(row);
  r.alignment = { horizontal: 'center', vertical: 'middle' };
  if (idx % 2 === 0) {
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  }
});

sheet.autoFilter = 'A1:L1';

const filePath = 'C:\\Users\\user\\Desktop\\davomat_shablon.xlsx';
workbook.xlsx.writeFile(filePath).then(() => console.log('Fayl yaratildi: ' + filePath));
