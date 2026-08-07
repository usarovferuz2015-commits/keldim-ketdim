# Xodimlar Davomati Boshqaruv Tizimi (Keldim Ketdim)

## PostgreSQL + Prisma asosidagi production-grade tizim - o'rnatiladigan PWA (Progressive Web App) sifatida ishlaydi.

Ilova mustaqil veb-ilova (PWA) sifatida ishlaydi - telefon brauzerida ochilib, "Bosh ekranga qo'shish" orqali odatiy ilova kabi o'rnatiladi. Akkauntlarni faqat administrator "Xodimlar" bo'limi orqali yaratadi (email + parol); Telegram - ixtiyoriy qo'shimcha bog'lanish usuli, majburiy emas.

---

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, PWA (manifest + service worker) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (Access + Refresh token), email/parol - administrator tomonidan yaratilgan akkauntlar. Telegram - ixtiyoriy qo'shimcha bog'lanish. |
| Yuz aniqlash | face-api.js + TensorFlow.js (brauzerda, deskriptor taqqoslash) |
| Tiriklik tekshiruvi | Ko'z yumish (EAR/blink) va bosh harakati aniqlash (client) + backend tomonidan qo'shimcha tasdiqlash |
| GPS | Navigator Geolocation API + Haversine |
| Hisobot | ExcelJS, PDFKit |
| Integratsiya | Google Sheets API (ixtiyoriy) |
| Deployment | Docker, Vercel (frontend), Railway/VPS (backend) |

---

## Loyiha strukturasi

```
keldim_ketdim/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Ma'lumotlar bazasi sxemasi
│   │   └── seed.js                # Test ma'lumotlar
│   ├── src/
│   │   ├── config/                # Konfiguratsiya
│   │   ├── controllers/           # Controller'lar (13 ta)
│   │   ├── middleware/            # Middleware'lar (auth, validate, upload, audit, error)
│   │   ├── routes/                # API marshrutlari (13 ta)
│   │   ├── services/              # Biznes logika (13 ta)
│   │   ├── utils/                 # Prisma client, logger
│   │   └── app.js                 # Asosiy server
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── admin/             # Admin paneli sahifalari
│   │   │   ├── employee/          # Xodim paneli sahifalari
│   │   │   ├── login/             # Telegram login
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── globals.css        # Global stillar
│   │   ├── components/            # UI komponentlar
│   │   ├── hooks/                 # Custom hook'lar
│   │   ├── lib/                   # API client, store
│   │   └── types/                 # TypeScript tiplar
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Tezkor ishga tushirish

### 1. Talablar

- Node.js 20+
- PostgreSQL 16+
- npm

### 2. O'zgaruvchilarni sozlash

```bash
# Backend
cd backend
cp .env.example .env
# .env faylini tahrirlang:
# - DATABASE_URL
# - JWT_SECRET (kuchli tasodifiy qiymat: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
# - TELEGRAM_BOT_TOKEN (ixtiyoriy - faqat Telegram bog'lashni yoqmoqchi bo'lsangiz)
# - Google Sheets (ixtiyoriy)

# Frontend
cd frontend
cp .env.example .env.local
# .env.local da NEXT_PUBLIC_API_URL ni backend manziliga o'rnating
```

### 3. Backendni ishga tushirish

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed    # Test ma'lumotlarni yaratish
npm run dev           # http://localhost:4000
```

### 4. Frontendni ishga tushirish

```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
```

### 5. Docker orqali ishga tushirish

```bash
docker-compose up -d
```

---

## API Yo'nalishlari

### Autentifikatsiya
| Method | Yo'l | Tavsif |
|--------|------|--------|
| POST | `/api/auth/telegram` | Telegram orqali login |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Joriy foydalanuvchi |
| POST | `/api/auth/logout` | Chiqish |

### Xodimlar
| Method | Yo'l | Tavsif |
|--------|------|--------|
| GET | `/api/users` | Barcha xodimlar (ADMIN) |
| GET | `/api/users/:id` | Xodim ma'lumoti |
| POST | `/api/users` | Xodim qo'shish (ADMIN) |
| PUT | `/api/users/:id` | Xodim tahrirlash (ADMIN) |
| DELETE | `/api/users/:id` | Xodim o'chirish (ADMIN) |
| GET | `/api/users/:id/face-template` | Yuz shablonini olish |
| POST | `/api/users/:id/face-template` | Yuz shablonini saqlash |

