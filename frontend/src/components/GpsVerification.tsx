'use client';

import { useState, useCallback } from 'react';
import { locationApi } from '@/lib/api';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';

interface Props {
  onVerify: (result: {
    withinGeofence: boolean;
    latitude: number;
    longitude: number;
    locationName?: string;
    distance?: number;
  }) => void;
}

interface LocationResult {
  withinGeofence: boolean;
  latitude: number;
  longitude: number;
  locationName?: string;
  distance?: number;
  error?: string;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function GpsVerification({ onVerify }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LocationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Brauzeringiz geolokatsiyani qo\'llab-quvvatlamaydi'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }, []);

  const handleVerify = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const position = await getPosition();
      const { latitude, longitude } = position.coords;

      const { data } = await locationApi.getActive();
      const locations = data.data || [];

      if (!Array.isArray(locations) || locations.length === 0) {
        setResult({
          withinGeofence: false,
          latitude,
          longitude,
          locationName: 'Lokatsiya topilmadi',
          distance: 0,
          error: 'Faol joylashuvlar mavjud emas',
        });
        onVerify({
          withinGeofence: false,
          latitude,
          longitude,
          locationName: 'Lokatsiya topilmadi',
          distance: 0,
        });
        return;
      }

      let closestLocation: { name: string; distance: number; within: boolean } | null = null;
      let minDistance = Infinity;

      for (const loc of locations) {
        const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
        const radius = loc.radiusMeters || 100;
        const within = distance <= radius;

        if (distance < minDistance) {
          minDistance = distance;
          closestLocation = { name: loc.name, distance, within };
        }

        if (within) {
          setResult({
            withinGeofence: true,
            latitude,
            longitude,
            locationName: loc.name,
            distance,
          });
          onVerify({
            withinGeofence: true,
            latitude,
            longitude,
            locationName: loc.name,
            distance,
          });
          return;
        }
      }

      const locationResult: LocationResult = {
        withinGeofence: false,
        latitude,
        longitude,
        locationName: closestLocation?.name,
        distance: closestLocation?.distance ?? minDistance,
        error: 'Siz ruxsat etilgan hududdan tashqaridasiz',
      };

      setResult(locationResult);
      onVerify({
        withinGeofence: false,
        latitude,
        longitude,
        locationName: closestLocation?.name,
        distance: closestLocation?.distance ?? minDistance,
      });
    } catch (err: unknown) {
      let msg: string;
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Joylashuvga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Joylashuv ma\'lumoti mavjud emas';
            break;
          case err.TIMEOUT:
            msg = 'Joylashuvni aniqlash vaqti tugadi';
            break;
          default:
            msg = 'Joylashuvni aniqlashda xatolik yuz berdi';
        }
      } else {
        msg = err instanceof Error ? err.message : 'Joylashuvni tekshirishda xatolik yuz berdi';
      }
      setError(msg);
      setResult({
        withinGeofence: false,
        latitude: 0,
        longitude: 0,
        error: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [getPosition, onVerify]);

  const formatDistance = (meters?: number): string => {
    if (meters === undefined || meters === null) return '';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Joylashuvni tekshirish
      </h3>

      {/* Initial state */}
      {!isLoading && !result && !error && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
            <MapPin size={36} className="text-telegram" />
          </div>
          <p className="text-gray-500 text-sm text-center">
            Davomat uchun joylashuvingizni tekshirish kerak.
            GPS orqali ish joyida ekanligingiz aniqlanadi.
          </p>
          <button onClick={handleVerify} className="btn-primary gap-2">
            <Navigation size={18} />
            Joylashuvni tekshirish
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-telegram border-t-transparent" />
          <p className="text-gray-500 text-sm">Joylashuv aniqlanmoqda...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 w-full max-w-sm">
          <AlertTriangle size={28} className="text-danger" />
          <p className="text-red-700 text-sm text-center">{error}</p>
          <button onClick={handleVerify} className="btn-secondary text-sm gap-2">
            <Navigation size={16} />
            Qayta urinish
          </button>
        </div>
      )}

      {/* Result - within geofence */}
      {result && result.withinGeofence && (
        <div className="flex flex-col items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 w-full max-w-sm">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <MapPin size={28} className="text-success" />
          </div>
          <p className="text-green-700 font-medium text-center">
            Siz ruxsat etilgan hududdasiz
          </p>
          <div className="text-center">
            {result.locationName && (
              <p className="text-sm text-gray-700 font-medium">{result.locationName}</p>
            )}
            {result.distance !== undefined && (
              <p className="text-xs text-gray-500">
                Masofa: {formatDistance(result.distance)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Result - outside geofence */}
      {result && !result.withinGeofence && !result.error?.includes('mavjud emas') && (
        <div className="flex flex-col items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 w-full max-w-sm">
          <AlertTriangle size={28} className="text-warning" />
          <p className="text-yellow-700 font-medium text-center">
            Siz ruxsat etilgan hududdan tashqaridasiz
          </p>
          <div className="text-center">
            {result.locationName && (
              <p className="text-sm text-gray-700">
                Eng yaqin lokatsiya: {result.locationName}
              </p>
            )}
            {result.distance !== undefined && result.distance > 0 && (
              <p className="text-xs text-gray-500">
                Masofa: {formatDistance(result.distance)}
              </p>
            )}
          </div>
          <button onClick={handleVerify} className="btn-secondary text-sm gap-2">
            <Navigation size={16} />
            Qayta tekshirish
          </button>
        </div>
      )}

      {/* Result - no locations */}
      {result && !result.withinGeofence && result.error?.includes('mavjud emas') && (
        <div className="flex flex-col items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 w-full max-w-sm">
          <AlertTriangle size={28} className="text-gray-400" />
          <p className="text-gray-600 text-sm text-center">
            Tizimda faol joylashuvlar mavjud emas. Administrator bilan bog&apos;laning.
          </p>
        </div>
      )}
    </div>
  );
}
