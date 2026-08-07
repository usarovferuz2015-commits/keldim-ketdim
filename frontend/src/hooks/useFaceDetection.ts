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

  const extractDescriptor = async (video: HTMLVideoElement): Promise<Float32Array | null> => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !video || video.videoWidth === 0) return null;

    try {
      const result = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) return null;
      return result.descriptor;
    } catch {
      return null;
    }
  };

  // Bitta kadrdan ko'z landmarklari asosida EAR va normallashtirilgan vektorni oladi
  const captureLivenessFrame = async (video: HTMLVideoElement): Promise<LivenessFrame | null> => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !video || video.videoWidth === 0) return null;

    try {
      const result = await faceapi.detectSingleFace(video).withFaceLandmarks();
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
    } catch {
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
