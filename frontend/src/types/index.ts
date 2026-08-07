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
  faceVerified: boolean;
  livenessVerified: boolean;
  gpsVerified: boolean;
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
