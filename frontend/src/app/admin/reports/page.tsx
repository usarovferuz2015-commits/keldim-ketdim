'use client';

import { useEffect, useState, useCallback } from 'react';
import { reportApi, userApi } from '@/lib/api';
import type { ReportData, User } from '@/types';
import {
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ReportTab = 'daily' | 'weekly' | 'monthly';

const tabs: { key: ReportTab; label: string }[] = [
  { key: 'daily', label: 'Kunlik' },
  { key: 'weekly', label: 'Haftalik' },
  { key: 'monthly', label: 'Oylik' },
];

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [report, setReport] = useState<ReportData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  });
  const [monthStart, setMonthStart] = useState(new Date().toISOString().slice(0, 7));
  const [userId, setUserId] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (userId) params.userId = userId;

      let res;
      if (activeTab === 'daily') {
        if (date) params.date = date;
        res = await reportApi.daily(params);
      } else if (activeTab === 'weekly') {
        if (weekStart) {
          params.startDate = weekStart;
          const end = new Date(weekStart);
          end.setDate(end.getDate() + 6);
          params.endDate = end.toISOString().slice(0, 10);
        }
        res = await reportApi.weekly(params);
      } else {
        if (monthStart) {
          const [y, m] = monthStart.split('-');
          params.year = y;
          params.month = m;
        }
        res = await reportApi.monthly(params);
      }
      setReport(res.data.data || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, date, weekStart, monthStart, userId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    userApi.getAll({ role: 'EMPLOYEE', limit: 500 }).then(({ data }) => {
      setUsers(data.data || []);
    }).catch(() => {});
  }, []);

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      const params: Record<string, unknown> = { type: activeTab };
      if (userId) params.userId = userId;
      if (activeTab === 'daily' && date) params.date = date;
      if (activeTab === 'weekly' && weekStart) params.weekStart = weekStart;
      if (activeTab === 'monthly' && monthStart) params.month = monthStart;

      const fn = type === 'excel' ? reportApi.exportExcel : reportApi.exportPdf;
      const { data } = await fn(params);
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisobot_${activeTab}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type === 'excel' ? 'Excel' : 'PDF'} fayl yuklandi`);
    } catch {
      toast.error('Eksport qilishda xatolik');
    }
  };

  const statCards = report?.summary
    ? [
        { icon: BarChart3, label: 'Ish kunlari', value: report.summary.totalDays, color: 'text-blue-600', bg: 'bg-blue-100' },
        { icon: Clock, label: 'Ishlangan soat', value: `${(report.summary.totalWorkedHours || 0).toFixed(1)}`, color: 'text-green-600', bg: 'bg-green-100' },
        { icon: AlertTriangle, label: 'Kechikishlar', value: report.summary.lateCount, color: 'text-orange-600', bg: 'bg-orange-100' },
        { icon: TrendingUp, label: 'Overtime soat', value: `${(report.summary.overtimeHours || 0).toFixed(1)}`, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { icon: UserX, label: 'Kelmasliklar', value: report.summary.absentDays, color: 'text-red-600', bg: 'bg-red-100' },
      ]
    : [];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <BarChart3 className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchReport}
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
          <h2 className="text-2xl font-bold text-gray-900">Hisobotlar</h2>
          <p className="text-gray-500 mt-1">Davomat hisobotlari va statistikasi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setReport(null);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        {activeTab === 'daily' && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        )}
        {activeTab === 'weekly' && (
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Hafta boshi"
          />
        )}
        {activeTab === 'monthly' && (
          <input
            type="month"
            value={monthStart}
            onChange={(e) => setMonthStart(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        )}
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-w-[200px]"
        >
          <option value="">Barcha xodimlar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName || ''}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Xodim</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bo&apos;lim</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ish. soat</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kechikish</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qo&apos;sh. soat</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelgan</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kelmagan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(!report.employees || report.employees.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        Bu davr uchun davomat ma&apos;lumotlari mavjud emas. Xodimlar hali check-in/check-out qilmagan.
                      </td>
                    </tr>
                  ) : (
                    (report.employees || []).map((emp, i) => (
                      <tr key={emp.user?.id || i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {emp.user
                            ? `${emp.user.firstName || ''} ${emp.user.lastName || ''}`.trim() || '—'
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {emp.user?.department?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {(emp.workedHours || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {emp.lateMinutes > 0 ? (
                            <span className="text-orange-600">{emp.lateMinutes} daq</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">
                          {(emp.overtimeHours || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-green-600 font-medium">{emp.presentDays || 0}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {emp.absentDays > 0 ? (
                            <span className="text-red-600 font-medium">{emp.absentDays}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!report && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <BarChart3 className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-lg font-medium">Hisobot tayyorlash uchun davrni tanlang</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-7 w-12 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-16 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
