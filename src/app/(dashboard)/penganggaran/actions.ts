"use server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import {
  tahapWorkflowState,
  TAHAP_ORDER,
  TAHAP_LABEL,
  type TahapPagu,
} from "@/lib/tahap-pagu";

/** Buat usulan Draft untuk satu Tahap Pagu. */
export async function createUsulanAction(input: {
  tahun: number;
  tahapPagu: TahapPagu;
}): Promise<string> {
  const user = await requireUser();
  if (!user.satker_id)
    throw new Error("Akun Anda belum memiliki satker. Hubungi Administrator.");
  if (!TAHAP_ORDER.includes(input.tahapPagu))
    throw new Error("Tahap pagu tidak valid.");

  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data: existing } = await sb
    .from("usulan_anggaran")
    .select("tahap_pagu, status")
    .eq("satker_id", user.satker_id)
    .eq("tahun_anggaran", input.tahun);

  const sudahAda = (existing ?? []).some(
    (r: { tahap_pagu: string | null }) => r.tahap_pagu === input.tahapPagu,
  );
  if (sudahAda) {
    throw new Error(
      `Usulan ${TAHAP_LABEL[input.tahapPagu]} untuk TA ${input.tahun} sudah ada. ` +
        "Tidak boleh membuat usulan ganda.",
    );
  }

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

/** Hapus satu usulan beserta seluruh strukturnya (cascade di DB). */
export async function deleteUsulanAction(usulanId: string): Promise<void> {
  const user = await requireUser();
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data: row, error: selErr } = await sb
    .from("usulan_anggaran")
    .select("id, status, satker_id")
    .eq("id", usulanId)
    .single();
  if (selErr || !row) throw new Error("Usulan tidak ditemukan.");

  const isAdmin = user.role === "Administrator";
  const isOwnerOperator =
    user.role === "Operator" && row.satker_id === user.satker_id;
  if (!isAdmin && !isOwnerOperator)
    throw new Error("Anda tidak berhak menghapus usulan ini.");
  if (!isAdmin && row.status !== "Draft")
    throw new Error(
      "Hanya usulan berstatus Draft yang dapat dihapus. " +
        "Usulan yang sudah diajukan atau final tidak bisa dihapus.",
    );

  const { error } = await sb
    .from("usulan_anggaran")
    .delete()
    .eq("id", usulanId);
  if (error) throw new Error(error.message);

  revalidatePath("/penganggaran");
}

/** Buka kembali finalisasi (Final -> Draft) dengan penjaga urutan tahap. */
export async function reopenUsulanAction(usulanId: string): Promise<void> {
  const user = await requireUser();
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data: row, error: selErr } = await sb
    .from("usulan_anggaran")
    .select("id, status, satker_id, tahun_anggaran, tahap_pagu")
    .eq("id", usulanId)
    .single();
  if (selErr || !row) throw new Error("Usulan tidak ditemukan.");

  const isAdmin = user.role === "Administrator";
  const isOwnerOperator =
    user.role === "Operator" && row.satker_id === user.satker_id;
  if (!isAdmin && !isOwnerOperator)
    throw new Error("Anda tidak berhak membuka finalisasi usulan ini.");

  if (row.status !== "Final")
    throw new Error("Hanya tahap berstatus Final yang dapat dibuka kembali.");

  const idx = TAHAP_ORDER.indexOf(row.tahap_pagu as TahapPagu);
  if (idx >= 0 && idx < TAHAP_ORDER.length - 1) {
    const laterTahaps = TAHAP_ORDER.slice(idx + 1);
    const { data: laterRows } = await sb
      .from("usulan_anggaran")
      .select("tahap_pagu")
      .eq("satker_id", row.satker_id)
      .eq("tahun_anggaran", row.tahun_anggaran)
      .in("tahap_pagu", laterTahaps);
    if ((laterRows ?? []).length > 0) {
      const next = (laterRows![0] as { tahap_pagu: TahapPagu }).tahap_pagu;
      throw new Error(
        `Tahap berikutnya (${TAHAP_LABEL[next] ?? next}) sudah dibuat. ` +
          "Hapus dulu tahap berikutnya sebelum membuka finalisasi tahap ini.",
      );
    }
  }

  const { error } = await sb
    .from("usulan_anggaran")
    .update({ status: "Draft" })
    .eq("id", usulanId);
  if (error) throw new Error(error.message);

  revalidatePath("/penganggaran");
  revalidatePath(`/penganggaran/${usulanId}`);
}
