console.log(`[BOOT] node src/app.js boshlandi - ${new Date().toISOString()}`);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const departmentRoutes = require('./routes/department.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const leaveRoutes = require('./routes/leave.routes');
const holidayRoutes = require('./routes/holiday.routes');
const reportRoutes = require('./routes/report.routes');
const locationRoutes = require('./routes/location.routes');
const faceRoutes = require('./routes/face.routes');
const googleSheetsRoutes = require('./routes/googleSheets.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes = require('./routes/admin.routes');
const payrollRoutes = require('./routes/payroll.routes');
const pushRoutes = require('./routes/push.routes');
const { startCheckoutReminderJob } = require('./jobs/checkoutReminder.job');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.nodeEnv === 'development'
    ? ['http://localhost:3000', 'http://192.168.100.41:3000', 'https://web.telegram.org', 'https://telegram.org']
    : [config.frontendUrl, 'https://web.telegram.org', 'https://telegram.org'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'So\'rovlar soni limitdan oshdi, keyinroq qayta urinib ko\'ring',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server ishlamoqda', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/sheets', googleSheetsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/push', pushRoutes);

app.use(errorHandler);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[BOOT] Server ${config.port}-portda (0.0.0.0) ishga tushdi [${config.nodeEnv}]`);
  logger.info(`Server ${config.port}-portda ishga tushdi [${config.nodeEnv}]`);
  startCheckoutReminderJob();
});

module.exports = app;
