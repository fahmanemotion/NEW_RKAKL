// SIPPT — parser sheet KODE TOR (metadata kinerja per KOMPONEN).
// Kolom Excel (urut): KOMPONEN, INDIKATOR KINERJA KEGIATAN, SASARAN KEGIATAN,
// INDIKATOR KINERJA PROGRAM, SASARAN PROGRAM, UNIT ESELON I/II.
// Murni & dapat diuji di Node.

function cleanText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export interface TorKodeRec {
  komponen: string;
  indikator_kinerja_kegiatan: string;
  sasaran_kegiatan: string;
  indikator_kinerja_program: string;
  sasaran_program: string;
  unit_eselon: string;
}

/** Header yang dikenali agar baris judul dilewati. */
const HEAD = new Set(["komponen"]);

/** Parse sheet → daftar rekaman unik (per nama komponen, abaikan huruf besar/kecil). */
export function parseTorKodeSheet(raw: unknown[][]): TorKodeRec[] {
  const map = new Map<string, TorKodeRec>();
  for (const r of raw) {
    if (!r || r.every((c) => c === null || c === undefined || cleanText(c) === "")) continue;
    const komponen = cleanText(r[0]);
    if (!komponen) continue;
    // Lewati baris header.
    if (HEAD.has(komponen.toLowerCase())) continue;
    map.set(komponen.toLowerCase(), {
      komponen,
      indikator_kinerja_kegiatan: cleanText(r[1]),
      sasaran_kegiatan: cleanText(r[2]),
      indikator_kinerja_program: cleanText(r[3]),
      sasaran_program: cleanText(r[4]),
      unit_eselon: cleanText(r[5]),
    });
  }
  return [...map.values()];
}

/** Urutan kolom header untuk unduh template. */
export const TOR_KODE_HEADERS = [
  "KOMPONEN",
  "INDIKATOR KINERJA KEGIATAN",
  "SASARAN KEGIATAN",
  "INDIKATOR KINERJA PROGRAM",
  "SASARAN PROGRAM",
  "UNIT ESELON I/II",
];
