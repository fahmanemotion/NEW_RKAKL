// SIPPT — perhitungan volume bertingkat ala SAKTI (murni, bisa diuji).
// Detail bisa punya beberapa segmen: 10 [Orang] x 3 [Hari] x 2 [Keg] ...
// Volume (Volkeg) = hasil kali angka segmen yang terisi (>0).
// Satuan (Satkeg) = gabungan satuan segmen yang terisi, dipisah " x ".

export interface VolSegment {
  qty: number | string; // angka
  sat: string;          // satuan, mis. "Orang", "Hari", "OK"
}

export function computeVolume(segments: VolSegment[]): { volume: number; satuan: string } {
  const used = segments
    .map((s) => ({ qty: Number(s.qty) || 0, sat: (s.sat || '').trim() }))
    .filter((s) => s.qty > 0);

  if (used.length === 0) return { volume: 0, satuan: '' };

  const volume = used.reduce((p, s) => p * s.qty, 1);
  const satuan = used.map((s) => s.sat).filter(Boolean).join(' x ');
  return { volume: Math.round(volume * 100) / 100, satuan };
}

/** Jumlah = volume × harga (sama dengan trigger DB; dipakai utk pratinjau). */
export function computeJumlah(volume: number, harga: number): number {
  return Math.round((Number(volume) || 0) * (Number(harga) || 0) * 100) / 100;
}

/**
 * Volume efektif:
 *  - mode rincian (useRincian=true): hasil kali segmen (Volkeg terkunci).
 *  - mode manual  (useRincian=false): angka yang diketik user langsung.
 */
export function effectiveVolume(
  useRincian: boolean,
  manualVolume: number | string,
  segments: VolSegment[],
): number {
  if (useRincian) return computeVolume(segments).volume;
  return Number(manualVolume) || 0;
}

/**
 * Segmen siap-simpan: hanya yang terisi (qty>0), qty dikonversi ke angka.
 * Mengembalikan null bila tidak ada segmen valid (berarti volume tunggal/manual).
 */
export function normalizeSegments(
  segments: VolSegment[],
): { qty: number; sat: string }[] | null {
  const used = segments
    .map((s) => ({ qty: Number(s.qty) || 0, sat: (s.sat || "").trim() }))
    .filter((s) => s.qty > 0);
  return used.length > 0 ? used : null;
}
