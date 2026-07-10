// SIPPT — skeleton loaders untuk streaming (Suspense fallback).
// Sengaja TANPA "use client": komponen murni presentasional → dirender di server
// sebagai fallback boundary Suspense (ringan, tanpa JS klien). Dipakai agar
// RANGKA halaman muncul seketika sementara data mengalir masuk (streaming),
// bukan menampilkan spinner kosong menutupi seluruh area.
import { cn } from "@/lib/utils";

/** Blok berdenyut (shimmer) — batu bata dasar semua skeleton. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Skeleton daftar kartu berbaris (mis. daftar usulan / daftar review). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="divide-y divide-border rounded-xl border border-border"
      aria-hidden
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton halaman daftar berfilter: hero + baris filter + tabel
 *  (Review / Monitoring / Laporan). */
export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}

/** Skeleton tabel/tree-grid (mis. editor penganggaran, dashboard). */
export function TableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {/* baris kepala tabel */}
      <Skeleton className="h-9 w-full" />
      <div className="space-y-1.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-8", i % 4 === 0 ? "w-full" : "w-[97%]")}
          />
        ))}
      </div>
    </div>
  );
}
