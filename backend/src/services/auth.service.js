const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const verifyTelegramHash = (data) => {
  const { hash, ...fields } = data;

  const checkString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(config.telegram.botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hmac === hash;
};

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

const revokeRefreshToken = async (token) => {
  await prisma.refreshToken.updateMany({
    where: { token, isRevoked: false },
    data: { isRevoked: true },
  });
};

const revokeAllUserRefreshTokens = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
};

const telegramLogin = async (telegramData) => {
  if (config.telegram.botToken && config.telegram.botToken !== 'your-telegram-bot-token') {
    const isValid = verifyTelegramHash(telegramData);
    if (!isValid) {
      const error = new Error('Telegram ma\'lumotlari haqiqiy emas');
      error.statusCode = 403;
      throw error;
    }
  } else {
    logger.info('Dev rejim: Telegram hash tekshiruvi o\'tkazib yuborildi');
  }

  const { id, first_name, last_name, username, photo_url } = telegramData;
  const telegramId = String(id);

  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: username || user.username,
        photoUrl: photo_url || user.photoUrl,
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        phoneNumber: true,
        photoUrl: true,
        role: true,
        isActive: true,
        employeeId: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        telegramId,
        firstName: first_name,
        lastName: last_name || null,
        username: username || null,
        photoUrl: photo_url || null,
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        phoneNumber: true,
        photoUrl: true,
        role: true,
        isActive: true,
        employeeId: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    });
  }

  if (!user.isActive) {
    const error = new Error('Hisobingiz faol emas. Administrator bilan bog\'laning.');
    error.statusCode = 403;
    throw error;
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, accessToken, refreshToken };
};

const emailLogin = async (email, password) => {
  if (!email || !password) {
    const error = new Error('Email va parol talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      phoneNumber: true,
      photoUrl: true,
      role: true,
      isActive: true,
      employeeId: true,
      departmentId: true,
      passwordHash: true,
      department: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    const error = new Error('Email yoki parol notogri');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Hisobingiz faol emas. Administrator bilan bog\'laning.');
    error.statusCode = 403;
    throw error;
  }

  if (!user.passwordHash) {
    const error = new Error('Ushbu foydalanuvchi uchun parol sozlanmagan. Administrator bilan bog\'laning.');
    error.statusCode = 400;
    throw error;
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isValid) {
    const error = new Error('Email yoki parol notogri');
    error.statusCode = 401;
    throw error;
  }

  const { passwordHash, ...userData } = user;
  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return { user: userData, accessToken, refreshToken };
};

const refreshAccessToken = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    const error = new Error('Refresh token talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true },
  });

  if (!stored) {
    const error = new Error('Refresh token topilmadi');
    error.statusCode = 401;
    throw error;
  }

  if (stored.isRevoked) {
    await revokeAllUserRefreshTokens(stored.userId);
    const error = new Error('Refresh token bekor qilingan');
    error.statusCode = 401;
    throw error;
  }

  if (new Date() > stored.expiresAt) {
    const error = new Error('Refresh token muddati tugagan');
    error.statusCode = 401;
    throw error;
  }

  if (!stored.user.isActive) {
    const error = new Error('Hisobingiz faol emas');
    error.statusCode = 403;
    throw error;
  }

  await revokeRefreshToken(oldRefreshToken);

  const accessToken = generateAccessToken(stored.userId);
  const newRefreshToken = await generateRefreshToken(stored.userId);

  return { accessToken, refreshToken: newRefreshToken };
};

module.exports = {
  telegramLogin,
  emailLogin,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
};
