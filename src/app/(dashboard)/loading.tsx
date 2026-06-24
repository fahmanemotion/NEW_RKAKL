import { Card, Skeleton } from '@/components/ui';

/**
 * Skeleton bersama untuk SEMUA modul dashboard.
 * Next.js menampilkannya seketika di area konten saat halaman tujuan masih
 * memuat data (pindah antar-modul / muat awal setelah login), sementara shell
 * (sidebar & header) tetap diam — sehingga transisi terasa cepat dan halus.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Judul halaman */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 shrink-0" />
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-28" />
          </Card>
        ))}
      </div>

      {/* Konten utama (header + strip filter + baris tabel) */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border bg-muted/40 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
