'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import { Home, Clock, Calendar, User, LogOut } from 'lucide-react';

const tabs = [
  { href: '/employee/dashboard', label: 'Bosh sahifa', icon: Home },
  { href: '/employee/attendance', label: 'Davomat', icon: Clock },
  { href: '/employee/schedule', label: 'Jadval', icon: Calendar },
  { href: '/employee/profile', label: 'Profil', icon: User },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const isActive = (href: string) => {
    if (href === '/employee/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Keldim Ketdim</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Chiqish</span>
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-40">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1
                transition rounded-lg
                ${active
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium truncate">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
