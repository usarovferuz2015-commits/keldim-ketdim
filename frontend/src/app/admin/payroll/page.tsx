'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { payrollApi } from '@/lib/api';
import type { PayrollRangeSummary, PayrollDaySummary, PayrollDayStatus } from '@/types';
import {
  Wallet,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  LogOut as LogOutIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

const todayStr = () => new Date().toISOString().split('T')[0];

const statusMeta: Record<PayrollDayStatus, { label: string; className: string }> = {
  DAM_OLISH_KUNI: { label: 'Dam olish kuni', className: 'bg-gray-100 text-gray-500' },
  BAYRAM: { label: 'Bayram', className: 'bg-purple-100 text-purple-700' },
  TATIL: { label: 'Tatilda', className: 'bg-purple-100 text-purple-700' },
  JADVAL_YOQ: { label: 'Jadval yo\'q', className: 'bg-gray-100 text-gray-500' },
  KELMADI: { label: 'Kelmadi', className: 'bg-red-100 text-red-700' },
  KUTILMOQDA: { label: 'Kutilmoqda', className: 'bg-gray-100 text-gray-500' },
  ISHDA: { label: 'Hozir ishda', className: 'bg-green-100 text-green-700' },
  TASHQARIDA: { label: 'Tashqarida', className: 'bg-orange-100 text-orange-700' },
  KECHIKKAN_VA_ERTA_KETGAN: { label: 'Kechikkan + erta ketgan', className: 'bg-red-100 text-red-700' },
  KECHIKKAN: { label: 'Kechikkan', className: 'bg-yellow-100 text-yellow-700' },
  ERTA_KETGAN: { label: 'Erta ketgan', className: 'bg-yellow-100 text-yellow-700' },
  BOSHLIQ_BOR: { label: "Bo'shliq bor", className: 'bg-orange-100 text-orange-700' },
  PRESENT: { label: "O'z vaqtida", className: 'bg-green-100 text-green-700' },
};

function formatMinutes(min: number): string {
  if (!min) return '0 daq';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} daq`;
  if (m === 0) return `${h} soat`;
  return `${h}s ${m}daq`;
}

function formatSom(n?: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('ru-RU') + " so'm";
}

function formatTime(t?: string): string {
  if (!t) return '—';
  // Backend UTC instant qaytaradi - har doim Toshkent mahalliy vaqtiga
  // aylantirib ko'rsatamiz (ko'ruvchi qurilma boshqa timezone'da bo'lsa ham
  // to'g'ri chiqishi uchun).
  return new Date(t).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' });
}

export default function AdminPayrollPage() {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [rows, setRows] = useState<PayrollRangeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<PayrollDaySummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approveModal, setApproveModal] = useState<PayrollRangeSummary | null>(null);
  const [approveMinutes, setApproveMinutes] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [approving, setApproving] = useState(false);

  const isSingleDay = startDate === endDate;

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await payrollApi.getSummary({ startDate, endDate });
      setRows(data.data || []);
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(axiosMsg || (err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik"));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSummary();
    setExpanded(null);
  }, [fetchSummary]);

  const toggleExpand = async (userId: string) => {
    if (expanded === userId) {
      setExpanded(null);
      setDayDetail(null);
      return;
    }
    setExpanded(userId);
    setDayDetail(null);
    setDetailLoading(true);
    try {
      // Diapazon bo'lsa - oxirgi kun bo'yicha batafsil ko'rsatamiz
      const { data } = await payrollApi.getDaily({ date: endDate, userId });
      setDayDetail(data.data);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const openApproveModal = (row: PayrollRangeSummary) => {
    setApproveModal(row);
    setApproveMinutes(String(row.outstandingDebtMinutes || ''));
    setApproveNote('');
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    const minutes = Number(approveMinutes);
    if (!minutes || minutes <= 0) {
      toast.error("Daqiqa musbat son bo'lishi kerak");
      return;
    }
    setApproving(true);
    try {
      await payrollApi.approveOvertime({ userId: approveModal.userId, minutesApplied: minutes, note: approveNote });
      toast.success('Otrabotka tasdiqlandi, qarz kamaytirildi');
      setApproveModal(null);
      fetchSummary();
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(axiosMsg || (err instanceof Error ? err.message : 'Xatolik yuz berdi'));
    } finally {
      setApproving(false);
    }
  };

  const totals = rows.reduce(
    (acc, r) => ({
      shortfall: acc.shortfall + r.totalShortfallMinutes,
      debt: acc.debt + r.outstandingDebtMinutes,
      debtAmount: acc.debtAmount + (r.outstandingDebtAmount || 0),
    }),
    { shortfall: 0, debt: 0, debtAmount: 0 }
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchSummary}
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
          <h2 className="text-2xl font-bold text-gray-900">Hisob-kitob</h2>
          <p className="text-gray-500 mt-1">
            Kechikish, tashqarida o'tkazgan vaqt, kamomad va otrabotka bo'yicha hisobot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={() => {
              setStartDate(todayStr());
              setEndDate(todayStr());
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Bugun
          </button>
        </div>
      </div>

      {/* Umumiy ko'rsatkichlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Jami kamomad</p>
            <p className="text-lg font-bold text-gray-900">{formatMinutes(totals.shortfall)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Qoplanmagan qarz</p>
            <p className="text-lg font-bold text-gray-900">{formatMinutes(totals.debt)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Ushlab qolinadigan summa</p>
            <p className="text-lg font-bold text-gray-900">{formatSom(totals.debtAmount)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Xodim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jadval</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ishlagan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kechikish</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kamomad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Otrabotka</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qarz</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Taxminiy oylik</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-4 py-3"><div className="h-4 w-full bg-gray-200 rounded" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Xodimlar topilmadi
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Fragment key={row.userId}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpand(row.userId)}
                          className="flex items-center gap-2 text-left"
                        >
                          {expanded === row.userId ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span>
                            <p className="text-sm font-medium text-gray-900">
                              {row.firstName} {row.lastName || ''}
                            </p>
                            <p className="text-xs text-gray-400">
                              {row.employeeId || '—'} · {row.hourlyRate ? `${row.hourlyRate.toLocaleString('ru-RU')} so'm/soat` : "Narx yo'q"}
                            </p>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatMinutes(row.totalScheduledMinutes)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatMinutes(row.totalWorkedMinutes)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatMinutes(row.totalLateMinutes)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={row.totalShortfallMinutes > 0 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                          {formatMinutes(row.totalShortfallMinutes)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600">{formatMinutes(row.approvedOvertimeMinutes)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={row.outstandingDebtMinutes > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                          {formatMinutes(row.outstandingDebtMinutes)}
                          {row.outstandingDebtAmount ? ` (${formatSom(row.outstandingDebtAmount)})` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatSom(row.estimatedPay)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => openApproveModal(row)}
                            disabled={row.outstandingDebtMinutes <= 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Otrabotka tasdiqlash
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === row.userId && (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 bg-gray-50">
                          {detailLoading ? (
                            <p className="text-sm text-gray-400">Yuklanmoqda...</p>
                          ) : dayDetail ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta[dayDetail.status]?.className}`}>
                                  {statusMeta[dayDetail.status]?.label || dayDetail.status}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {isSingleDay ? dayDetail.date : `Oxirgi kun: ${dayDetail.date}`} · jadval {dayDetail.scheduleStart}–{dayDetail.scheduleEnd}
                                </span>
                              </div>
                              {dayDetail.sessions.length === 0 ? (
                                <p className="text-sm text-gray-500">Bu kun uchun kirish-chiqish yozuvi yo'q.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {dayDetail.sessions.map((s, i) => (
                                    <div key={s.id} className="flex items-center gap-2 text-sm">
                                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="font-mono">{formatTime(s.checkInTime)}</span>
                                      <span className="text-gray-400">→</span>
                                      <span className="font-mono">{s.isOpen ? 'hozir...' : formatTime(s.checkOutTime)}</span>
                                      <span className="text-xs text-gray-400">({formatMinutes(s.workedMinutes)} ishladi)</span>
                                      {dayDetail.gaps[i] && (
                                        <span className="text-xs text-orange-600 flex items-center gap-1 ml-2">
                                          <LogOutIcon className="w-3 h-3" />
                                          keyingi kirishgacha {formatMinutes(dayDetail.gaps[i].minutes)} tashqarida
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">Ma'lumot yo'q</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Otrabotka tasdiqlash modali */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Otrabotka tasdiqlash</h3>
            <p className="text-sm text-gray-500 mb-4">
              <strong>{approveModal.firstName} {approveModal.lastName || ''}</strong> uchun qarzdan qancha daqiqa yopilsin?
              Joriy qarz: <strong>{formatMinutes(approveModal.outstandingDebtMinutes)}</strong>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daqiqa</label>
            <input
              type="number"
              min="1"
              value={approveMinutes}
              onChange={(e) => setApproveMinutes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Izoh (ixtiyoriy)</label>
            <input
              type="text"
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="Masalan: 8-avgust kuni 1 soat qo'shimcha ishladi"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {approving ? 'Saqlanmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
