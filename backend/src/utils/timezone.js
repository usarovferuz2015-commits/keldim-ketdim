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

// Berilgan lahza tushgan Toshkent kalendar sanasini "YYYY-MM-DD" ko'rinishida
// qaytaradi. MUHIM: bevosita `date.toISOString().split('T')[0]` ishlatish
// noto'g'ri - UTC va Toshkent (UTC+5) orasidagi farq sabab, masalan Toshkentda
// 12-avgust kuni 00:00-04:59 oralig'ida bu hali ham UTC bo'yicha 11-avgust
// bo'ladi, natijada sana bir kunga orqaga siljib ko'rsatiladi.
const localDateString = (date) => toLocalShifted(date).toISOString().split('T')[0];

// Berilgan Toshkent kalendar kuni (`baseDate` - shu kunning istalgan lahzasi)
// va shu kun boshidan necha daqiqa o'tganini (masalan jadval "22:00" ->
// 1320) UTC instantga aylantiradi. `minutesOfDay` 1440 dan katta bo'lishi
// mumkin (tungi smenalar uchun, masalan smena tugashi ertasi kunga
// o'tganda) - bu holda avtomatik keyingi kunga "to'kiladi", chunki bu
// oddiy millisekund arifmetikasi (vaqt zonasi konversiyasi shart emas).
const localDateTimeFromMinutes = (baseDate, minutesOfDay) =>
  new Date(localDayStart(baseDate).getTime() + minutesOfDay * 60000);

module.exports = {
  TZ_OFFSET_MINUTES,
  localMinutesOfDay,
  localIsoWeekday,
  localDayStart,
  localDayEnd,
  localDateString,
  localDateTimeFromMinutes,
};
