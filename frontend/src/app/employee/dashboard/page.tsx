'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { attendanceApi, scheduleApi } from '@/lib/api';
import { Modal } from '@/components/Modal';
import { AttendanceCheckInOut } from '@/components/AttendanceCheckInOut';
import { StatsCard } from '@/components/StatsCard';
import toast from 'react-hot-toast';
import type { Attendance, Schedule } from '@/types';
import {
  Clock,
  CalendarDays,
  ArrowRight,
  LogIn,
  LogOut,
  AlertTriangle,
  Timer,
  Hourglass,
  RefreshCw,
} from 'lucide-react';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [todayStatus, setTodayStatus] = useState<{ status: string; checkedIn: boolean; checkedOut: boolean } | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<{
    todayHours: number;
    monthlyHours: number;
    lateCount: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'in' | 'out' | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleRes, statusRes, attRes, statsRes] = await Promise.all([
        scheduleApi.getMy().catch(() => ({ data: { data: null } })),
        attendanceApi.getTodayStatus().catch(() => ({ data: { data: null } })),
        attendanceApi.getMy({ limit: 7, sort: '-workDate' }).catch(() => ({ data: { data: [] } })),
        attendanceApi.getMyStats().catch(() => ({ data: { data: null } })),
      ]);

      setSchedule(scheduleRes.data.data || null);
      setTodayStatus(statusRes.data.data || null);
      setRecentAttendance(attRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleComplete = () => {
    setModalType(null);
    fetchData();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PRESENT: { label: 'Kelgan', className: 'badge-success' },
      ABSENT: { label: 'Kelmagan', className: 'badge-danger' },
      LATE: { label: 'Kechikkan', className: 'badge-warning' },
      EARLY_LEAVE: { label: 'Erta ketgan', className: 'badge-warning' },
      HOLIDAY: { label: 'Dam olish', className: 'badge-info' },
      ON_LEAVE: { label: 'Ta\'tilda', className: 'badge-info' },
      SICK_LEAVE: { label: 'Kasallik', className: 'badge-info' },
    };
    const b = map[status] || { label: status, className: 'badge' };
    return <span className={b.className}>{b.label}</span>;
  };

  const formatTime = (dateStr?: string): string => {
    if (!dateStr) return '--:--';
    try {
      return new Date(dateStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={fetchData} className="btn-secondary gap-2">
              <RefreshCw className="w-4 h-4" />
              Qayta urinish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Salom, {user?.firstName || 'Xodim'}!
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Today's Schedule */}
      {schedule && (
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays size={18} className="text-telegram" />
            <span className="text-sm font-medium text-gray-700">Bugungi jadval</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock size={14} className="text-gray-400" />
              <span className="text-gray-600">{schedule.startTime.substring(0, 5)}</span>
            </div>
            <div className="h-px flex-1 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-sm">
              <Clock size={14} className="text-gray-400" />
              <span className="text-gray-600">{schedule.endTime.substring(0, 5)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`badge ${schedule.scheduleType === 'FIXED' ? 'badge-info' : schedule.scheduleType === 'SHIFT' ? 'badge-warning' : 'badge-success'}`}>
              {schedule.scheduleType === 'FIXED' ? 'Qat\'iy' : schedule.scheduleType === 'SHIFT' ? 'Smena' : 'Moslashuvchan'}
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setModalType('in')}
          disabled={todayStatus?.checkedIn}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-500 text-white font-medium
            hover:bg-green-600 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn size={20} />
          Kirish
        </button>
        <button
          onClick={() => setModalType('out')}
          disabled={!todayStatus?.checkedIn || todayStatus?.checkedOut}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500 text-white font-medium
            hover:bg-red-600 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={20} />
          Chiqish
        </button>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div className="flex-1">
                  <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <StatsCard
            icon={Timer}
            label="Bugun ishlangan"
            value={stats?.todayHours != null ? `${stats.todayHours.toFixed(1)} soat` : '0 soat'}
            color="text-telegram"
          />
          <StatsCard
            icon={Hourglass}
            label="Oylik soat"
            value={stats?.monthlyHours != null ? `${stats.monthlyHours.toFixed(0)} soat` : '0 soat'}
            color="text-green-600"
          />
          <StatsCard
            icon={AlertTriangle}
            label="Kechikishlar"
            value={stats?.lateCount ?? 0}
            color="text-orange-500"
          />
        </div>
      )}

      {/* Recent Attendance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Oxirgi davomat</h2>
          <button
            onClick={() => router.push('/employee/attendance')}
            className="flex items-center gap-1 text-sm text-telegram hover:underline"
          >
            Batafsil
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentAttendance.length === 0 ? (
          <div className="card text-center py-8">
            <Clock size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Hozircha davomat ma&apos;lumotlari yo&apos;q</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentAttendance.map((att) => (
              <div key={att.id} className="card flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatDate(att.workDate)}</p>
                  <p className="text-xs text-gray-500">
                    {formatTime(att.checkInTime)} - {formatTime(att.checkOutTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {att.lateMinutes > 0 && (
                    <span className="text-xs text-orange-500">{att.lateMinutes} daq kech</span>
                  )}
                  {statusBadge(att.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Check In/Out Modal */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType === 'in' ? 'Kirish' : 'Chiqish'}
      >
        {modalType && (
          <AttendanceCheckInOut type={modalType} onComplete={handleComplete} />
        )}
      </Modal>
    </div>
  );
}
