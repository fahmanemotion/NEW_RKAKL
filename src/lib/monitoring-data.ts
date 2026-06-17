// SIPPT — data Monitoring (murni & bisa diuji di Node).
// Merangkai usulan menjadi baris per satker dengan progres pagu lintas tahap
// (Kebutuhan → Indikatif → Anggaran → Alokasi), status tiap tahap, dan selisih
// antar tahap.

export const MON_TAHAP = [
  "KEBUTUHAN",
  "INDIKATIF",
  "ANGGARAN",
  "ALOKASI",
] as const;
export type MonTahap = (typeof MON_TAHAP)[number];

const ORDER: Record<string, number> = {
  KEBUTUHAN: 0,
  INDIKATIF: 1,
  ANGGARAN: 2,
  ALOKASI: 3,
};

export interface MonUsulan {
  id: string;
  tahun: number;
  tahap: string;
  status: string;
  total: number;
  satkerId: string;
  satkerNama: string;
  satkerKode: string;
}

export interface MonCell {
  id: string;
  status: string;
  total: number;
}

export interface MonRow {
  satkerId: string;
  satkerNama: string;
  satkerKode: string;
  cells: Record<string, MonCell | null>;
  latestTahap: string | null;
  latestTotal: number;
  finalizedCount: number;
  maxTotal: number;
}

export interface MonSummary {
  satkerCount: number;
  usulanCount: number;
  totalPagu: number; // jumlah pagu terkini (tahap paling maju) seluruh satker
  finalizedTahaps: number;
  inProgressTahaps: number;
}

export interface TahapDelta {
  from: MonTahap;
  to: MonTahap;
  fromTotal: number;
  toTotal: number;
  delta: number;
  pct: number | null; // null bila pembagi 0
}

/** Status "menang": Final mengalahkan status lain bila ada usulan ganda per tahap. */
function pickCell(a: MonCell | null, b: MonCell): MonCell {
  if (!a) return b;
  if (a.status === "Final") return a;
  if (b.status === "Final") return b;
  return b; // ambil yang terakhir diproses
}

export function buildMonitoringRows(usulan: MonUsulan[]): MonRow[] {
  const bySatker = new Map<string, MonRow>();

  for (const u of usulan) {
    let row = bySatker.get(u.satkerId);
    if (!row) {
      row = {
        satkerId: u.satkerId,
        satkerNama: u.satkerNama,
        satkerKode: u.satkerKode,
        cells: { KEBUTUHAN: null, INDIKATIF: null, ANGGARAN: null, ALOKASI: null },
        latestTahap: null,
        latestTotal: 0,
        finalizedCount: 0,
        maxTotal: 0,
      };
      bySatker.set(u.satkerId, row);
    }
    const tahap = u.tahap in ORDER ? u.tahap : "KEBUTUHAN";
    row.cells[tahap] = pickCell(row.cells[tahap], {
      id: u.id,
      status: u.status,
      total: Number(u.total) || 0,
    });
  }

  const rows = [...bySatker.values()];
  for (const row of rows) {
    let latest: string | null = null;
    let finalized = 0;
    let maxTotal = 0;
    for (const t of MON_TAHAP) {
      const c = row.cells[t];
      if (!c) continue;
      latest = t; // MON_TAHAP urut → yang terakhir ada = paling maju
      if (c.status === "Final") finalized++;
      if (c.total > maxTotal) maxTotal = c.total;
    }
    row.latestTahap = latest;
    row.latestTotal = latest ? (row.cells[latest]?.total ?? 0) : 0;
    row.finalizedCount = finalized;
    row.maxTotal = maxTotal;
  }

  rows.sort(
    (a, b) =>
      b.latestTotal - a.latestTotal ||
      a.satkerNama.localeCompare(b.satkerNama),
  );
  return rows;
}

export function summarizeMonitoring(rows: MonRow[]): MonSummary {
  let usulanCount = 0;
  let finalizedTahaps = 0;
  let inProgressTahaps = 0;
  let totalPagu = 0;
  for (const row of rows) {
    totalPagu += row.latestTotal;
    for (const t of MON_TAHAP) {
      const c = row.cells[t];
      if (!c) continue;
      usulanCount++;
      if (c.status === "Final") finalizedTahaps++;
      else inProgressTahaps++;
    }
  }
  return {
    satkerCount: rows.length,
    usulanCount,
    totalPagu,
    finalizedTahaps,
    inProgressTahaps,
  };
}

/** Selisih antar tahap berurutan yang sama-sama memiliki nilai. */
export function tahapDeltas(row: MonRow): TahapDelta[] {
  const out: TahapDelta[] = [];
  for (let i = 1; i < MON_TAHAP.length; i++) {
    const from = MON_TAHAP[i - 1];
    const to = MON_TAHAP[i];
    const a = row.cells[from];
    const b = row.cells[to];
    if (!a || !b) continue;
    const delta = b.total - a.total;
    out.push({
      from,
      to,
      fromTotal: a.total,
      toTotal: b.total,
      delta,
      pct: a.total !== 0 ? (delta / a.total) * 100 : null,
    });
  }
  return out;
}

export { ORDER as MON_ORDER };
