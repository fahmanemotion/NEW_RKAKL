import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme';

export const metadata: Metadata = {
  title: 'SIPPT — Perencanaan & Penganggaran Terintegrasi',
  description: 'Sistem penyusunan usulan anggaran hierarkis ala SAKTI Kemenkeu.',
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
