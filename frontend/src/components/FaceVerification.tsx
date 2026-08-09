'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFaceDetection, evaluateBlink, evaluateMotion } from '@/hooks/useFaceDetection';
import { faceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Camera, RotateCcw, CheckCircle, XCircle, Loader2, ScanFace } from 'lucide-react';

interface Props {
  mode: 'verify' | 'register';
  onSuccess?: (data: { descriptor: number[]; image?: string; livenessVerified: boolean }) => void;
  onError?: (error: unknown) => void;
}

export function FaceVerification({ mode, onSuccess, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { status: faceStatus, error: modelError, extractDescriptor, captureLivenessSequence } = useFaceDetection();

  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingLiveness, setIsCheckingLiveness] = useState(false);
  const [result, setResult] = useState<{ verified: boolean; confidence: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraError(null);
    setResult(null);
    setIsVideoReady(false);
    setIsStreaming(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // `max` cheklovi ham qo'shildi: ba'zi telefon old kameralari `ideal`ni
        // e'tiborsiz qoldirib ancha yuqori original o'lchamda oqim beradi, bu esa
        // har bir kadrda ishlaydigan og'ir SSD MobileNetV1 modeliga xotira/WebGL
        // bosimini oshirib, past-o'rta darajali qurilmalarda aniqlashni sukut
        // bo'yicha yiqilishiga (va noto'g'ri "yuz aniqlanmadi" xabariga) olib kelardi
        video: { facingMode: 'user', width: { ideal: 640, max: 960 }, height: { ideal: 480, max: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kameraga ulanishda xatolik';
      setCameraError(msg);
      toast.error('Kamera yoqilmadi');
    }
  }, []);

  useEffect(() => {
    if (faceStatus === 'ready') {
      startCamera();
    }
    return () => { stopCamera(); };
  }, [faceStatus]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsVideoReady(false);
  }, []);

  const onVideoPlay = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  const runLivenessCheck = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    setIsCheckingLiveness(true);
    try {
      const frames = await captureLivenessSequence(video);

      if (frames.length < 5) {
        // Kamera/yuz barqaror aniqlanmadi - xavfsizlik uchun rad etamiz
        return false;
      }

      const blink = evaluateBlink(frames);
      const motion = evaluateMotion(frames);
      const clientLive = blink.blinked || motion.moved;

      // Backenddagi mavjud /api/face/liveness bilan ham tasdiqlaymiz (ikkinchi signal)
      let serverLive = true;
      try {
        const { data } = await faceApi.detectLiveness({ movementData: frames.map((f) => f.vector) } as any);
        serverLive = (data.data || data)?.isLive !== false;
      } catch {
        // Backend tekshiruvi ishlamasa, mijoz tomonidagi natijaga tayanamiz
        serverLive = true;
      }

      return clientLive && serverLive;
    } finally {
      setIsCheckingLiveness(false);
    }
  }, [captureLivenessSequence]);

  const captureAndVerify = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      toast.error('Kamera hali tayyor emas');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { descriptor, errored } = await extractDescriptor(video);
      if (!descriptor) {
        if (errored) {
          // Aniqlash jarayonining o'zi ishlamadi (texnik xato) - buni "yuz
          // topilmadi" bilan aralashtirmaymiz, aks holda foydalanuvchi
          // yorug'likni to'g'irlab, aslida yordam bermaydigan ishga vaqt sarflaydi
          toast.error('Yuz aniqlashda texnik xatolik', { icon: '⚠️' });
          setError('Yuz aniqlashda texnik xatolik yuz berdi. Sahifani yangilab qayta urinib ko\'ring.');
        } else {
          toast.error('Yuz aniqlanmadi', { icon: '😐' });
          setError('Yuz aniqlanmadi. Yuzingizni kameraga qarating, yaxshi yoritilgan joyda turing.');
        }
        setIsProcessing(false);
        return;
      }

      const descArray = Array.from(descriptor);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

      let responseData;
      if (mode === 'verify') {
        try {
          const { data } = await faceApi.verify({ descriptor: descArray } as any);
          responseData = data.data || data;
        } catch (err: any) {
          const msg = err?.response?.data?.message || '';
          if (msg.includes('topilmadi') || msg.includes('Avval')) {
            const { data } = await faceApi.register({ descriptor: descArray, image: imageBase64 } as any);
            responseData = data.data || data;
            responseData.verified = true;
            responseData.message = 'Yuz ro\'yxatdan o\'tkazildi va tasdiqlandi';
          } else {
            throw err;
          }
        }
      } else {
        const { data } = await faceApi.register({ descriptor: descArray, image: imageBase64 } as any);
        responseData = data.data || data;
      }

      const faceOk = responseData.verified !== false;
      let livenessVerified = false;

      // Yuz mos kelgandagina tiriklik (anti-spoofing) tekshiruvini o'tkazamiz -
      // kamera hali yopilmagan, video oqimi davom etmoqda.
      // 2026-08-09: Feruz so'roviga ko'ra tiriklik tekshiruvi endi kirish/
      // chiqishni BLOKLAMAYDI - faqat ma'lumot sifatida saqlanadi va admin
      // rasm orqali har doim tekshirishi mumkin (shu bois yuz mos kelsa,
      // tiriklik o'tmagan bo'lsa ham davom etamiz).
      if (faceOk && mode === 'verify') {
        livenessVerified = await runLivenessCheck(video);
      } else if (mode === 'register') {
        // Ro'yxatdan o'tishda tiriklik shart emas, faqat yuz saqlanadi
        livenessVerified = true;
      }

      stopCamera();

      setResult({
        verified: responseData.verified !== false,
        confidence: responseData.similarity || responseData.confidence || 0,
        message: responseData.message,
      });

      if (responseData.verified !== false) {
        onSuccess?.({ descriptor: descArray, image: imageBase64, livenessVerified });
      } else {
        onError?.(responseData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Yuz tekshirishda xatolik';
      setError(msg);
      toast.error(msg);
      onError?.(err);
      stopCamera();
    } finally {
      setIsProcessing(false);
    }
  }, [extractDescriptor, mode, stopCamera, onSuccess, onError, runLivenessCheck]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {mode === 'verify' ? 'Yuzni tekshirish' : 'Yuzni ro\'yxatdan o\'tkazish'}
      </h3>

      {faceStatus === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-telegram animate-spin" />
          <p className="text-gray-500 text-sm">Yuz tanish modellari yuklanmoqda...</p>
        </div>
      )}

      {faceStatus === 'error' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <XCircle className="w-10 h-10 text-danger" />
          <p className="text-red-600 text-sm text-center">{modelError || 'Modellarni yuklashda xatolik'}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm">Qayta yuklash</button>
        </div>
      )}

      {faceStatus === 'ready' && (
        <>
          {result ? (
            <div className={`flex flex-col items-center gap-3 p-4 w-full ${result.verified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'} rounded-xl`}>
              {result.verified ? <CheckCircle size={40} className="text-success" /> : <XCircle size={40} className="text-danger" />}
              <p className={`font-medium text-center ${result.verified ? 'text-green-700' : 'text-red-700'}`}>
                {result.message || (result.verified ? 'Muvaffaqiyatli' : 'Xatolik')}
              </p>
              {result.confidence > 0 && <p className="text-sm text-gray-500">Ishonchlilik: {(result.confidence * 100).toFixed(1)}%</p>}
              <button onClick={() => { setResult(null); startCamera(); }} className="btn-secondary text-sm gap-2">
                <RotateCcw size={16} /> Qayta urinish
              </button>
            </div>
          ) : cameraError ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <XCircle size={36} className="text-danger" />
              <p className="text-red-600 text-sm text-center">{cameraError}</p>
              <button onClick={startCamera} className="btn-secondary gap-2"><RotateCcw size={18} /> Qayta urinish</button>
            </div>
          ) : null}

          <div className={`relative w-full max-w-sm rounded-xl overflow-hidden bg-black aspect-[4/3] ${!isStreaming && !cameraError ? 'hidden' : ''}`}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"
              onPlay={onVideoPlay} />
            {(!isVideoReady || isProcessing) && isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-4 text-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
                <span className="text-white text-sm">
                  {isCheckingLiveness
                    ? "Ko'zingizni yuming yoki boshingizni sal harakatlantiring..."
                    : isProcessing
                    ? 'Tahlil qilinmoqda...'
                    : 'Kamera sozlanmoqda...'}
                </span>
              </div>
            )}
          </div>

          {isStreaming && !cameraError && !result && (
            <button onClick={captureAndVerify} disabled={!isVideoReady || isProcessing}
              className="btn-primary gap-2">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace size={18} />}
              {isCheckingLiveness
                ? 'Tiriklik tekshirilmoqda...'
                : isProcessing
                ? 'Tahlil qilinmoqda...'
                : isVideoReady
                ? 'Rasmga olish'
                : 'Kamera tayyorlanmoqda...'}
            </button>
          )}

          {!isStreaming && !cameraError && !result && faceStatus === 'ready' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Camera size={36} className="text-telegram" />
              <p className="text-gray-500 text-sm text-center">Davomat uchun yuzingizni tekshirish kerak.</p>
              <button onClick={startCamera} className="btn-primary gap-2"><Camera size={18} /> Kamerani yoqish</button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 w-full max-w-sm">
          <XCircle size={18} className="text-danger shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
