'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { Toaster } from 'react-hot-toast';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, isLoading, isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.getMe()
        .then(({ data }) => setUser(data.data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // PWA: service worker'ni ro'yxatdan o'tkazish (ilovani o'rnatish va offline
  // qobiq keshlash uchun). Ishlab chiqarish build'ida ishlaydi.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // service worker ixtiyoriy - xato bo'lsa ilova baribir ishlayveradi
      });
    }
  }, []);

  if (isLoading && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-telegram" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {children}
    </>
  );
}
