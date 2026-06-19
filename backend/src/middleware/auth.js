const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Autentifikatsiya tokeni topilmadi',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        employeeId: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi yoki faol emas',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token muddati tugagan',
        code: 'TOKEN_EXPIRED',
      });
    }
    logger.error('Auth xatolik:', error);
    return res.status(401).json({
      success: false,
      message: 'Yaroqsiz token',
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Avval tizimga kiring',
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu amal uchun ruxsat yo\'q',
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
