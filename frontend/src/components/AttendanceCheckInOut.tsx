'use client';

import { useState } from 'react';
import { attendanceApi } from '@/lib/api';
import { GpsVerification } from './GpsVerification';
import { FaceVerification } from './FaceVerification';
import toast from 'react-hot-toast';
import { CheckCircle, AlertTriangle, MapPin, Camera, ClipboardCheck, LogIn, LogOut } from 'lucide-react';

interface Props {
  type: 'in' | 'out';
  onComplete?: () => void;
}

interface GpsResult {
  withinGeofence: boolean;
  latitude: number;
  longitude: number;
  locationName?: string;
  distance?: number;
}

export function AttendanceCheckInOut({ type, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gpsResult, setGpsResult] = useState<GpsResult | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = type === 'in' ? 'Kirish' : 'Chiqish';

  const handleGpsVerify = (result: GpsResult) => {
    setGpsResult(result);
    setError(null);

    if (!result.withinGeofence) {
      setError('Siz ruxsat etilgan hududdan tashqaridasiz. Davomat qayd etib bo\'lmaydi.');
      toast.error('Ruxsat etilgan hududdan tashqaridasiz');
      return;
    }

    toast.success('Joylashuv tasdiqlandi');
    setStep(2);
  };

  const handleFaceSuccess = () => {
    setFaceVerified(true);
    setError(null);
    toast.success('Yuz tekshiruvidan o\'tdi');
    setStep(3);
  };

  const handleFaceError = () => {
    setError('Yuz tekshirish muvaffaqiyatsiz yakunlandi. Qayta urinib ko\'ring.');
    toast.error('Yuz tekshirilmadi');
  };

  const handleConfirm = async () => {
    if (!gpsResult || !faceVerified) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (type === 'in') {
        await attendanceApi.checkIn({
          latitude: gpsResult.latitude,
          longitude: gpsResult.longitude,
          faceVerified: true,
          livenessVerified: true,
        });
        toast.success('Kirish muvaffaqiyatli qayd etildi!');
      } else {
        await attendanceApi.checkOut({
          latitude: gpsResult.latitude,
          longitude: gpsResult.longitude,
          faceVerified: true,
          livenessVerified: true,
        });
        toast.success('Chiqish muvaffaqiyatli qayd etildi!');
      }

      setCompleted(true);
      onComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `${typeLabel} qayd etishda xatolik yuz berdi`;
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setGpsResult(null);
    setFaceVerified(false);
    setError(null);
    setCompleted(false);
  };

  const steps = [
    { num: 1, label: 'Joylashuv', icon: MapPin },
    { num: 2, label: 'Yuz tekshirish', icon: Camera },
    { num: 3, label: 'Tasdiqlash', icon: ClipboardCheck },
  ];

  if (completed) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-success" />
        </div>
        <p className="text-green-700 font-semibold text-lg">
          {typeLabel} muvaffaqiyatli!
        </p>
        <p className="text-gray-500 text-sm">
          Davomatingiz qayd etildi.
        </p>
        <button onClick={handleReset} className="btn-secondary text-sm">
          Yangi amal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        {type === 'in' ? (
          <LogIn size={20} className="text-telegram" />
        ) : (
          <LogOut size={20} className="text-telegram" />
        )}
        <h3 className="text-lg font-semibold text-gray-900">{typeLabel}</h3>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-telegram text-white'
                    : isDone
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px flex-1 ${step > s.num ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: GPS Verification */}
      {step === 1 && <GpsVerification onVerify={handleGpsVerify} />}

      {/* Step 2: Face Verification */}
      {step === 2 && (
        <FaceVerification
          mode="verify"
          onSuccess={handleFaceSuccess}
          onError={handleFaceError}
        />
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <ClipboardCheck size={32} className="text-telegram" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-gray-700 font-medium">{typeLabel}ni tasdiqlash</p>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 space-y-1">
              {gpsResult && (
                <div className="flex justify-between gap-4">
                  <span>Joylashuv:</span>
                  <span className="text-green-700 font-medium">{gpsResult.locationName || 'Tasdiqlangan'}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span>Yuz tekshiruvi:</span>
                <span className="text-green-700 font-medium">Tasdiqlangan</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Amal turi:</span>
                <span className="font-medium">{typeLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={isSubmitting}
              className="btn-secondary text-sm"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="btn-primary gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  {typeLabel}ni tasdiqlash
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
