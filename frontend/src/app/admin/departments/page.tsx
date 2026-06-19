'use client';

import { useEffect, useState } from 'react';
import { departmentApi } from '@/lib/api';
import type { Department } from '@/types';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteDept, setDeleteDept] = useState<Department | null>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await departmentApi.getAll();
      setDepartments(data.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setFormName('');
    setFormDesc('');
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormDesc(dept.description || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Bo'lim nomi kiritish shart");
      return;
    }
    setSaving(true);
    try {
      if (editingDept) {
        await departmentApi.update(editingDept.id, { name: formName.trim(), description: formDesc.trim() });
        toast.success("Bo'lim yangilandi");
      } else {
        await departmentApi.create({ name: formName.trim(), description: formDesc.trim() });
        toast.success("Bo'lim qo'shildi");
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Saqlashda xatolik';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDept) return;
    try {
      await departmentApi.delete(deleteDept.id);
      toast.success("Bo'lim o'chirildi");
      setDeleteDept(null);
      fetchDepartments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "O'chirishda xatolik";
      toast.error(msg);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <X className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchDepartments}
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
          <h2 className="text-2xl font-bold text-gray-900">Bo'limlar</h2>
          <p className="text-gray-500 mt-1">Barcha bo'limlar ro'yxati</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Bo'lim qo'shish
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-48 bg-gray-100 rounded mb-4" />
              <div className="flex items-center gap-4">
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-4 w-16 bg-gray-100 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Building2 className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Bo'limlar mavjud emas</p>
          <p className="text-sm text-gray-400 mt-1">Yangi bo'lim qo'shish uchun yuqoridagi tugmani bosing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                    {dept.isActive === false && (
                      <span className="text-xs text-red-500 font-medium">Nofaol</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {dept.description || 'Tavsif mavjud emas'}
              </p>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  {dept._count?.users ?? 0} ta xodim
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => router.push(`/admin/employees?departmentId=${dept.id}`)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Xodimlarni ko'rish"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(dept)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Tahrirlash"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteDept(dept)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDept ? "Bo'limni tahrirlash" : "Yangi bo'lim qo'shish"}
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Bo'lim nomi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Bo'lim tavsifi"
                />
              </div>
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
      {deleteDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">O'chirishni tasdiqlash</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleteDept.name}</strong> bo'limini o'chirishni istaysizmi? Bu amal qaytarib bo'lmaydi.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteDept(null)}
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
