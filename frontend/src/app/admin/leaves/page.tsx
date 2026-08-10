'use client';

import { useEffect, useState, useCallback } from 'react';
import { leaveApi, userApi } from '@/lib/api';
import type { LeaveRequest, LeaveType, User } from '@/types';
import {
  Check,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

const leaveTypeLabels: Record<string, string> = {
  SICK: 'Kasallik',
  VACATION: 'Ta\'til',
  PERSONAL: 'Shaxsiy',
  OTHER: 'Boshqa',
};

const emptyAssignForm = {
  userId: '',
  leaveType: 'VACATION' as LeaveType,
  startDate: '',
  endDate: '',
  reason: '',
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

const statusTabBg: Record<string, string> = {
  PENDING: 'border-b-yellow-500 text-yellow-700',
  APPROVED: 'border-b-green-500 text-green-700',
  REJECTED: 'border-b-red-500 text-red-700',
};

const PAGE_SIZE = 10;

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [rejectModal, setRejectModal] = useState<{ leave: LeaveRequest; reason: string } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  useEffect(() => {
    userApi.getAll({ role: 'EMPLOYEE', limit: 500 }).then(({ data }) => {
      setUsers(data.data || []);
    }).catch(() => {});
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.userId) {
      toast.error('Xodimni tanlang');
      return;
    }
    if (!assignForm.startDate || !assignForm.endDate) {
      toast.error('Boshlanish va tugash sanalarini kiriting');
      return;
    }
    if (assignForm.startDate > assignForm.endDate) {
      toast.error("Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas");
      return;
    }

    setAssignSubmitting(true);
    try {
      await leaveApi.create({
        userId: assignForm.userId,
        leaveType: assignForm.leaveType,
        startDate: assignForm.startDate,
        endDate: assignForm.endDate,
        reason: assignForm.reason.trim() || undefined,
      });
      toast.success("Dam olish belgilandi (avtomatik tasdiqlangan)");
      setAssignModalOpen(false);
      setAssignForm(emptyAssignForm);
      setStatusFilter('APPROVED');
      fetchLeaves();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Belgilashda xatolik';
      toast.error(msg);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await leaveApi.getAll({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
      });
      setLeaves(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleApprove = async (leave: LeaveRequest) => {
    try {
      await leaveApi.updateStatus(leave.id, { status: 'APPROVED' });
      toast.success('Ariza tasdiqlandi');
      fetchLeaves();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await leaveApi.updateStatus(rejectModal.leave.id, {
        status: 'REJECTED',
        rejectedReason: rejectModal.reason,
      });
      toast.success('Ariza rad etildi');
      setRejectModal(null);
      fetchLeaves();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      toast.error(msg);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <CalendarDays className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchLeaves}
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
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dam olish arizalari</h2>
          <p className="text-gray-500 mt-1">Xodimlar dam olish arizalari ro'yxati</p>
        </div>
        <button
          onClick={() => setAssignModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Xodim uchun belgilash
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex">
            {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  statusFilter === status
                    ? statusTabBg[status] + ' border-b-2'
                    : 'border-b-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Xodim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Boshlanish</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tugash</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sabab</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {statusFilter === 'PENDING'
                      ? "Kutilayotgan arizalar mavjud emas"
                      : "Arizalar topilmadi"}
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {leave.user
                        ? `${leave.user.firstName} ${leave.user.lastName || ''}`
                        : leave.userId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {leaveTypeLabels[leave.leaveType] || leave.leaveType}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {leave.startDate.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {leave.endDate.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                      {leave.reason || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[leave.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusLabels[leave.status] || leave.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {leave.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleApprove(leave)}
                            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition"
                            title="Tasdiqlash"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejectModal({ leave, reason: '' })}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition"
                            title="Rad etish"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md text-sm font-medium transition ${
                    p === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
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

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rad etish sababi</h3>
              <button
                onClick={() => setRejectModal(null)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Rad etish sababini yozing..."
            />

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Rad etish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xodim uchun dam olish belgilash modali */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Xodim uchun dam olish belgilash</h3>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Bu yerda belgilangan dam olish darhol tasdiqlangan holatda saqlanadi - alohida tasdiqlash shart emas.
            </p>

            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Xodim</label>
                <select
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm((p) => ({ ...p, userId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  required
                >
                  <option value="">Xodimni tanlang</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName || ''} {u.employeeId ? `(${u.employeeId})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Turi</label>
                <select
                  value={assignForm.leaveType}
                  onChange={(e) => setAssignForm((p) => ({ ...p, leaveType: e.target.value as LeaveType }))}
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
                    value={assignForm.startDate}
                    onChange={(e) => setAssignForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tugash</label>
                  <input
                    type="date"
                    value={assignForm.endDate}
                    onChange={(e) => setAssignForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sabab (ixtiyoriy)</label>
                <textarea
                  value={assignForm.reason}
                  onChange={(e) => setAssignForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Sababni yozing..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition"
                >
                  {assignSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Belgilash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
