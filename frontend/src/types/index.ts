export interface User {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  photoUrl?: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  employeeId?: string;
  departmentId?: string;
  faceTemplate?: string;
  hourlyRate?: number | null;
  department?: Department;
  schedule?: Schedule;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count?: { users: number };
  createdAt: string;
}

export interface WorkLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  departmentId?: string;
  department?: Department;
  createdAt: string;
}

export type ScheduleType = 'FIXED' | 'SHIFT' | 'FLEXIBLE';

export interface Schedule {
  id: string;
  userId: string;
  scheduleType: ScheduleType;
  startTime: string;
  endTime: string;
  workDays: number[];
  shiftName?: string;
  flexibleStart?: string;
  flexibleEnd?: string;
  isActive: boolean;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'HOLIDAY' | 'SICK_LEAVE' | 'ON_LEAVE';

export interface Attendance {
  id: string;
  userId: string;
  workDate: string;
  scheduleStart: string;
  scheduleEnd: string;
  checkInTime?: string;
  checkOutTime?: string;
  workedHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeHours: number;
  status: AttendanceStatus;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkInImage?: string | null;
  checkOutImage?: string | null;
  faceVerified: boolean;
  livenessVerified: boolean;
  gpsVerified: boolean;
  // Ochiq sessiya (hali check-out qilinmagan) uchun backend workedHours'ni
  // jonli hisoblab qaytaradi - bu flag shuni bildiradi
  isOpenSession?: boolean;
  workLocationId?: string;
  workLocation?: WorkLocation;
  user?: User;
  createdAt: string;
}

export type LeaveType = 'SICK' | 'VACATION' | 'PERSONAL' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  rejectedReason?: string;
  user?: User;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
}

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  currentlyWorking: number;
  lateToday: number;
  attendanceRate: number;
  onLeaveToday: number;
}

export interface ReportSummary {
  totalDays: number;
  totalWorkedHours: number;
  lateCount: number;
  overtimeHours: number;
  absentDays: number;
  presentDays: number;
  attendanceRate: number;
}

export interface ReportEmployeeRow {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    department?: { name?: string };
  };
  workedHours: number;
  lateMinutes: number;
  overtimeHours: number;
  status?: AttendanceStatus;
  presentDays?: number;
  absentDays?: number;
  lateDays?: number;
  earlyLeaveDays?: number;
}

export interface ReportData {
  date?: string;
  period?: { start?: string; end?: string; year?: number; month?: number };
  summary: ReportSummary;
  employees: ReportEmployeeRow[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type PayrollDayStatus =
  | 'DAM_OLISH_KUNI'
  | 'BAYRAM'
  | 'TATIL'
  | 'JADVAL_YOQ'
  | 'KELMADI'
  | 'KUTILMOQDA'
  | 'ISHDA'
  | 'TASHQARIDA'
  | 'KECHIKKAN_VA_ERTA_KETGAN'
  | 'KECHIKKAN'
  | 'ERTA_KETGAN'
  | 'BOSHLIQ_BOR'
  | 'PRESENT';

export interface PayrollSession {
  id: string;
  checkInTime?: string;
  checkOutTime?: string;
  workLocation?: { id: string; name: string };
  faceVerified: boolean;
  livenessVerified: boolean;
  workedMinutes: number;
  isOpen: boolean;
}

export interface PayrollGap {
  fromTime: string;
  toTime: string;
  minutes: number;
}

export interface PayrollDaySummary {
  date: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  scheduledMinutes: number;
  sessions: PayrollSession[];
  gaps: PayrollGap[];
  firstCheckIn?: string;
  lastCheckOut?: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  shortfallMinutes: number;
  overtimeMinutes: number;
  inProgress: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  isOnLeave?: boolean;
  status: PayrollDayStatus;
}

export interface PayrollRangeSummary {
  userId: string;
  firstName: string;
  lastName?: string;
  employeeId?: string;
  hourlyRate?: number | null;
  totalScheduledMinutes: number;
  totalWorkedMinutes: number;
  totalLateMinutes: number;
  totalShortfallMinutes: number;
  totalOvertimeMinutes: number;
  approvedOvertimeMinutes: number;
  outstandingDebtMinutes: number;
  outstandingDebtAmount: number | null;
  estimatedPay: number | null;
  daysAbsent: number;
  daysLate: number;
  daysWithGaps: number;
}

export interface OvertimeApproval {
  id: string;
  userId: string;
  minutesApplied: number;
  note?: string;
  approvedById: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName?: string; employeeId?: string };
  approvedBy?: { id: string; firstName: string; lastName?: string };
}

export interface FaceVerificationResult {
  verified: boolean;
  confidence: number;
  message?: string;
}

export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  message?: string;
}

export interface GpsVerificationResult {
  withinGeofence: boolean;
  distance: number;
  locationName?: string;
  message?: string;
}
