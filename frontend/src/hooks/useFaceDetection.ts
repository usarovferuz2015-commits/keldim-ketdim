'use client';

import { useEffect, useRef, useState } from 'react';

export interface LivenessFrame {
  ear: number;
  vector: number[];
}

export interface BlinkEvaluation {
  blinked: boolean;
  baseline: number;
  minEar: number;
  dipRatio: number;
}

export interface MotionEvaluation {
  moved: boolean;
  variance: number;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Standart 6 nuqtali ko'z landmark formulasi (Soukupova & Cech):
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
function eyeAspectRatio(points: { x: number; y: number }[]): number {
  if (points.length < 6) return 0;
  const [p1, p2, p3, p4, p5, p6] = points;
  const vertical = dist(p2, p6) + dist(p3, p5);
  const horizontal = dist(p1, p4);
  if (horizontal === 0) return 0;
  return vertical / (2 * horizontal);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Ko'z yumish (blink) aniqlash: boshlang'ich EAR darajasidan sezilarli pasayish
// (ko'z yumilishi), so'ngra qayta ko'tarilishi (ko'z ochilishi) kerak - bu
// oddiy statik pastlikdan (masalan yopiq ko'zli surat) farqlaydi.
export function evaluateBlink(frames: LivenessFrame[]): BlinkEvaluation {
  if (frames.length < 5) {
    return { blinked: false, baseline: 0, minEar: 0, dipRatio: 1 };
  }
  const ears = frames.map((f) => f.ear);
  const baseline = median(ears.slice(0, Math.min(3, ears.length)));
  const minEar = Math.min(...ears);
  const minIdx = ears.indexOf(minEar);
  const dipRatio = baseline > 0 ? minEar / baseline : 1;
  const dipped = dipRatio < 0.78;

  const before = ears.slice(0, minIdx);
  const after = ears.slice(minIdx + 1);
  const openedBefore = minIdx === 0 || (before.length > 0 && Math.max(...before) / baseline > 0.85);
  const recoveredAfter = after.length > 0 && Math.max(...after) / baseline > 0.85;

  const blinked = baseline > 0 && dipped && (openedBefore || recoveredAfter);
  return { blinked, baseline, minEar, dipRatio };
}

// Bosh/yuz harakati aniqlash: normallashtirilgan ko'z nuqtalari kadrlar oralig'ida
// qanchalik o'zgarganini (variance) hisoblaydi. Butunlay qotib qolgan surat/ekran
// uchun bu qiymat deyarli nolga teng bo'ladi.
export function evaluateMotion(frames: LivenessFrame[]): MotionEvaluation {
  if (frames.length < 5) return { moved: false, variance: 0 };
  const dim = frames[0].vector.length;
  let totalVar = 0;
  for (let d = 0; d < dim; d++) {
    const vals = frames.map((f) => f.vector[d] ?? 0);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    totalVar += variance;
  }
  const avgVar = totalVar / dim;
  return { moved: avgVar > 0.00015, variance: avgVar };
}

// Qayta ishlatiladigan canvas'lar - har kadrda yangi canvas yaratmaslik uchun
// (captureLivenessSequence bir necha soniyada ~12 marta chaqiradi)
let sampleCanvas: HTMLCanvasElement | null = null;
let workCanvas: HTMLCanvasElement | null = null;

// Video kadridan o'rtacha yorug'likni tez baholaydi (32x32 pastga tushirilgan
// nusxa orqali - to'liq kadrni piksel-piksel tekshirishdan ancha tezroq va
// ~130ms oraliqda takrorlanadigan tiriklik tekshiruvi uchun ham yetarlicha tez)
function estimateBrightness(ctx2d: CanvasRenderingContext2D): number {
  const { data } = ctx2d.getImageData(0, 0, 32, 32);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    // ITU-R BT.601 luminance formulasi
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

// Video kadrini xom holda emas, yorug'lik darajasiga qarab avtomatik
// yorqinlik/kontrast bilan "tekislab" qaytaradi va faceapi shu tekislangan
// canvas ustida ishlaydi. Xira yoki notekis yoritilgan muhitlarda aniqlashni
// yaxshilaydi - avval kadr hech qanday ishlov berilmasdan to'g'ridan-to'g'ri
// modelga yuborilardi.
function enhanceFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!sampleCanvas) {
    sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;
  }
  if (!workCanvas) workCanvas = document.createElement('canvas');
  if (workCanvas.width !== width || workCanvas.height !== height) {
    workCanvas.width = width;
    workCanvas.height = height;
  }

  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) {
    // Canvas 2D konteksti olinmasa - hech bo'lmasa xom kadrni qaytaramiz
    return workCanvas;
  }

  let brightness = 128;
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (sampleCtx) {
    try {
      sampleCtx.drawImage(video, 0, 0, 32, 32);
      brightness = estimateBrightness(sampleCtx);
    } catch {
      // getImageData xavfsizlik/boshqa sabab bilan ishlamasa - filtrsiz davom etamiz
      brightness = 128;
    }
  }

