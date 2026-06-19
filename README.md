# Xodimlar Davomati Boshqaruv Tizimi (Keldim Ketdim)

## MongoDB o'rniga to'liq PostgreSQL + Prisma asosidagi production-grade tizim.

---

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Telegram Mini App SDK |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (Access + Refresh token) |
| Yuz aniqlash | face-api.js + TensorFlow.js |
| GPS | Navigator Geolocation API + Haversine |
| Hisobot | ExcelJS, PDFKit |
| Integratsiya | Google Sheets API |
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
# - JWT_SECRET
# - TELEGRAM_BOT_TOKEN
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
- Ko'z yumish aniqlanadi
- Bosh harakati tekshiriladi
- Skrinshot, bosma foto, video hujumlarni bloklaydi
- Haqiqiy tirik odam aniqlangandagina muvaffaqiyatli

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

### Telegram Bot sozlamalari

1. @BotFather orqali bot yarating
2. Mini App uchun bot sozlamalarida `Menu Button` ni yoqing
3. Frontend URL'ni Mini App URL sifatida ko'rsating
4. `TELEGRAM_BOT_TOKEN` va `TELEGRAM_BOT_USERNAME` ni .env fayliga qo'shing

---

## Xavfsizlik

- JWT autentifikatsiya (7 kun muddat)
- Refresh token rotatsiyasi (30 kun)
- Rate limiting (har 15 daqiqada 100 ta so'rov)
- Helmet.js HTTP header xavfsizligi
- CORS sozlamalari
- Input validatsiyasi (Zod)
- Face spoofing himoyasi
- GPS tekshiruvi
- Audit log (barcha amallar yozib boriladi)
- Parol yo'q - faqat Telegram orqali autentifikatsiya

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

Test admin ma'lumotlari (seed bilan yaratiladi):
- Telegram ID: `000000000`
- Rol: ADMIN
- Ism: Admin Foydalanuvchi

Dev rejimda login sahifasida test formasi orqali kirish mumkin.

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
