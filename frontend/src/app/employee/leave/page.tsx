'use client';

import { useEffect, useState, useCallback } from 'react';
import { leaveApi } from '@/lib/api';
import type { LeaveRequest, LeaveType } from '@/types';
import {
  CalendarPlus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

const leaveTypeLabels: Record<LeaveType, string> = {
  SICK: 'Kasallik',
  VACATION: "Ta'til",
  PERSONAL: 'Shaxsiy',
  OTHER: 'Boshqa',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, typeof Clock> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
};

const emptyForm = {
  leaveType: 'VACATION' as LeaveType,
  startDate: '',
  endDate: '',
  reason: '',
};

export default function EmployeeLeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await leaveApi.getMy();
      setLeaves(data.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('Boshlanish va tugash sanalarini kiriting');
      return;
    }
    if (form.startDate > form.endDate) {
      toast.error("Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas");
      return;
    }

    setSubmitting(true);
    try {
      await leaveApi.create({
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim() || undefined,
      });
      toast.success("Ariza yuborildi, admin ko'rib chiqadi");
      setForm(emptyForm);
      fetchLeaves();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Ariza yuborishda xatolik';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dam olish</h2>
        <p className="text-gray-500 text-sm mt-0.5">Dam olish/ta'til so'rash va arizalar tarixi</p>
      </div>

      {/* Ariza yuborish formasi */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-900 font-semibold">
          <CalendarPlus className="w-5 h-5 text-telegram" />
          Yangi ariza
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Turi</label>
          <select
            value={form.leaveType}
            onChange={(e) => setForm((p) => ({ ...p, leaveType: e.target.value as LeaveType }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            {Object.entries(leaveTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Boshlanish</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tugash</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sabab (ixtiyoriy)</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Sababni yozing..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary justify-center gap-2"
        >
          {submitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Send size={16} />
          )}
          Yuborish
        </button>
      </form>

      {/* Arizalar tarixi */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900 text-sm">
          Mening arizalarim
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button onClick={fetchLeaves} className="btn-secondary text-sm gap-2 mx-auto">
              <RefreshCw size={14} /> Qayta urinish
            </button>
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Hali arizalar yo'q</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leaves.map((leave) => {
              const StatusIcon = statusIcons[leave.status] || Clock;
              return (
                <div key={leave.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {leaveTypeLabels[leave.leaveType] || leave.leaveType}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      {leave.startDate.slice(0, 10)} → {leave.endDate.slice(0, 10)}
                    </p>
                    {leave.reason && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{leave.reason}</p>
                    )}
                    {leave.status === 'REJECTED' && leave.rejectedReason && (
                      <p className="text-xs text-red-500 mt-1">Sabab: {leave.rejectedReason}</p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[leave.status]}`}>
                    <StatusIcon size={12} />
                    {statusLabels[leave.status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
