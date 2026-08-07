import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClientLayout } from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'Keldim Ketdim - Davomat Boshqaruvi',
  description: 'Xodimlar davomatini Face ID va GPS orqali qayd etish tizimi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Keldim Ketdim',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563EB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
