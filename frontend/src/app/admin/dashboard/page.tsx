'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import type { DashboardSummary } from '@/types';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bg: string;
}

function StatCard({ icon: Icon, label, value, color, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0" />
      <div className="flex-1">
        <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await dashboardApi.getSummary();
      setSummary(data.data || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik yuz berdi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const cards = summary
    ? [
        {
          icon: Users,
          label: 'Jami xodimlar',
          value: summary.totalEmployees,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
        },
        {
          icon: UserCheck,
          label: 'Bugun kelganlar',
          value: summary.presentToday,
          color: 'text-green-600',
          bg: 'bg-green-100',
        },
        {
          icon: UserX,
          label: 'Bugun kelmaganlar',
          value: summary.absentToday,
          color: 'text-red-600',
          bg: 'bg-red-100',
        },
        {
          icon: Clock,
          label: 'Hozir ishlayotganlar',
          value: summary.currentlyWorking,
          color: 'text-indigo-600',
          bg: 'bg-indigo-100',
        },
        {
          icon: AlertTriangle,
          label: 'Kechikkanlar',
          value: summary.lateToday,
          color: 'text-orange-600',
          bg: 'bg-orange-100',
        },
        {
          icon: TrendingUp,
          label: 'Davomat foizi',
          value: `${summary.attendanceRate}%`,
          color: 'text-emerald-600',
          bg: 'bg-emerald-100',
        },
      ]
    : [];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchSummary}
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Bugungi davomat statistikasi</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card, i) => (
              <StatCard
                key={i}
                icon={card.icon}
                label={card.label}
                value={card.value}
                color={card.color}
                bg={card.bg}
              />
            ))}
      </div>
    </div>
  );
}
