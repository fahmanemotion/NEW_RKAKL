import { LoadingScreen } from "@/components/ui/loading";

/**
 * Loader SERAGAM untuk SEMUA modul dashboard. Next.js menampilkannya seketika
 * di area konten saat berpindah antar-modul (Dashboard, Penganggaran, Review,
 * Monitoring, Laporan, Referensi, Pengguna) sementara data dimuat — sidebar &
 * header tetap diam. Animasi yang sama dipakai di seluruh modul agar konsisten.
 */
export default function DashboardLoading() {
  return <LoadingScreen label="Memuat…" />;
}
