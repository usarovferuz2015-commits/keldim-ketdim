-- Kirish/chiqishda olingan yuz rasmini (base64 data URL) saqlash uchun,
-- admin har bir xodimning kelgan/ketgan rasmini ko'rib nazorat qilishi uchun.
ALTER TABLE "attendances" ADD COLUMN "checkInImage" TEXT;
ALTER TABLE "attendances" ADD COLUMN "checkOutImage" TEXT;
