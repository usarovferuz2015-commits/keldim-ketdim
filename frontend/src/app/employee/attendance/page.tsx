'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { attendanceApi } from '@/lib/api';
import type { Attendance, ApiResponse } from '@/types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  RefreshCw,
  Timer,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export default function EmployeeAttendancePage() {
  const { user } = useAuthStore();

  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [pagination, setPagination] = useState<{ page: number; total: number; totalPages: number }>({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState<{
    totalRecords: number;
    totalWorkedHours: number;
    lateDays: number;
    absentDays: number;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchAttendance = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [attRes, statsRes] = await Promise.all([
        attendanceApi.getMy({ startDate, endDate, page, limit: 20, sort: '-workDate' }).catch(() => ({
          data: { success: false, data: [] as Attendance[], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } } satisfies ApiResponse<Attendance[]>,
        })),
        attendanceApi.getMyStats().catch(() => ({ data: { data: null } })),
      ]);

      setRecords(attRes.data.data || []);
      setPagination(attRes.data.pagination || { page: 1, total: 0, totalPages: 1 });
      setStats(statsRes.data.data || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchAttendance(page);
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

  const monthName = currentDate.toLocaleDateString('uz-UZ', { month: 'long' });

  if (error) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={() => fetchAttendance()} className="btn-secondary gap-2">
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
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Davomat tarixi</h1>
        <p className="text-sm text-gray-500 mt-0.5">Oylik davomat ma&apos;lumotlari</p>
      </div>

      {/* Monthly Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card text-center">
            <Calendar size={20} className="text-telegram mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{stats.totalRecords}</p>
            <p className="text-xs text-gray-500">Ish kuni</p>
          </div>
          <div className="card text-center">
            <Timer size={20} className="text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{(stats.totalWorkedHours || 0).toFixed(0)}</p>
            <p className="text-xs text-gray-500">Jami soat</p>
          </div>
          <div className="card text-center">
            <AlertTriangle size={20} className="text-orange-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{stats.lateDays}</p>
            <p className="text-xs text-gray-500">Kechikish</p>
          </div>
          <div className="card text-center">
            <TrendingUp size={20} className="text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{stats.absentDays}</p>
            <p className="text-xs text-gray-500">Kelmaslik</p>
          </div>
        </div>
      )}

      {/* Month Filter */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-900 capitalize">
          {monthName} {year}
        </span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-10">
          <Clock size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Bu oyda davomat ma&apos;lumotlari yo&apos;q</p>
        </div>
      ) : (
        <>
          {/* Desktop table header */}
          <div className="hidden sm:grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 px-2">
            <span>Sana</span>
            <span>Kirish</span>
            <span>Chiqish</span>
            <span className="text-center">Ishlangan</span>
            <span className="text-center">Kechikish</span>
            <span className="text-right">Status</span>
          </div>

          <div className="space-y-2">
            {records.map((att) => (
              <div key={att.id} className="card">
                {/* Mobile view */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{formatDate(att.workDate)}</span>
                    {statusBadge(att.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{formatTime(att.checkInTime)} - {formatTime(att.checkOutTime)}</span>
                    <span>{att.workedHours.toFixed(1)} soat</span>
                  </div>
                  {att.lateMinutes > 0 && (
                    <p className="text-xs text-orange-500 mt-1">+{att.lateMinutes} daq kechikish</p>
                  )}
                </div>

                {/* Desktop view */}
                <div className="hidden sm:grid grid-cols-6 gap-2 items-center text-sm">
                  <span className="text-gray-900 font-medium">{formatDate(att.workDate)}</span>
                  <span className="text-gray-600">{formatTime(att.checkInTime)}</span>
                  <span className="text-gray-600">{formatTime(att.checkOutTime)}</span>
                  <span className="text-center text-gray-700">{att.workedHours.toFixed(1)} soat</span>
                  <span className="text-center">
                    {att.lateMinutes > 0 ? (
                      <span className="text-orange-500">+{att.lateMinutes} daq</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </span>
                  <span className="text-right">{statusBadge(att.status)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-500">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
