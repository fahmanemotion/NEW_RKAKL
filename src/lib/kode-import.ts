// SIPPT — parser sheet KODE gabungan (BA→Program→Kegiatan→KRO→RO→Komponen).
// Murni & dapat diuji. Kolom Excel (urut): BA, Uraian BA, Program, Uraian Program,
// Kegiatan, Uraian Kegiatan, KRO, Uraian KRO, RO, Uraian RO, Komp, Uraian Komp.

/** Normalisasi teks sel Excel (inline agar file mandiri saat diuji di Node). */
function cleanText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}
/** Normalisasi kode: jika murni angka & ada padTo, beri nol di depan. */
function cleanCode(v: unknown, padTo?: number): string {
  const s = cleanText(v);
  if (!s) return "";
  if (padTo && /^\d+$/.test(s)) return s.padStart(padTo, "0");
  return s;
}

export interface KodeRec {
  kode: string;
  nama: string;
}
export interface KodeParsed {
  ba: KodeRec[];
  program: (KodeRec & { ba: string })[];
  kegiatan: (KodeRec & { ba: string; program: string })[];
  kro: (KodeRec & { ba: string; program: string; kegiatan: string })[];
  ro: (KodeRec & { ba: string; program: string; kegiatan: string; kro: string })[];
  komponen: (KodeRec & {
    ba: string; program: string; kegiatan: string; kro: string; ro: string;
  })[];
  dataRows: number;
}

const HEAD = new Set([
  "ba", "uraian ba", "program", "uraian program", "kegiatan", "uraian kegiatan",
  "kro", "uraian kro", "ro", "uraian ro", "komp", "komponen", "uraian komp",
  "uraian komponen",
]);

export function parseKodeSheet(raw: unknown[][]): KodeParsed {
  const ba = new Map<string, KodeRec & { ba?: string }>();
  const program = new Map<string, KodeRec & { ba: string }>();
  const kegiatan = new Map<string, KodeRec & { ba: string; program: string }>();
  const kro = new Map<string, KodeRec & { ba: string; program: string; kegiatan: string }>();
  const ro = new Map<string, KodeRec & { ba: string; program: string; kegiatan: string; kro: string }>();
  const komponen = new Map<string, KodeRec & { ba: string; program: string; kegiatan: string; kro: string; ro: string }>();
  let dataRows = 0;

  for (const r of raw) {
    if (!r || r.every((c) => c === null || c === undefined || cleanText(c) === "")) continue;
    // Lewati baris header.
    const a = cleanText(r[0]).toLowerCase();
    const b = cleanText(r[1]).toLowerCase();
    if (HEAD.has(a) || HEAD.has(b)) continue;

    const baK = cleanCode(r[0], 3); // BA dinormalisasi 3 digit ("22" → "022")
    const baN = cleanText(r[1]) || baK;
    const progK = cleanCode(r[2]);
    const progN = cleanText(r[3]) || progK;
    const kegK = cleanCode(r[4], 4);
    const kegN = cleanText(r[5]) || kegK;
    const kroK = cleanCode(r[6]);
    const kroN = cleanText(r[7]) || kroK;
    const roK = cleanCode(r[8], 3);
    const roN = cleanText(r[9]) || roK;
    const kompK = cleanCode(r[10], 3);
    const kompN = cleanText(r[11]) || kompK;

    if (!baK) continue;
    dataRows++;
    ba.set(baK, { kode: baK, nama: baN });
    if (progK) {
      program.set(`${baK}|${progK}`, { kode: progK, nama: progN, ba: baK });
      if (kegK) {
        kegiatan.set(`${baK}|${progK}|${kegK}`, { kode: kegK, nama: kegN, ba: baK, program: progK });
        if (kroK) {
          kro.set(`${baK}|${progK}|${kegK}|${kroK}`, { kode: kroK, nama: kroN, ba: baK, program: progK, kegiatan: kegK });
          if (roK) {
            ro.set(`${baK}|${progK}|${kegK}|${kroK}|${roK}`, { kode: roK, nama: roN, ba: baK, program: progK, kegiatan: kegK, kro: kroK });
            if (kompK) {
              komponen.set(`${baK}|${progK}|${kegK}|${kroK}|${roK}|${kompK}`, {
                kode: kompK, nama: kompN, ba: baK, program: progK, kegiatan: kegK, kro: kroK, ro: roK,
              });
            }
          }
        }
      }
    }
  }

  return {
    ba: [...ba.values()].map((x) => ({ kode: x.kode, nama: x.nama })),
    program: [...program.values()],
    kegiatan: [...kegiatan.values()],
    kro: [...kro.values()],
    ro: [...ro.values()],
    komponen: [...komponen.values()],
    dataRows,
  };
}
