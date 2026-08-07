/**
 * Pembanding kode huruf (Sub Komponen): A, B, C, ... Z, AA, AB, ... AZ, BA, ...
 *
 * Urutan huruf memakai kaidah "shortlex": kode yang lebih PENDEK selalu lebih
 * dulu, baru kemudian dibandingkan abjad per huruf. Ini penting karena
 * perbandingan teks biasa (localeCompare) akan keliru menempatkan "AA" sebelum
 * "B", padahal pada RKA-K/L urutannya A → B → ... → Z → AA → AB.
 *
 * Kode non-huruf (mis. angka atau campuran) tetap ditangani dengan perbandingan
 * natural agar tidak mengubah perilaku data lama.
 */
export function compareKodeHuruf(a: string, b: string): number {
  const A = (a ?? '').trim().toUpperCase();
  const B = (b ?? '').trim().toUpperCase();
  const alphaOnly = /^[A-Z]+$/;

  if (alphaOnly.test(A) && alphaOnly.test(B)) {
    // Panjang dulu (A..Z sebelum AA..), lalu abjad huruf pertama, kedua, dst.
    return A.length - B.length || (A < B ? -1 : A > B ? 1 : 0);
  }
  return A.localeCompare(B, undefined, { numeric: true });
}
