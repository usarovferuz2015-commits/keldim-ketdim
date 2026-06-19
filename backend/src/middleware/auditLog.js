const prisma = require('../utils/prisma');

const auditLog = (action, entity) => {
  return async (req, _res, next) => {
    const originalJson = _res.json.bind(_res);

    _res.json = function (body) {
      if (_res.statusCode >= 200 && _res.statusCode < 300 && req.user) {
        prisma.auditLog
          .create({
            data: {
              userId: req.user.id,
              action,
              entity,
              entityId: req.params.id || body?.data?.id || null,
              ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
              userAgent: req.headers['user-agent'] || null,
              newValue: typeof body === 'object' ? body : null,
            },
          })
          .catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = auditLog;
