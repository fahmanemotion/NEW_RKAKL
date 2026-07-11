import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pengecekan tipe saat build DIAKTIFKAN: seluruh proyek kini lolos `tsc`.
  // Jika suatu saat perlu sementara dilewati, set ke `true`.
  typescript: { ignoreBuildErrors: false },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    // #4 — Router Cache (kunjungan-ulang INSTAN). Halaman dinamis yang baru
    // dibuka disimpan di memori klien selama `dynamic` detik: kembali ke sana
    // dalam rentang itu → tampil SEKETIKA dari cache (tanpa round-trip server),
    // lalu diperbarui diam-diam (stale-while-revalidate). `static` berlaku saat
    // <Link prefetch> = true. Editor Penganggaran menyegarkan diri saat dibuka
    // (revalidate-on-open) agar data tak pernah basi walau disajikan dari cache.
    staleTimes: { dynamic: 30, static: 180 },
    // #3 — Prefetch DINAMIS SAAT HOVER. Ketika kursor melewati sebuah tautan
    // (mis. menu sidebar), Next menyiapkan halaman dinamis itu lebih dulu
    // (render + data), lalu Router Cache di atas menyimpannya → klik terasa
    // INSTAN. Prefetch tidak menyentuh kerja sesi berat di middleware (di-skip
    // untuk permintaan prefetch), jadi murah & aman.
    dynamicOnHover: true,
  },
};

export default nextConfig;
