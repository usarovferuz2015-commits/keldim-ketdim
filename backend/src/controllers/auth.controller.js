const authService = require('../services/auth.service');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const telegramLogin = async (req, res, next) => {
  try {
    const result = await authService.telegramLogin(req.body);

    prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: 'LOGIN',
        entity: 'USER',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(() => {});

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    logger.error('Telegram login xatolik:', error.message);
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await authService.refreshAccessToken(token);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
      success: true,
      data: { accessToken: result.accessToken },
    });
  } catch (error) {
    logger.error('Refresh token xatolik:', error.message);
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (token) {
      await authService.revokeRefreshToken(token);
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Tizimdan chiqildi' });
  } catch (error) {
    logger.error('Logout xatolik:', error.message);
    next(error);
  }
};

const emailLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email va parol talab qilinadi' });
    }

    const result = await authService.emailLogin(email, password);

    prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: 'LOGIN',
        entity: 'USER',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(() => {});

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Email login xatolik:', error.message);
    next(error);
  }
};

module.exports = { telegramLogin, refreshToken, getMe, logout, emailLogin };
