'use client';

import { useEffect, useState, useCallback } from 'react';
import { attendanceApi, userApi, reportApi } from '@/lib/api';
import type { Attendance, User } from '@/types';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const statusLabels: Record<string, string> = {
  PRESENT: 'Keldi',
  ABSENT: 'Kelmadi',
  LATE: 'Kechikdi',
  EARLY_LEAVE: 'Erta ketdi',
  HOLIDAY: 'Bayram',
  SICK_LEAVE: 'Kasallik',
  ON_LEAVE: 'Dam olish',
};

const statusColors: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  LATE: 'bg-orange-100 text-orange-700',
  EARLY_LEAVE: 'bg-yellow-100 text-yellow-700',
  HOLIDAY: 'bg-purple-100 text-purple-700',
  SICK_LEAVE: 'bg-pink-100 text-pink-700',
  ON_LEAVE: 'bg-blue-100 text-blue-700',
};

const PAGE_SIZE = 15;

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
      if (date) params.date = date;
      if (userId) params.userId = userId;

      const [attRes, userRes] = await Promise.all([
        attendanceApi.getAll(params),
        userApi.getAll({ role: 'EMPLOYEE', limit: 500 }),
      ]);
      setRecords(attRes.data.data || []);
      setTotal(attRes.data.pagination?.total || 0);
      setUsers(userRes.data.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, date, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [date, userId]);

  const handleExportExcel = async () => {
    try {
      const params: Record<string, unknown> = {};
      if (date) params.date = date;
      if (userId) params.userId = userId;
      const { data } = await reportApi.exportExcel(params);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `davomat_${date || 'hisobot'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel fayl yuklandi');
    } catch {
      toast.error('Excel yuklashda xatolik');
    }
  };

  const handleExportPdf = async () => {
    try {
      const params: Record<string, unknown> = {};
      if (date) params.date = date;
      if (userId) params.userId = userId;
      const { data } = await reportApi.exportPdf(params);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `davomat_${date || 'hisobot'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF fayl yuklandi');
    } catch {
      toast.error('PDF yuklashda xatolik');
    }
  };

  const getUserName = (uid: string) => {
    const u = users.find((x) => x.id === uid);
    return u ? `${u.firstName} ${u.lastName || ''}`.trim() : '—';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'];
    const days = ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <Clock className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Davomat</h2>
          <p className="text-gray-500 mt-1">Barcha xodimlar davomati</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-w-[200px]"
          >
            <option value="">Barcha xodimlar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName || ''} {u.employeeId ? `(${u.employeeId})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Xodim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sana</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kirish</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Chiqish</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ishlangan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kechikish</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Erta ketish</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Overtime</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    Davomat ma'lumotlari topilmadi
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {getUserName(rec.userId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {rec.user?.department?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(rec.workDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {rec.checkInTime ? rec.checkInTime.slice(11, 16) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {rec.checkOutTime ? rec.checkOutTime.slice(11, 16) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {rec.workedHours.toFixed(1)} soat
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rec.lateMinutes > 0 ? (
                        <span className="text-orange-600">{rec.lateMinutes} daq</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rec.earlyLeaveMinutes > 0 ? (
                        <span className="text-yellow-600">{rec.earlyLeaveMinutes} daq</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rec.overtimeHours > 0 ? (
                        <span className="text-blue-600">{rec.overtimeHours.toFixed(1)} soat</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[rec.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusLabels[rec.status] || rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {total} ta natijadan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} ko'rsatilmoqda
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="contents">
                    {idx > 0 && p - (arr[idx - 1] ?? 0) > 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
