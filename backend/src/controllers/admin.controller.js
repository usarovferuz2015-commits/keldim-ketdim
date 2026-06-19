const prisma = require('../utils/prisma');
const googleSheetsService = require('../services/googleSheets.service');
const logger = require('../utils/logger');

const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalDepartments,
      totalLocations,
      totalAttendances,
      todayAttendances,
      pendingLeaves,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.department.count({ where: { isActive: true } }),
      prisma.workLocation.count({ where: { isActive: true } }),
      prisma.attendance.count(),
      prisma.attendance.count({
        where: {
          workDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const todayPresent = await prisma.attendance.count({
      where: {
        workDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: 'PRESENT',
      },
    });

    const todayAbsent = await prisma.attendance.count({
      where: {
        workDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: 'ABSENT',
      },
    });

    const todayLate = await prisma.attendance.count({
      where: {
        workDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: 'LATE',
      },
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        departments: totalDepartments,
        locations: totalLocations,
        attendance: {
          total: totalAttendances,
          today: {
            total: todayAttendances,
            present: todayPresent,
            absent: todayAbsent,
            late: todayLate,
          },
        },
        pendingLeaves,
      },
    });
  } catch (error) {
    logger.error('Tizim statistikasi xatolik:', error.message);
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Audit loglarni olish xatolik:', error.message);
    next(error);
  }
};

const bulkSyncSheets = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { department: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    await googleSheetsService.syncEmployeeList(users);

    const attendanceRecords = await prisma.attendance.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
      },
      orderBy: { workDate: 'desc' },
    });

    for (const record of attendanceRecords) {
      await googleSheetsService.syncAttendance(record);
    }

    logger.info(`Ommaviy sinxronlash: ${users.length} xodim, ${attendanceRecords.length} davomat`);

    res.json({
      success: true,
      data: {
        employeesCount: users.length,
        attendanceCount: attendanceRecords.length,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Ommaviy sinxronlash xatolik:', error.message);
    next(error);
  }
};

const seedSampleData = async (req, res, next) => {
  try {
    const departments = [
      { name: 'Axborot texnologiyalari', description: 'IT bo\'limi' },
      { name: 'Buxgalteriya', description: 'Moliyaviy hisobot' },
      { name: 'Kadrlar bo\'limi', description: 'Inson resurslari' },
      { name: 'Sotuv bo\'limi', description: 'Savdo va marketing' },
      { name: 'Xavfsizlik', description: 'Qo\'riqlash xizmati' },
    ];

    const createdDepartments = [];
    for (const dept of departments) {
      const existing = await prisma.department.findUnique({ where: { name: dept.name } });
      if (!existing) {
        const created = await prisma.department.create({ data: dept });
        createdDepartments.push(created);
      } else {
        createdDepartments.push(existing);
      }
    }

    logger.info(`${createdDepartments.length} ta bo'lim yaratildi`);

    const sampleFirstNames = [
      'Alisher', 'Dilshod', 'Jasur', 'Bekzod', 'Akmal',
      'Olim', 'Sarvar', 'Nodir', 'Ulug\'bek', 'Shavkat',
      'Dilnoza', 'Gulnora', 'Madina', 'Nilufar', 'Zarina',
      'Kamola', 'Dildora', 'Feruza', 'Nargiza', 'Malika',
    ];

    const sampleLastNames = [
      'Karimov', 'Toshmatov', 'Rashidov', 'Sodiqov', 'Yusupov',
      'Mirzayev', 'Xolmatov', 'Ergashev', 'Jalilov', 'Ismoilov',
      'Abdullayeva', 'Azizova', 'Rahimova', 'Tursunova', 'Saidova',
      'Qodirova', 'Nazarova', 'Hasanova', 'Yusupova', 'Murodova',
    ];

    let createdCount = 0;
    for (let i = 0; i < 50; i++) {
      const firstName = sampleFirstNames[i % sampleFirstNames.length];
      const lastName = sampleLastNames[i % sampleLastNames.length];
      const employeeId = `EMP-${String(i + 1).padStart(4, '0')}`;
      const telegramId = String(1000000000 + i);

      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ employeeId }, { telegramId }],
        },
      });

      if (!existing) {
        const dept = createdDepartments[i % createdDepartments.length];
        const isActive = i < 45;

        await prisma.user.create({
          data: {
            telegramId,
            firstName,
            lastName,
            username: `user${i + 1}`,
            phoneNumber: `+99890${String(1000000 + i).slice(-7)}`,
            role: i < 2 ? 'ADMIN' : 'EMPLOYEE',
            isActive,
            employeeId,
            departmentId: dept.id,
            schedule: {
              create: {
                scheduleType: i % 3 === 0 ? 'SHIFT' : i % 3 === 1 ? 'FLEXIBLE' : 'FIXED',
                startTime: '09:00',
                endTime: '18:00',
                workDays: [1, 2, 3, 4, 5],
              },
            },
          },
        });
        createdCount++;
      }
    }

    logger.info(`${createdCount} ta yangi xodim yaratildi (jami 50 tagacha)`);

    const today = new Date();
    const sampleStatuses = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT'];

    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const workDate = new Date(today);
      workDate.setDate(workDate.getDate() - dayOffset);
      const dayOfWeek = workDate.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const users = await prisma.user.findMany({
        where: { isActive: true },
        take: 30,
      });

      for (const user of users) {
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            userId: user.id,
            workDate: {
              gte: new Date(workDate.setHours(0, 0, 0, 0)),
              lt: new Date(workDate.setHours(23, 59, 59, 999)),
            },
          },
        });

        if (!existingAttendance) {
          const status = sampleStatuses[Math.floor(Math.random() * sampleStatuses.length)];
          const isPresent = status === 'PRESENT' || status === 'LATE';

          const checkInHour = status === 'LATE' ? 10 : 9;
          const checkInMinute = Math.floor(Math.random() * 30);
          const workDateStart = new Date(workDate);
          workDateStart.setHours(checkInHour, checkInMinute, 0, 0);

          let checkOutTime = null;
          let workedHours = 0;
          if (isPresent) {
            workDateStart.setHours(0, 0, 0, 0);
            const checkIn = new Date(workDateStart);
            checkIn.setHours(checkInHour, checkInMinute, 0, 0);

            const checkOut = new Date(checkIn);
            checkOut.setHours(18, Math.floor(Math.random() * 30), 0, 0);
            checkOutTime = checkOut;
            workedHours = (checkOut - checkIn) / (1000 * 60 * 60);
          }

          await prisma.attendance.create({
            data: {
              userId: user.id,
              workDate: new Date(workDate.setHours(0, 0, 0, 0)),
              scheduleStart: '09:00',
              scheduleEnd: '18:00',
              checkInTime: isPresent ? new Date(new Date(workDate).setHours(checkInHour, checkInMinute, 0, 0)) : null,
              checkOutTime,
              workedHours: Math.round(workedHours * 100) / 100,
              lateMinutes: status === 'LATE' ? 30 + Math.floor(Math.random() * 30) : 0,
              status,
            },
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Test ma\'lumotlari muvaffaqiyatli yaratildi',
        departments: createdDepartments.length,
        employees: createdCount,
        description: '5 ta bo\'lim, 50 tagacha xodim, 30 kunlik davomat yozuvlari yaratildi',
      },
    });
  } catch (error) {
    logger.error('Test ma\'lumotlarni yaratish xatolik:', error.message);
    next(error);
  }
};

module.exports = {
  getSystemStats,
  getAuditLogs,
  bulkSyncSheets,
  seedSampleData,
};
