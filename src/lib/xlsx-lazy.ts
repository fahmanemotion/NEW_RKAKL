// Memuat pustaka Excel secara DINAMIS (on-demand) agar tidak ikut dalam bundle
// awal halaman. xlsx / xlsx-js-style berukuran besar dan hanya diperlukan saat
// pengguna benar-benar mengekspor atau mengimpor berkas. Dengan dynamic import,
// pustaka baru diunduh ketika tombol ditekan, lalu di-cache oleh module loader
// sehingga tidak diunduh ulang. Ini memperkecil First Load JS halaman terkait.

/** Untuk ekspor bergaya (border, warna) — paket `xlsx-js-style` (default export). */
export async function loadXLSXStyle() {
  const mod = await import("xlsx-js-style");
  return ((mod as { default?: unknown }).default ?? mod) as any;
}

/** Untuk baca/tulis polos — paket `xlsx` (namespace export). */
export async function loadXLSXPlain() {
  return (await import("xlsx")) as typeof import("xlsx");
}