### Davomat
| Method | Yo'l | Tavsif |
|--------|------|--------|
| POST | `/api/attendances/check-in` | Kirish |
| POST | `/api/attendances/check-out` | Chiqish |
| GET | `/api/attendances/my` | Shaxsiy davomat |
| GET | `/api/attendances/today` | Bugungi holat |
| GET | `/api/attendances/stats` | Shaxsiy statistika |
| GET | `/api/attendances` | Barcha davomat (ADMIN) |

### Dashboard
| Method | Yo'l | Tavsif |
|--------|------|--------|
| GET | `/api/dashboard/summary` | Umumiy statistika |
| GET | `/api/dashboard/present-today` | Bugun kelganlar |
| GET | `/api/dashboard/absent-today` | Bugun kelmaganlar |
| GET | `/api/dashboard/currently-working` | Hozir ishlayotganlar |
| GET | `/api/dashboard/late-today` | Kechikkanlar |
| GET | `/api/dashboard/attendance-rate` | Davomat foizi |

### Hisobotlar
| Method | Yo'l | Tavsif |
|--------|------|--------|
| GET | `/api/reports/daily` | Kunlik hisobot |
| GET | `/api/reports/weekly` | Haftalik hisobot |
| GET | `/api/reports/monthly` | Oylik hisobot |
| GET | `/api/reports/employee/:userId` | Xodim hisoboti |
| GET | `/api/reports/export/excel` | Excel eksport |
| GET | `/api/reports/export/pdf` | PDF eksport |

### Boshqa
| Method | Yo'l | Tavsif |
|--------|------|--------|
| GET/POST/PUT/DELETE | `/api/departments` | Bo'limlar |
| GET/POST/PUT/DELETE | `/api/schedules` | Ish jadvallari |
| GET/POST/PUT/DELETE | `/api/locations` | Ish joylari |
| GET/POST/PUT/DELETE | `/api/leaves` | Dam olish arizalari |
| GET/POST/PUT/DELETE | `/api/holidays` | Bayram kunlari |
| POST | `/api/face/verify` | Yuz tekshirish |
| POST | `/api/face/register` | Yuz ro'yxatdan o'tkazish |
| POST | `/api/face/liveness` | Tiriklik tekshiruvi |
| POST | `/api/sheets/sync` | Google Sheets sinxron |

---

## Davomat tekshiruvi - 3 shartli jarayon

Xodim davomat qayd etish uchun barcha 3 shart bajarilishi kerak:

### 1. GPS Tekshiruvi
- Xodimning joriy geolokatsiyasi aniqlanadi
- Haversine formula orqali faol ish joylariga masofa hisoblanadi
- Radius (default 100m) ichida bo'lsa - ruxsat beriladi
- Tashqarida bo'lsa - "Siz ruxsat etilgan ish hududidan tashqaridasiz"

### 2. Yuz Tekshiruvi
- Old kamera orqali xodimning yuzi skanerlanadi
- face-api.js orqali yuz deskriptorlari solishtiriladi
- Saqlangan shablon bilan moslik tekshiriladi
- Moslik foizi > 60% bo'lsa - ruxsat beriladi

### 3. Tiriklik Tekshiruvi (Anti-Spoofing)
- Yuz mos kelgandan so'ng kamera ~1.5-2 soniya davomida bir necha kadr yig'adi
- Ko'z yumish (Eye Aspect Ratio/EAR formulasi) va/yoki bosh harakati client tomonda aniqlanadi
- Backenddagi `/api/face/liveness` orqali qo'shimcha tasdiqlanadi (ikkinchi signal)
- Statik surat/skrinshot/ekran ko'rsatilsa - harakat/ko'z yumish bo'lmagani uchun rad etiladi
- Ikkala shart (mijoz + server) tasdiqlangandagina "tirik" deb hisoblanadi

> Eslatma: bu heuristik (EAR chegarasi va harakat variance chegarasi) - real foydalanuvchilar va qurilmalar bilan sinovdan o'tkazib, kerak bo'lsa `frontend/src/hooks/useFaceDetection.ts` dagi chegara qiymatlarini moslashtiring.

---

## Deployment

### VPS ga o'rnatish (Railway, DigitalOcean, VPS)

1. **Serverni tayyorlash:**
```bash
# Docker o'rnatish
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Loyihani yuklab olish
git clone <repo-url> keldim_ketdim
cd keldim_ketdim
```

2. **`.env` faylini sozlash:**
```bash
cp .env.example .env
nano .env
# Barcha o'zgaruvchilarni to'ldiring
```

