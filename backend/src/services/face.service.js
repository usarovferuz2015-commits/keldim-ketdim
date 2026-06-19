const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const config = require('../config');

const compareDescriptors = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return 0;
  if (descriptor1.length !== descriptor2.length) return 0;

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += (descriptor1[i] - descriptor2[i]) ** 2;
  }

  const distance = Math.sqrt(sum);
  return Math.max(0, Math.min(1, 1 - distance));
};

const saveFaceTemplate = async (userId, descriptor, base64Image) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
    const error = new Error('Yuz deskriptori talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      faceTemplate: base64Image || null,
      faceTemplateData: descriptor,
    },
    select: { id: true, updatedAt: true },
  });

  logger.info(`Yuz shabloni saqlandi: ${userId}`);
  return updated;
};

const verifyFace = async (userId, descriptor) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, faceTemplateData: true },
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  if (!user.faceTemplateData) {
    const error = new Error('Yuz shabloni topilmadi. Avval ro\'yxatdan o\'ting.');
    error.statusCode = 400;
    throw error;
  }

  if (!descriptor || !Array.isArray(descriptor)) {
    const error = new Error('Yuz deskriptori talab qilinadi');
    error.statusCode = 400;
    throw error;
  }

  const similarity = compareDescriptors(descriptor, user.faceTemplateData);
  const threshold = config.face.similarityThreshold;
  const verified = similarity >= threshold;

  logger.info(`Yuz tekshiruvi: ${userId}, o\'xshashlik: ${(similarity * 100).toFixed(1)}%`);

  return {
    verified,
    similarity: Math.round(similarity * 100) / 100,
    threshold,
    message: verified
      ? 'Yuz tekshiruvi muvaffaqiyatli'
      : `Yuz mos kelmadi (${Math.round(similarity * 100)}%)`,
  };
};

const detectLiveness = (movementData) => {
  if (!movementData || !Array.isArray(movementData) || movementData.length < 3) {
    return {
      isLive: false,
      score: 0,
      message: 'Kamida 3 ta kadrdagi harakat ma\'lumoti talab qilinadi',
    };
  }

  const differences = [];
  for (let i = 1; i < movementData.length; i++) {
    if (movementData[i] && movementData[i - 1]) {
      const diff = 1 - compareDescriptors(movementData[i], movementData[i - 1]);
      differences.push(diff);
    }
  }

  if (differences.length === 0) {
    return { isLive: false, score: 0, message: 'Harakat aniqlanmadi' };
  }

  const maxDifference = Math.max(...differences);
  const blinkThreshold = config.face.livenessBlinkThreshold;
  const isLive = maxDifference > blinkThreshold;

  return {
    isLive,
    score: Math.round(maxDifference * 100) / 100,
    message: isLive
      ? 'Tiriklik tekshiruvi muvaffaqiyatli'
      : 'Tiriklik aniqlanmadi, iltimos harakatlaning yoki ko\'z yuming',
  };
};

const getFaceTemplate = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, faceTemplate: true, faceTemplateData: true },
  });

  if (!user) {
    const error = new Error('Foydalanuvchi topilmadi');
    error.statusCode = 404;
    throw error;
  }

  return {
    hasTemplate: !!user.faceTemplateData,
    templateExists: !!user.faceTemplate,
  };
};

module.exports = {
  compareDescriptors,
  saveFaceTemplate,
  verifyFace,
  detectLiveness,
  getFaceTemplate,
};
