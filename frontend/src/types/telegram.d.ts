export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close?: () => void;
        initData?: string;
        initDataUnsafe?: Record<string, unknown>;
        [key: string]: unknown;
      };
    };
  }
}
