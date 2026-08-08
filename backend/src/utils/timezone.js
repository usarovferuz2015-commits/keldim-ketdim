// Do'kon O'zbekistonda joylashgan - Toshkent vaqti doim UTC+5 (yozgi vaqtga
// o'tish yo'q). Bazadagi barcha vaqt belgilari (checkInTime va h.k.) standart
// tarzda UTC instant sifatida saqlanadi (to'g'ri), lekin jadval boshlanish/
// tugash vaqtlari ("09:00", "18:00") administrator tomonidan MAHALLIY
// (Toshkent) devor soati sifatida kiritiladi. Ikkalasini bevosita solishtirish
// (masalan `now.getUTCHours()` bilan "09:00"ni) haqiqiy kechikishni doim
// aynan 5 soatga (300 daqiqa) kam ko'rsatib beradi - bu funksiyalar shu
// xatoni oldini oladi.

const TZ_OFFSET_MINUTES = 5 * 60; // Osiyo/Toshkent, UTC+5

// UTC instantni "Toshkent devor soati" qiymatlariga ega soxta-UTC Date'ga
// aylantiradi (masalan haqiqiy vaqt UTC 09:00 bo'lsa, natija ob'ektining
// getUTCHours()i 14ni qaytaradi - bu Toshkentda soat nechada ekanini bildiradi)
const toLocalShifted = (date) => new Date(date.getTime() + TZ_OFFSET_MINUTES * 60000);

// Teskari amal: "Toshkent devor soati" qiymatlariga ega soxta-UTC Date'dan
// haqiqiy UTC instantga qaytaradi
const fromLocalShifted = (shifted) => new Date(shifted.getTime() - TZ_OFFSET_MINUTES * 60000);

// Berilgan UTC instant Toshkentda kunning nechanchi daqiqasiga to'g'ri kelishi (0-1439)
const localMinutesOfDay = (date) => {
  const l = toLocalShifted(date);
  return l.getUTCHours() * 60 + l.getUTCMinutes();
};

// ISO hafta kuni (Dush=1 ... Yak=7) Toshkent vaqti bo'yicha
const localIsoWeekday = (date) => {
  const l = toLocalShifted(date);
  return l.getUTCDay() === 0 ? 7 : l.getUTCDay();
};

// Berilgan lahza tushgan Toshkent kalendar kunining boshlanishi (UTC instant sifatida)
const localDayStart = (date) => {
  const l = toLocalShifted(date);
  l.setUTCHours(0, 0, 0, 0);
  return fromLocalShifted(l);
};

// Berilgan lahza tushgan Toshkent kalendar kunining oxiri (UTC instant sifatida)
const localDayEnd = (date) => {
  const l = toLocalShifted(date);
  l.setUTCHours(23, 59, 59, 999);
  return fromLocalShifted(l);
};

module.exports = {
  TZ_OFFSET_MINUTES,
  localMinutesOfDay,
  localIsoWeekday,
  localDayStart,
  localDayEnd,
};
