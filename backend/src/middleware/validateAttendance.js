const validateAttendance = (req, res, next) => {
  const { latitude, longitude, faceVerified, livenessVerified } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      message: 'GPS koordinatalari talab qilinadi',
    });
  }

  if (!faceVerified) {
    return res.status(400).json({
      success: false,
      message: 'Yuz tekshiruvi talab qilinadi',
    });
  }

  if (!livenessVerified) {
    return res.status(400).json({
      success: false,
      message: 'Tiriklik tekshiruvi talab qilinadi',
    });
  }

  next();
};

module.exports = validateAttendance;
