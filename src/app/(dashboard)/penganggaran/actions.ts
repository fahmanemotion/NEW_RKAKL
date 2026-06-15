"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import {
  tahapWorkflowState,
  TAHAP_ORDER,
  TAHAP_LABEL,
  type TahapPagu,
} from "@/lib/tahap-pagu";

/**
 * Buat usulan Draft untuk satu Tahap Pagu. Program/Kegiatan ditambahkan
 * di dalam grid (bukan di modal). Server memvalidasi bahwa tahap yang dibuat
 * memang tahap berikutnya yang sah untuk satker + tahun ini (anti-bypass).
 */
export async function createUsulanAction(input: {
  tahun: number;
  tahapPagu: TahapPagu;
}): Promise<string> {
  const user = await requireUser();
  if (!user.satker_id)
    throw new Error("Akun Anda belum memiliki satker. Hubungi Administrator.");
  if (!TAHAP_ORDER.includes(input.tahapPagu))
    throw new Error("Tahap pagu tidak valid.");

  // Client longgar: tipe tabel belum memetakan kolom baru tahap_pagu.
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  // Ambil usulan yang ada untuk satker + tahun → tentukan tahap berikutnya yang sah.
  const { data: existing } = await sb
    .from("usulan_anggaran")
    .select("tahap_pagu, status")
    .eq("satker_id", user.satker_id)
    .eq("tahun_anggaran", input.tahun);

  const state = tahapWorkflowState(
    (existing ?? []) as { tahap_pagu: string | null; status: string }[],
  );
  if (!state.canCreate) {
    throw new Error(
      state.reason === "all_done"
        ? "Semua tahap pagu untuk tahun ini sudah selesai."
        : "Selesaikan (finalkan) tahap yang sedang berjalan terlebih dahulu.",
    );
  }
  if (state.nextTahap !== input.tahapPagu) {
    throw new Error(
      `Tahap berikutnya yang harus dikerjakan adalah ${TAHAP_LABEL[state.nextTahap!]}.`,
    );
  }

  const { data: usulan, error } = await sb
    .from("usulan_anggaran")
    .insert({
      tahun_anggaran: input.tahun,
      satker_id: user.satker_id,
      tahap_pagu: input.tahapPagu,
      status: "Draft",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return usulan!.id as string;
}
