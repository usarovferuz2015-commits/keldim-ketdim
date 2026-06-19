'use client';

import { useEffect, useState } from 'react';
import { scheduleApi } from '@/lib/api';
import type { Schedule } from '@/types';
import {
  Calendar,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

const dayNames = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
const dayNamesFull = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

export default function EmployeeSchedulePage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await scheduleApi.getMy();
      setSchedule(data.data || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Jadvalni yuklashda xatolik";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const todayIndex = getTodayIndex();

  const scheduleTypeLabel = (type: string): { label: string; desc: string } => {
    switch (type) {
      case 'FIXED':
        return { label: 'Qat\'iy jadval', desc: 'Belgilangan ish vaqti har kuni bir xil' };
      case 'SHIFT':
        return { label: 'Smenali jadval', desc: 'Smena asosida ish vaqti o\'zgaradi' };
      case 'FLEXIBLE':
        return { label: 'Moslashuvchan jadval', desc: 'Ish vaqti moslashuvchan tarzda' };
      default:
        return { label: type, desc: '' };
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-1">Xatolik yuz berdi</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={fetchSchedule} className="btn-secondary gap-2">
              <RefreshCw className="w-4 h-4" />
              Qayta urinish
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-5">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="card animate-pulse">
          <div className="h-4 w-48 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Ish jadvali</h1>
        <div className="card text-center py-12">
          <Calendar size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-1">Jadval tayinlanmagan</p>
          <p className="text-gray-400 text-sm">
            Sizga hali ish jadvali biriktirilmagan. Administrator bilan bog&apos;laning.
          </p>
        </div>
      </div>
    );
  }

  const info = scheduleTypeLabel(schedule.scheduleType);

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ish jadvali</h1>
        <p className="text-sm text-gray-500 mt-0.5">Haftalik ish kunlari va vaqtlari</p>
      </div>

      {/* Schedule Info */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className={`badge ${
            schedule.scheduleType === 'FIXED'
              ? 'badge-info'
              : schedule.scheduleType === 'SHIFT'
              ? 'badge-warning'
              : 'badge-success'
          }`}>
            {info.label}
          </span>
          {schedule.shiftName && (
            <span className="badge badge-info">{schedule.shiftName}</span>
          )}
        </div>

        <p className="text-sm text-gray-500">{info.desc}</p>

        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-telegram" />
            <div>
              <p className="text-xs text-gray-400">Boshlanish</p>
              <p className="text-sm font-semibold text-gray-900">
                {schedule.flexibleStart
                  ? schedule.flexibleStart.substring(0, 5)
                  : schedule.startTime.substring(0, 5)}
              </p>
            </div>
          </div>

          <div className="h-10 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <Clock size={18} className="text-telegram" />
            <div>
              <p className="text-xs text-gray-400">Tugash</p>
              <p className="text-sm font-semibold text-gray-900">
                {schedule.flexibleEnd
                  ? schedule.flexibleEnd.substring(0, 5)
                  : schedule.endTime.substring(0, 5)}
              </p>
            </div>
          </div>
        </div>

        {schedule.scheduleType === 'FLEXIBLE' && (
          <p className="text-xs text-gray-400 bg-blue-50 rounded-lg p-2">
            Moslashuvchan jadval: ish vaqti {schedule.flexibleStart?.substring(0, 5)} - {schedule.flexibleEnd?.substring(0, 5)} oralig&apos;ida
          </p>
        )}
      </div>

      {/* Week View */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Haftalik ko&apos;rinish</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {dayNames.map((day, index) => {
            const isWorkDay = schedule.workDays.includes(index + 1);
            const isToday = index === todayIndex;
            return (
              <div
                key={day}
                className={`
                  flex flex-col items-center justify-center gap-1 rounded-lg py-3 px-1 text-center transition
                  ${isWorkDay
                    ? isToday
                      ? 'bg-telegram text-white shadow-md'
                      : 'bg-blue-50 text-blue-700'
                    : 'bg-gray-50 text-gray-400'
                  }
                  ${isToday ? 'ring-2 ring-telegram ring-offset-1' : ''}
                `}
              >
                <span className="text-xs font-medium">{day}</span>
                {isWorkDay ? (
                  <CheckCircle
                    size={16}
                    className={isToday ? 'text-white' : 'text-telegram'}
                  />
                ) : (
                  <span className="text-xs opacity-50">—</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
            <span>Ish kuni</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-telegram" />
            <span>Bugun</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />
            <span>Dam olish</span>
          </div>
        </div>
      </div>

      {/* Work Days Detail */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Ish kunlari</h3>
        <div className="flex flex-wrap gap-2">
          {dayNamesFull.map((name, index) => {
            const isWorkDay = schedule.workDays.includes(index + 1);
            return (
              <span
                key={name}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isWorkDay
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Schedule Status */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${schedule.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-700">
            {schedule.isActive ? 'Jadval faol' : 'Jadval faol emas'}
          </span>
        </div>
      </div>
    </div>
  );
}
