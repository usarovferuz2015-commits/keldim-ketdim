'use client';

import { useEffect, useState, useCallback } from 'react';
import { userApi, departmentApi, scheduleApi } from '@/lib/api';
import type { User, Department, Schedule } from '@/types';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Phone,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

type EmployeeForm = {
  firstName: string;
  lastName: string;
  telegramId: string;
  email: string;
  password: string;
  employeeId: string;
  phoneNumber: string;
  phoneNumber: string;
  departmentId: string;
  scheduleType: string;
  startTime: string;
  endTime: string;
  workDays: number[];
};

const emptyForm: EmployeeForm = {
  firstName: '',
  lastName: '',
  telegramId: '',
  email: '',
  password: '',
  employeeId: '',
  phoneNumber: '',
  departmentId: '',
  scheduleType: 'FIXED',
  startTime: '09:00',
  endTime: '18:00',
  workDays: [1, 2, 3, 4, 5],
};

const weekDays = [
  { value: 1, label: 'Dush' },
  { value: 2, label: 'Sesh' },
  { value: 3, label: 'Chor' },
  { value: 4, label: 'Pay' },
  { value: 5, label: 'Jum' },
  { value: 6, label: 'Shan' },
  { value: 0, label: 'Yak' },
];

const scheduleLabels: Record<string, string> = {
  FIXED: 'Qatiy',
  SHIFT: 'Smenali',
  FLEXIBLE: 'Moslashuvchan',
};

const PAGE_SIZE = 10;

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        page,
        limit: PAGE_SIZE,
        role: 'EMPLOYEE',
      };
      if (search) params.search = search;
      if (filterDept) params.departmentId = filterDept;

      const { data } = await userApi.getAll(params);
      setEmployees(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDept]);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentApi.getAll();
      setDepartments(data.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterDept]);

  const openAddModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (user: User) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName || '',
      telegramId: user.telegramId || '',
      email: (user as any).email || '',
      password: '',
      employeeId: user.employeeId || '',
      phoneNumber: user.phoneNumber || '',
      departmentId: user.departmentId || '',
      scheduleType: user.schedule?.scheduleType || 'FIXED',
      startTime: user.schedule?.startTime || '09:00',
      endTime: user.schedule?.endTime || '18:00',
      workDays: user.schedule?.workDays || [1, 2, 3, 4, 5],
    });
    setModalOpen(true);
  };

  const toggleWorkDay = (day: number) => {
    setForm((prev) => {
      const exists = prev.workDays.includes(day);
      return {
        ...prev,
        workDays: exists
          ? prev.workDays.filter((d) => d !== day)
          : [...prev.workDays, day],
      };
    });
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) {
      toast.error('Ism kiritish shart');
      return;
    }
    setSaving(true);
    try {
      const userData: Record<string, unknown> = {
        telegramId: form.telegramId.trim() || `manual_${Date.now()}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        password: form.password || undefined,
        employeeId: form.employeeId.trim(),
        phoneNumber: form.phoneNumber.trim(),
        departmentId: form.departmentId || undefined,
        role: 'EMPLOYEE',
      };

      const scheduleData: Record<string, unknown> = {
        scheduleType: form.scheduleType,
        startTime: form.startTime,
        endTime: form.endTime,
        workDays: form.workDays.sort((a, b) => a - b),
      };

      if (editingUser) {
        const updateData = { ...userData };
        delete updateData.telegramId;
        await userApi.update(editingUser.id, updateData);
        try {
          await scheduleApi.update(editingUser.id, scheduleData);
        } catch {
          // schedule may not exist yet
          await scheduleApi.create(editingUser.id, scheduleData);
        }
        toast.success('Xodim yangilandi');
      } else {
        const { data } = await userApi.create(userData);
        const newUser = data.data as User;
        await scheduleApi.create(newUser.id, scheduleData);
        toast.success('Xodim qo\'shildi');
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Saqlashda xatolik';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await userApi.delete(deleteUser.id);
      toast.success('Xodim o\'chirildi');
      setDeleteUser(null);
      fetchEmployees();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'O\'chirishda xatolik';
      toast.error(msg);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const scheduleText = (s?: Schedule) => {
    if (!s) return '—';
    return `${scheduleLabels[s.scheduleType] || s.scheduleType}, ${s.startTime} - ${s.endTime}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchEmployees}
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
          <h2 className="text-2xl font-bold text-gray-900">Xodimlar</h2>
          <p className="text-gray-500 mt-1">Barcha xodimlar ro'yxati</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Xodim qo'shish
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ism yoki ID bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Barcha bo'limlar</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Xodim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bo'lim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jadval</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 bg-gray-200 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Xodimlar topilmadi
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp.photoUrl ? (
                          <img
                            src={emp.photoUrl}
                            alt={emp.firstName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-xs">
                              {emp.firstName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {emp.firstName} {emp.lastName || ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{emp.employeeId || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.department?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {emp.phoneNumber ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {emp.phoneNumber}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {scheduleText(emp.schedule)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {emp.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Tahrirlash"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteUser(emp)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Ism"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Familiya"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID *</label>
                  <input
                    type="text"
                    value={form.telegramId}
                    onChange={(e) => setForm({ ...form, telegramId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="+998901234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xodim ID</label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">Bo'limsiz</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="xodim@misol.uz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? 'Yangi parol' : 'Parol'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder={editingUser ? 'O\'zgarishsiz qoldiring' : '********'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jadval turi</label>
                <select
                  value={form.scheduleType}
                  onChange={(e) => setForm({ ...form, scheduleType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="FIXED">Qatiy</option>
                  <option value="SHIFT">Smenali</option>
                  <option value="FLEXIBLE">Moslashuvchan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Boshlanish</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tugash</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ish kunlari</label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWorkDay(d.value)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        form.workDays.includes(d.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">O\'chirishni tasdiqlash</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleteUser.firstName} {deleteUser.lastName || ''}</strong> nomli xodimni o'chirishni istaysizmi? Bu amal qaytarib bo'lmaydi.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
