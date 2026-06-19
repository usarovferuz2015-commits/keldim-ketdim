const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  logger.error('Server xatoligi:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
  });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validatsiya xatoligi',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Bu ma\'lumot allaqachon mavjud',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Ma\'lumot topilmadi',
      });
    }
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Ichki server xatoligi';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