  // 0-255 oralig'ida "normal" markaz ~128. Juda past/yuqori qiymatlarda
  // mos ravishda kompensatsiya qo'llaymiz.
  let filter = 'none';
  if (brightness < 60) {
    filter = 'brightness(1.7) contrast(1.3)';
  } else if (brightness < 95) {
    filter = 'brightness(1.35) contrast(1.18)';
  } else if (brightness > 195) {
    filter = 'brightness(0.85) contrast(1.1)';
  }

  workCtx.filter = filter;
  workCtx.drawImage(video, 0, 0, width, height);
  workCtx.filter = 'none';
  return workCanvas;
}

export function useFaceDetection() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const faceapiRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const faceapi = await import('@vladmandic/face-api');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        if (!cancelled) {
          faceapiRef.current = faceapi;
          setStatus('ready');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Model yuklanmadi');
          setStatus('error');
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // SSD MobileNetV1'ning standart minConfidence (0.5) ba'zi haqiqiy holatlarda
  // (kamera yuzga juda yaqin/katta, biroz burchak ostida va h.k.) haqiqiy
  // yuzni ham rad etib "topilmadi" deb qaytaradi - biz buni pasaytiramiz,
  // chunki bu faqat "landmark/descriptor ol" bosqichi; haqiqiy shaxs
  // tasdiqlanishi keyingi bosqichda (backend'dagi descriptor solishtirish)
  // qattiqroq chegara bilan alohida tekshiriladi, shuning uchun bu yerda
  // yumshoqroq bo'lishi xavfsizlikka ta'sir qilmaydi.
  const getDetectOptions = (faceapi: any) => new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

  // Bitta video kadridan ikki marta aniqlashga urinadi: avval yorug'lik
  // moslashtirilgan kadr bilan, agar topilmasa xom (filtrsiz) kadr bilan -
  // ba'zi holatlarda filtr aksincha xalaqit berishi mumkin, shuning uchun
  // ikkinchi urinish qo'shimcha xavfsizlik to'ri.
  const detectWithFallback = async (faceapi: any, video: HTMLVideoElement, withDescriptor: boolean) => {
    const options = getDetectOptions(faceapi);
    const enhanced = enhanceFrame(video);
    let result = withDescriptor
      ? await faceapi.detectSingleFace(enhanced, options).withFaceLandmarks().withFaceDescriptor()
      : await faceapi.detectSingleFace(enhanced, options).withFaceLandmarks();
    if (result) return result;

    result = withDescriptor
      ? await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor()
      : await faceapi.detectSingleFace(video, options).withFaceLandmarks();
    return result || null;
  };

  // `errored: true` = yuz aniqlash jarayonining o'zi ishlamadi (WebGL/xotira/boshqa
  // texnik xato) - bu "yuz topilmadi" bilan bir xil emas va foydalanuvchiga
  // boshqacha xabar ko'rsatilishi kerak, chunki "yorug'lik yomon" degan maslahat
  // bunday holatda foydalanuvchini chalg'itadi va haqiqiy sababni yashiradi.
  const extractDescriptor = async (
    video: HTMLVideoElement
  ): Promise<{ descriptor: Float32Array | null; errored: boolean }> => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !video || video.videoWidth === 0) {
      return { descriptor: null, errored: false };
    }

    try {
      const result = await detectWithFallback(faceapi, video, true);
      if (!result) return { descriptor: null, errored: false };
      return { descriptor: result.descriptor, errored: false };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useFaceDetection] extractDescriptor xato:', err);
      return { descriptor: null, errored: true };
    }
  };

  // Bitta kadrdan ko'z landmarklari asosida EAR va normallashtirilgan vektorni oladi
  const captureLivenessFrame = async (video: HTMLVideoElement): Promise<LivenessFrame | null> => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !video || video.videoWidth === 0) return null;

    try {
      const result = await detectWithFallback(faceapi, video, false);
      if (!result) return null;

      const box = result.detection.box;
      const left = result.landmarks.getLeftEye();
      const right = result.landmarks.getRightEye();
      if (!left?.length || !right?.length || box.width === 0 || box.height === 0) return null;

      const ear = (eyeAspectRatio(left) + eyeAspectRatio(right)) / 2;
      const vector = [...left, ...right].flatMap((p: { x: number; y: number }) => [
        (p.x - box.x) / box.width,
        (p.y - box.y) / box.height,
      ]);

      return { ear, vector };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useFaceDetection] captureLivenessFrame xato:', err);
      return null;
    }
  };

  // ~1.5-2 soniya davomida bir necha kadr yig'ib, tiriklik tekshiruvi uchun
  // ma'lumot to'playdi (ko'z yumish + harakat aniqlash uchun)
  const captureLivenessSequence = async (
    video: HTMLVideoElement,
    sampleCount = 12,
    intervalMs = 130
  ): Promise<LivenessFrame[]> => {
    const frames: LivenessFrame[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const frame = await captureLivenessFrame(video);
      if (frame) frames.push(frame);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return frames;
  };

  return { status, error, extractDescriptor, captureLivenessSequence };
}
