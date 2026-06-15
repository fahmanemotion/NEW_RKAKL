// SIPPT — Alur Tahap Pagu (murni, bisa diuji di Node).
// Empat tahap berurutan; tahap berikutnya hanya boleh dibuat bila tahap
// sebelumnya SELESAI (status 'Final'). Tombol "Buat Usulan" mengunci selama
// tahap yang sedang dikerjakan belum selesai, atau semua tahap sudah selesai.

export const TAHAP_PAGU = [
  { value: "KEBUTUHAN", label: "PAGU Kebutuhan" },
  { value: "INDIKATIF", label: "PAGU Indikatif" },
  { value: "ANGGARAN", label: "PAGU Anggaran" },
  { value: "ALOKASI", label: "PAGU Alokasi" },
] as const;

export type TahapPagu = (typeof TAHAP_PAGU)[number]["value"];

export const TAHAP_ORDER: TahapPagu[] = TAHAP_PAGU.map((t) => t.value);
export const TAHAP_LABEL: Record<TahapPagu, string> = Object.fromEntries(
  TAHAP_PAGU.map((t) => [t.value, t.label]),
) as Record<TahapPagu, string>;

// Sebuah tahap dianggap SELESAI bila usulannya berstatus ini.
export const TAHAP_DONE_STATUS = "Final";

export interface UsulanRingkas {
  tahap_pagu: string | null;
  status: string;
}

export interface TahapOption {
  value: TahapPagu;
  label: string;
  disabled: boolean;
}

export interface TahapState {
  canCreate: boolean; // tombol "Buat Usulan" aktif?
  nextTahap: TahapPagu | null; // tahap yang boleh dikerjakan berikutnya
  reason: "ready" | "in_progress" | "all_done";
  options: TahapOption[]; // untuk dropdown: semua tahap, hanya nextTahap yang enabled
}

/**
 * Tentukan keadaan alur tahap pagu dari daftar usulan yang sudah ada
 * (untuk satu satker + tahun anggaran).
 */
export function tahapWorkflowState(
  existing: UsulanRingkas[],
  doneStatus: string = TAHAP_DONE_STATUS,
): TahapState {
  // Status terbaik per tahap (Final menang).
  const byTahap: Record<string, string> = {};
  for (const u of existing) {
    if (!u.tahap_pagu) continue;
    if (byTahap[u.tahap_pagu] === undefined) byTahap[u.tahap_pagu] = u.status;
    if (u.status === doneStatus) byTahap[u.tahap_pagu] = doneStatus;
  }
  const isComplete = (t: TahapPagu) => byTahap[t] === doneStatus;

  // Tahap pertama yang BELUM selesai = target berikutnya.
  let target: TahapPagu | null = null;
  for (const t of TAHAP_ORDER) {
    if (!isComplete(t)) {
      target = t;
      break;
    }
  }

  // Semua tahap selesai → tidak ada lagi yang bisa dibuat.
  if (target === null) {
    return {
      canCreate: false,
      nextTahap: null,
      reason: "all_done",
      options: TAHAP_ORDER.map((t) => ({
        value: t,
        label: TAHAP_LABEL[t],
        disabled: true,
      })),
    };
  }

  // Target sudah punya usulan tapi belum Final → masih dikerjakan → kunci tombol.
  const hasInProgress =
    byTahap[target] !== undefined && byTahap[target] !== doneStatus;
  if (hasInProgress) {
    return {
      canCreate: false,
      nextTahap: target,
      reason: "in_progress",
      options: TAHAP_ORDER.map((t) => ({
        value: t,
        label: TAHAP_LABEL[t],
        disabled: true,
      })),
    };
  }

  // Siap membuat target; hanya target yang bisa dipilih di dropdown.
  return {
    canCreate: true,
    nextTahap: target,
    reason: "ready",
    options: TAHAP_ORDER.map((t) => ({
      value: t,
      label: TAHAP_LABEL[t],
      disabled: t !== target,
    })),
  };
}
