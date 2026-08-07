const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'admin@keldimketdim.uz';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

async function main() {
  console.log('Test ma\'lumotlar yaratish boshlandi...');

  // Admin foydalanuvchi (email + parol orqali kiradi - Telegram shart emas)
  const admin = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10),
      firstName: 'Admin',
      lastName: 'Foydalanuvchi',
      username: 'admin',
      phoneNumber: '+998901234567',
      role: 'ADMIN',
      employeeId: 'ADM001',
      isActive: true,
    },
  });

  // Bo'limlar
  const departments = [
    { name: 'Ma\'muriyat', description: 'Boshqaruv va administratsiya' },
    { name: 'Sotuv bo\'limi', description: 'Savdo va mijozlar bilan ishlash' },
    { name: 'Ombor', description: 'Mahsulot qabul qilish va saqlash' },
    { name: 'Kassir', description: 'Kassa operatsiyalari' },
    { name: 'Qo\'riqlash', description: 'Xavfsizlik xizmati' },
  ];

  const createdDepts = [];
  for (const dept of departments) {
    const created = await prisma.department.create({ data: dept });
    createdDepts.push(created);
  }

  // Ish joyi lokatsiyalari
  await prisma.workLocation.createMany({
    data: [
      {
        name: 'Asosiy bino',
        latitude: 41.311081,
        longitude: 69.240562,
        radiusMeters: 100,
        departmentId: createdDepts[0].id,
      },
      {
        name: 'Omborxona',
        latitude: 41.312500,
        longitude: 69.241000,
        radiusMeters: 150,
        departmentId: createdDepts[2].id,
      },
    ],
  });

  // Xodimlar
  const employeeNames = [
    ['Alisher', 'Karimov'], ['Barno', 'Rahimova'], ['Dilshod', 'Nurmatov'],
    ['Elmira', 'Saidova'], ['Farhod', 'Toshmatov'], ['Gulnora', 'Abdullayeva'],
    ['Hamid', 'Xolmatov'], ['Iroda', 'Jalilova'], ['Javlon', 'Ergashev'],
    ['Kamola', 'Usmonova'], ['Laziz', 'Bekmurodov'], ['Madina', 'Shukurova'],
    ['Nodir', 'Yusupov'], ['Odina', 'Zokirova'], ['Pulat', 'Abdulayev'],
    ['Qahramon', 'Ismoilov'], ['Rano', 'Turgunova'], ['Sanjar', 'Fayzullayev'],
    ['Tamara', 'Ganiyeva'], ['Ulug\'bek', 'Mirsoliyev'], ['Vazira', 'Askarova'],
    ['Xurshid', 'Rasulov'], ['Yulduz', 'Xasanova'], ['Zafar', 'Jorayev'],
    ['Anvar', 'Sattorov'], ['Barno', 'Xaydarova'], ['Dilnoza', 'Ibragimova'],
    ['Eshmat', 'Ermatov'], ['Feruza', 'Olimova'], ['G\'ani', 'Sobirov'],
  ];

  const defaultEmployeePasswordHash = bcrypt.hashSync('Employee123!', 10);

  for (let i = 0; i < employeeNames.length; i++) {
    const [first, last] = employeeNames[i];
    const deptIdx = i % createdDepts.length;
    const username = `employee_${i + 1}`.toLowerCase();

    const user = await prisma.user.create({
      data: {
        // Telegram ixtiyoriy - admin xohlasa keyinroq bog'lab qo'yishi mumkin
        firstName: first,
        lastName: last,
        username,
        email: `${username}@keldimketdim.uz`,
        passwordHash: defaultEmployeePasswordHash,
        phoneNumber: `+99890${String(1000000 + i).slice(1)}`,
        role: 'EMPLOYEE',
        employeeId: `EMP${String(i + 1).padStart(3, '0')}`,
        departmentId: createdDepts[deptIdx].id,
        isActive: true,
      },
    });

    const schedules = [
      { start: '08:00', end: '17:00', type: 'FIXED' },
      { start: '09:00', end: '18:00', type: 'FIXED' },
      { start: '06:00', end: '14:00', type: 'FIXED' },
      { start: '07:00', end: '16:00', type: 'FIXED' },
    ];

    const sch = schedules[i % schedules.length];
    await prisma.schedule.create({
      data: {
        userId: user.id,
        startTime: sch.start,
        endTime: sch.end,
        scheduleType: sch.type,
        workDays: [1, 2, 3, 4, 5],
        isActive: true,
      },
    });
  }

  // Bayram kunlari
  await prisma.holiday.createMany({
    data: [
      { name: 'Yangi yil', date: new Date('2026-01-01'), isRecurring: true, description: 'Yangi yil bayrami — dam olish kuni' },
      { name: 'Xalqaro xotin-qizlar kuni', date: new Date('2026-03-08'), isRecurring: true, description: 'Xalqaro xotin-qizlar kuni — dam olish kuni' },
      { name: 'Navro\'z bayrami', date: new Date('2026-03-21'), isRecurring: true, description: 'Navro\'z bayrami — dam olish kuni' },
      { name: 'Xotira va qadrlash kuni', date: new Date('2026-05-09'), isRecurring: true, description: 'Xotira va qadrlash kuni — dam olish kuni' },
      { name: 'Mustaqillik kuni', date: new Date('2026-09-01'), isRecurring: true, description: 'Mustaqillik kuni — dam olish kuni' },
      { name: 'O\'qituvchi va murabbiylar kuni', date: new Date('2026-10-01'), isRecurring: true, description: 'O\'qituvchi va murabbiylar kuni — dam olish kuni' },
      { name: 'Konstitutsiya kuni', date: new Date('2026-12-08'), isRecurring: true, description: 'Konstitutsiya kuni — dam olish kuni' },
    ],
  });

  console.log('Test ma\'lumotlar yaratildi:');
  console.log(`- Admin: 1 ta`);
  console.log(`- Bo\'limlar: ${createdDepts.length} ta`);
  console.log(`- Xodimlar: ${employeeNames.length} ta`);
  console.log(`- Ish joylari: 2 ta`);
  console.log(`- Bayramlar: 7 ta`);
  console.log('');
  console.log('Kirish ma\'lumotlari (email + parol):');
  console.log(`  Admin:  ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  console.log(`  Xodim:  employee_1@keldimketdim.uz / Employee123! (barcha xodimlar uchun bir xil, birinchi kirishda o'zgartirish tavsiya etiladi)`);
}

main()
  .catch((e) => {
    console.error('Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
