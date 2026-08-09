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

  // 2026-08-09: Feruz so'roviga ko'ra tiriklik (liveness) tekshiruvi endi
  // kirish/chiqishni bloklamaydi - faqat ma'lumot sifatida saqlanadi (admin
  // rasm orqali nazorat qiladi). Frontend gate'i olib tashlangan edi, lekin
  // bu middleware'dagi qattiq talab unutilgan bo'lib, xodimlarni "Tiriklik
  // tekshiruvi talab qilinadi" (400) bilan bloklab qolayotgan edi.
  next();
};

module.exports = validateAttendance;
