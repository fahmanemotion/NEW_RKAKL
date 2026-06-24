import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme';

export const metadata: Metadata = {
  title: 'SIPPT — Perencanaan & Penganggaran Terintegrasi',
  description: 'Sistem penyusunan usulan anggaran hierarkis ala SAKTI Kemenkeu.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // izinkan zoom (aksesibilitas) — tidak mengunci maximum-scale
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
