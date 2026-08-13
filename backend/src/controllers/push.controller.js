const pushService = require('../services/push.service');
const config = require('../config');
const logger = require('../utils/logger');

const getPublicKey = async (req, res) => {
  res.json({ success: true, data: { publicKey: config.vapid.publicKey || null } });
};

const subscribe = async (req, res, next) => {
  try {
    const result = await pushService.saveSubscription(req.user.id, req.body.subscription);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Push obuna xatolik:', error.message);
    next(error);
  }
};

const unsubscribe = async (req, res, next) => {
  try {
    await pushService.removeSubscription(req.body.endpoint);
    res.json({ success: true });
  } catch (error) {
    logger.error('Push obunani bekor qilish xatolik:', error.message);
    next(error);
  }
};

module.exports = { getPublicKey, subscribe, unsubscribe };