3. **Docker orqali ishga tushirish:**
```bash
docker-compose up -d
```

4. **Ma'lumotlar bazasi migratsiyasi:**
```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed  # ixtiyoriy
```

### Vercel + Railway deployment

**Frontend (Vercel):**
- Repository'ni Vercel'ga ulang
- Build Command: `npm run build`
- Environment Variables da `NEXT_PUBLIC_API_URL` ni backend URL'ga o'rnating
- Deploy tugmasini bosing

**Backend (Railway):**
- Railway'ga PostgreSQL qo'shing
- Backend ni Railway'ga deploy qiling
- `DATABASE_URL` Railway PostgreSQL'dan avtomatik olinadi
- Boshqa env variable'larni qo'lda qo'shing

### PWA sifatida o'rnatish (xodimlar uchun)

1. Xodim telefonida brauzerda (Chrome/Safari) ilova manzilini ochadi
2. Brauzer menyusidan "Bosh ekranga qo'shish" / "Add to Home Screen" ni tanlaydi
3. Ilova ikonkasi bosh ekranga qo'shiladi va alohida ilova sifatida (brauzer panelisiz) ochiladi
4. Kamera va joylashuv (GPS) ruxsatlarini birinchi ishga tushirishda so'raydi

### Telegram bog'lash (ixtiyoriy)

Telegram - asosiy kirish usuli emas, faqat kelajakda bildirishnoma yuborish yoki qo'shimcha kirish usuli sifatida yoqilishi mumkin bo'lgan ixtiyoriy imkoniyat:

1. @BotFather orqali bot yarating
2. `TELEGRAM_BOT_TOKEN` va `TELEGRAM_BOT_USERNAME` ni .env fayliga qo'shing
3. Administrator xodim profilida uning Telegram ID'sini bog'lashi kerak - faqat oldindan admin tomonidan yaratilgan (email/parol bilan) akkauntlarga Telegram orqali kirish mumkin, yangi akkaunt Telegram orqali avtomatik yaratilmaydi (xavfsizlik uchun)

---

## Xavfsizlik

- Akkauntlarni faqat administrator yaratadi ("Xodimlar" bo'limi) - o'z-o'zidan ro'yxatdan o'tish yo'q
- JWT autentifikatsiya (7 kun muddat), email + parol (bcrypt hash)
- Refresh token rotatsiyasi (30 kun)
- Rate limiting (har 15 daqiqada 100 ta so'rov)
- Helmet.js HTTP header xavfsizligi
- CORS sozlamalari
- Input validatsiyasi (Zod, express-validator)
- Face spoofing himoyasi (EAR blink + harakat aniqlash, client va server tomonda)
- GPS tekshiruvi (geofencing)
- Audit log (barcha amallar yozib boriladi)
- Telegram orqali kirish ixtiyoriy va faqat admin oldindan bog'lab qo'ygan akkauntlarga ruxsat beradi

---

## Modellar (Database Schema)

- **User** - Foydalanuvchilar/xodimlar
- **Department** - Bo'limlar/sektorlar
- **WorkLocation** - Ish joyi lokatsiyalari (geofencing)
- **Schedule** - Ish jadvallari (FIXED, SHIFT, FLEXIBLE)
- **Attendance** - Davomat yozuvlari
- **LeaveRequest** - Dam olish arizalari
- **Holiday** - Bayram kunlari
- **AuditLog** - Audit yozuvlari
- **RefreshToken** - Refresh tokenlar
- **GoogleSheetsConfig** - Google Sheets sozlamalari

---

## Admin hisobi

Test admin ma'lumotlari (`npx prisma db seed` bilan yaratiladi):
- Email: `admin@keldimketdim.uz`
- Parol: `Admin123!`
- Rol: ADMIN

Test xodim hisoblari (barchasi uchun bir xil parol, faqat sinov uchun):
- Email: `employee_1@keldimketdim.uz` ... `employee_30@keldimketdim.uz`
- Parol: `Employee123!`

**Muhim:** bular faqat test/demo ma'lumotlari. Production muhitida seed orqali yaratilgan admin parolini birinchi kirishdan so'ng albatta almashtiring, yoki seed skriptini haqiqiy xodimlar ro'yxati bilan moslang.

---

## Ishlab chiquvchilar uchun

```bash
# Backend test
cd backend && npm run dev

# Frontend test
cd frontend && npm run dev

# Prisma Studio (DB ko'rish)
cd backend && npx prisma studio

# Type xatoliklarni tekshirish
cd frontend && npx tsc --noEmit
```
