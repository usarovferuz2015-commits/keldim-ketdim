'use client';

import { useEffect, useState } from 'react';
import { locationApi, departmentApi } from '@/lib/api';
import type { WorkLocation, Department } from '@/types';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Building2,
  Crosshair,
} from 'lucide-react';
import toast from 'react-hot-toast';

type LocationForm = {
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  departmentId: string;
};

const emptyForm: LocationForm = {
  name: '',
  latitude: '',
  longitude: '',
  radiusMeters: '100',
  departmentId: '',
};

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<WorkLocation | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteLoc, setDeleteLoc] = useState<WorkLocation | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [locRes, deptRes] = await Promise.all([
        locationApi.getAll(),
        departmentApi.getAll(),
      ]);
      setLocations(locRes.data.data || []);
      setDepartments(deptRes.data.data || []);
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

  const openAddModal = () => {
    setEditingLoc(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (loc: WorkLocation) => {
    setEditingLoc(loc);
    setForm({
      name: loc.name,
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      radiusMeters: String(loc.radiusMeters),
      departmentId: loc.departmentId || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.latitude || !form.longitude) {
      toast.error('Nomi, kenglik va uzunlik kiritish shart');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radiusMeters: parseInt(form.radiusMeters, 10) || 100,
        departmentId: form.departmentId || undefined,
      };

      if (editingLoc) {
        await locationApi.update(editingLoc.id, payload);
        toast.success('Lokatsiya yangilandi');
      } else {
        await locationApi.create(payload);
        toast.success("Lokatsiya qo'shildi");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Saqlashda xatolik';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteLoc) return;
    try {
      await locationApi.delete(deleteLoc.id);
      toast.success("Lokatsiya o'chirildi");
      setDeleteLoc(null);
      fetchData();
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
          <h2 className="text-2xl font-bold text-gray-900">Lokatsiyalar</h2>
          <p className="text-gray-500 mt-1">Ish joyi geofencing lokatsiyalari</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Lokatsiya qo'shish
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div className="h-5 w-28 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-40 bg-gray-100 rounded mb-3" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <MapPin className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Lokatsiyalar mavjud emas</p>
          <p className="text-sm text-gray-400 mt-1">Yangi lokatsiya qo'shish uchun yuqoridagi tugmani bosing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                    <span
                      className={`text-xs font-medium ${
                        loc.isActive ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {loc.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Crosshair className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-mono text-xs">
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Radius: {loc.radiusMeters} m</span>
                </div>
                {loc.department && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{loc.department.name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(loc)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                  title="Tahrirlash"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteLoc(loc)}
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLoc ? 'Lokatsiyani tahrirlash' : 'Yangi lokatsiya qo\'shish'}
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
                  placeholder="Lokatsiya nomi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kenglik (lat) *</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                    placeholder="41.2995"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uzunlik (lng) *</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                    placeholder="69.2401"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Radius (m)</label>
                  <input
                    type="number"
                    value={form.radiusMeters}
                    onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">Barcha bo'limlar</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
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
      {deleteLoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">O'chirishni tasdiqlash</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleteLoc.name}</strong> lokatsiyasini o'chirishni istaysizmi? Bu amal qaytarib bo'lmaydi.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteLoc(null)}
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
