'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authApi, userApi } from '@/lib/api';
import { Modal } from '@/components/Modal';
import { FaceVerification } from '@/components/FaceVerification';
import toast from 'react-hot-toast';
import {
  User,
  Building2,
  Phone,
  Hash,
  UserCheck,
  LogOut,
  Camera,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function EmployeeProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [hasFaceTemplate, setHasFaceTemplate] = useState<boolean | null>(null);
  const [loadingFace, setLoadingFace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);

  const fetchFaceStatus = async () => {
    if (!user?.id) return;
    setLoadingFace(true);
    setError(null);
    try {
      const { data } = await userApi.getFaceTemplate(user.id);
      setHasFaceTemplate(!!data.data);
    } catch (err: unknown) {
      setHasFaceTemplate(false);
    } finally {
      setLoadingFace(false);
    }
  };

  useEffect(() => {
    fetchFaceStatus();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await authApi.logout().catch(() => {});
    } catch {
      // ignore
    }
    logout();
    router.replace('/login');
    toast.success('Tizimdan chiqdingiz');
  };

  const handleFaceRegisterSuccess = () => {
    setShowFaceModal(false);
    setHasFaceTemplate(true);
    toast.success('Yuz muvaffaqiyatli ro\'yxatdan o\'tkazildi');
    fetchFaceStatus();
  };

  const getRoleLabel = (role: string): string => {
    return role === 'ADMIN' ? 'Administrator' : 'Xodim';
  };

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Shaxsiy ma&apos;lumotlar</p>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-telegram flex items-center justify-center shrink-0 overflow-hidden">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={28} className="text-white" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Noma\'lum'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{getRoleLabel(user?.role || 'EMPLOYEE')}</p>

            {user?.employeeId && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Hash size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">{user.employeeId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info items */}
        <div className="mt-4 pt-4 border-t space-y-3">
          {user?.department && (
            <div className="flex items-center gap-3 text-sm">
              <Building2 size={18} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Bo&apos;lim</p>
                <p className="text-gray-900 font-medium">{user.department.name}</p>
              </div>
            </div>
          )}

          {user?.phoneNumber && (
            <div className="flex items-center gap-3 text-sm">
              <Phone size={18} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Telefon</p>
                <p className="text-gray-900 font-medium">{user.phoneNumber}</p>
              </div>
            </div>
          )}

          {user?.username && (
            <div className="flex items-center gap-3 text-sm">
              <UserCheck size={18} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Telegram username</p>
                <p className="text-gray-900 font-medium">@{user.username}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Face Template Status */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Yuz shabloni holati</h3>

        {loadingFace ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 size={16} className="animate-spin" />
            Tekshirilmoqda...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertTriangle size={16} />
              <span>Xatolik yuz berdi</span>
            </div>
            <button onClick={fetchFaceStatus} className="btn-secondary text-xs gap-1">
              <RefreshCw size={12} />
              Qayta urinish
            </button>
          </div>
        ) : hasFaceTemplate ? (
          <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Ro&apos;yxatdan o&apos;tgan</p>
              <p className="text-xs text-green-600">Yuz shabloni saqlangan</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-yellow-50 rounded-lg p-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-700">Ro&apos;yxatdan o&apos;tmagan</p>
              <p className="text-xs text-yellow-600">Yuz shabloni hali yaratilmagan</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowFaceModal(true)}
          className="mt-3 w-full btn-outline gap-2"
        >
          <Camera size={16} />
          {hasFaceTemplate ? 'Yuzni qayta ro\'yxatdan o\'tkazish' : 'Yuzni ro\'yxatdan o\'tkazish'}
        </button>
      </div>

      {/* Account Info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Hisob ma&apos;lumotlari</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Holat</span>
            <span className={user?.isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {user?.isActive ? 'Faol' : 'Nofaol'}
            </span>
          </div>
          {user?.createdAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Ro&apos;yxatdan o&apos;tgan</span>
              <span className="text-gray-700">
                {new Date(user.createdAt).toLocaleDateString('uz-UZ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 border border-red-200
          text-red-600 font-medium hover:bg-red-100 active:scale-[0.98] transition"
      >
        <LogOut size={18} />
        Chiqish
      </button>

      {/* Face Registration Modal */}
      <Modal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        title="Yuzni ro'yxatdan o'tkazish"
      >
        <FaceVerification
          mode="register"
          onSuccess={handleFaceRegisterSuccess}
          onError={(err) => {
            toast.error('Yuz ro\'yxatdan o\'tkazishda xatolik');
            console.error(err);
          }}
        />
      </Modal>
    </div>
  );
}
