'use client';

import { useEffect, useRef, useState } from 'react';

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

  return { status, error, extractDescriptor };
}
