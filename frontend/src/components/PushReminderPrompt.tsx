'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { pushApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Bell, X } from 'lucide-react';

// Faqat xodimlarga smena tugagach chiqishni eslatuvchi push xabarlar uchun
// ruxsat so'raydi. Adminlarga kerak emas. Ruxsat allaqachon berilgan bo'lsa,
// jimgina (bannersiz) obunani tekshirib, kerak bo'lsa qayta ro'yxatdan
// o'tkazadi - masalan telefon almashtirilganda yoki obuna eskirganda.

const DISMISSED_KEY = 'push-reminder-dismissed-at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 kun - har safar bezovta qilmaslik uchun

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushReminderPrompt() {
  const { user, isAuthenticated } = useAuthStore();
  const [showBanner, setShowBanner] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'EMPLOYEE') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

    const permission = Notification.permission;

    if (permission === 'granted') {
      // Ruxsat allaqachon bor - obunani jimgina tasdiqlaymiz/yangilaymiz
      ensureSubscribed().catch(() => {});
      return;
    }

    if (permission === 'denied') return; // foydalanuvchi rad etgan - qayta so'ramaymiz

    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_COOLDOWN_MS) return;

    setShowBanner(true);
  }, [isAuthenticated, user]);

  const ensureSubscribed = async () => {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const { data } = await pushApi.getPublicKey();
      const publicKey = data?.data?.publicKey;
      if (!publicKey) return; // server tomonda VAPID sozlanmagan - jimgina chiqamiz

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON);
    return subscription;
  };

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error("Bildirishnomalarga ruxsat berilmadi");
        setShowBanner(false);
        return;
      }
      await ensureSubscribed();
      toast.success("Eslatmalar yoqildi");
      setShowBanner(false);
    } catch {
      toast.error("Eslatmalarni yoqishda xatolik. Birozdan so'ng qayta urinib ko'ring");
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="mx-4 mt-3 card border border-telegram/20 bg-telegram/5 flex items-start gap-3">
      <Bell size={20} className="text-telegram mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">Chiqish eslatmalarini yoqasizmi?</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Smena tugab, chiqishni bosishni unutsangiz, telefoningizga eslatma yuboramiz.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleEnable}
            disabled={subscribing}
            className="text-xs font-medium bg-telegram text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {subscribing ? 'Yoqilmoqda...' : 'Yoqish'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            Keyinroq
          </button>
        </div>
      </div>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
