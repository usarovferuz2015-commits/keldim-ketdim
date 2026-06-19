'use client';

import { useEffect, useState } from 'react';
import { holidayApi } from '@/lib/api';
import type { Holiday } from '@/types';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Cake,
  CalendarDays,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

type HolidayForm = {
  name: string;
  date: string;
  description: string;
  isRecurring: boolean;
};

const emptyForm: HolidayForm = {
  name: '',
  date: '',
  description: '',
  isRecurring: false,
};

export default function AdminHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [form, setForm] = useState<HolidayForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteHoliday, setDeleteHoliday] = useState<Holiday | null>(null);

  const fetchHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await holidayApi.getAll();
      setHolidays(data.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const openAddModal = () => {
    setEditingHoliday(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setForm({
      name: holiday.name,
      date: holiday.date.slice(0, 10),
      description: holiday.description || '',
      isRecurring: holiday.isRecurring,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.date) {
      toast.error('Nomi va sana kiritish shart');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        date: new Date(form.date).toISOString(),
        description: form.description.trim(),
        isRecurring: form.isRecurring,
      };

      if (editingHoliday) {
        await holidayApi.update(editingHoliday.id, payload);
        toast.success('Bayram yangilandi');
      } else {
        await holidayApi.create(payload);
        toast.success("Bayram qo'shildi");
      }
      setModalOpen(false);
      fetchHolidays();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Saqlashda xatolik';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteHoliday) return;
    try {
      await holidayApi.delete(deleteHoliday.id);
      toast.success("Bayram o'chirildi");
      setDeleteHoliday(null);
      fetchHolidays();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "O'chirishda xatolik";
      toast.error(msg);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <Cake className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchHolidays}
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
          <h2 className="text-2xl font-bold text-gray-900">Bayram kunlari</h2>
          <p className="text-gray-500 mt-1">Dam olish va bayram kunlari ro'yxati</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Bayram qo'shish
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-60 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="flex gap-1">
                  <div className="w-8 h-8 bg-gray-200 rounded-md" />
                  <div className="w-8 h-8 bg-gray-200 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Cake className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Bayram kunlari mavjud emas</p>
            <p className="text-sm text-gray-400 mt-1">Yangi bayram qo'shish uchun yuqoridagi tugmani bosing</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <Cake className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{holiday.name}</h4>
                    {holiday.isRecurring && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <RotateCw className="w-3 h-3" />
                        Har yili
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {holiday.description || 'Tavsif mavjud emas'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(holiday.date)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(holiday)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Tahrirlash"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteHoliday(holiday)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingHoliday ? 'Bayramni tahrirlash' : 'Yangi bayram qo\'shish'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Bayram nomi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sana *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Bayram tavsifi"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Har yili takrorlanadi</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
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
      {deleteHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">O'chirishni tasdiqlash</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleteHoliday.name}</strong> bayramini o'chirishni istaysizmi? Bu amal qaytarib bo'lmaydi.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteHoliday(null)}
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
