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
import type { UsulanStruktur } from "@/types/database";
import { remapStruktur } from "@/lib/copy-anggaran";
import { fetchAllStruktur } from "@/lib/fetch-struktur";

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

  // Cegah duplikat: tahap pagu yang sama untuk satker + tahun ini tidak boleh
  // dibuat dua kali (mencegah daftar usulan berisi entri ganda).
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

/**
 * Hapus satu usulan anggaran beserta seluruh strukturnya (cascade di DB).
 *
 * Aturan (selaras dengan RLS):
 *  - Administrator boleh menghapus usulan apa pun.
 *  - Operator hanya boleh menghapus usulan satker-nya sendiri dan hanya yang
 *    berstatus "Draft" (mis. draft pagu kebutuhan yang terlanjur terbuat).
 *  - Usulan yang sudah diajukan/direview/final tidak dapat dihapus operator,
 *    demi menjaga integritas alur kerja.
 */
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

/**
 * Buka kembali finalisasi sebuah tahap (status Final → Draft) supaya rincian
 * dapat diubah lagi bila ada perubahan di kemudian hari.
 *
 * Aturan & penjaga integritas:
 *  - Administrator boleh, atau Operator pada satker-nya sendiri.
 *  - Hanya usulan berstatus "Final" yang dapat dibuka.
 *  - Jika tahap SETELAH tahap ini (satker + tahun sama) sudah terlanjur dibuat,
 *    finalisasi tahap ini tidak boleh dibuka dulu — demi menjaga urutan tahap
 *    pagu tetap konsisten. Hapus tahap berikutnya lebih dulu bila perlu.
 */
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

  // Cegah membuka tahap yang sudah memiliki tahap penerus.
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

/* ─────────────────────────────────────────────────────────────────────────
 * Salin Anggaran — mempercepat penyusunan dengan menyalin seluruh struktur
 * (kegiatan + rincian + nilai) dari usulan lain milik satker yang sama:
 *   • dari tahun sebelumnya (tahap mana pun), atau
 *   • dari tahap sebelumnya pada tahun yang sama (mis. Kebutuhan → Indikatif).
 * Hasil salinan menjadi DRAFT pada usulan tujuan sehingga bisa diubah.
 * ──────────────────────────────────────────────────────────────────────── */

function isRedirectError(e: unknown): boolean {
  const d = (e as { digest?: unknown })?.digest;
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT");
}
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface CopySource {
  id: string;
  tahun: number;
  tahap: string;
  status: string;
  total: number;
  nodes: number;
}
export type CopySourcesResult =
  | { ok: true; sources: CopySource[] }
  | { ok: false; error: string };

/** Daftar usulan yang BISA dijadikan sumber salinan untuk usulan tujuan. */
export async function listCopySourcesAction(
  targetUsulanId: string,
): Promise<CopySourcesResult> {
  try {
    const user = await requireUser();
    const sb = (await createServerSupabase()) as unknown as {
      from: (t: string) => any;
    };

    const { data: target } = await sb
      .from("usulan_anggaran")
      .select("id, satker_id")
      .eq("id", targetUsulanId)
      .single();
    if (!target) throw new Error("Usulan tujuan tidak ditemukan.");
    if (user.role !== "Administrator" && target.satker_id !== user.satker_id)
      throw new Error("Anda tidak berhak mengakses usulan ini.");

    const { data: cands } = await sb
      .from("usulan_anggaran")
      .select("id, tahun_anggaran, tahap_pagu, status, total_anggaran")
      .eq("satker_id", target.satker_id)
      .neq("id", targetUsulanId);

    const candList = (cands ?? []) as {
      id: string;
      tahun_anggaran: number;
      tahap_pagu: string | null;
      status: string;
      total_anggaran: number | null;
    }[];
    // Hitung jumlah node tiap kandidat SECARA PARALEL (bukan beruntun) agar
    // panel "Salin Anggaran" muncul cepat walau satker punya banyak usulan.
    const counted = await Promise.all(
      candList.map(async (c) => {
        const { count } = await sb
          .from("usulan_struktur")
          .select("id", { count: "exact", head: true })
          .eq("usulan_id", c.id);
        return { c, count: count ?? 0 };
      }),
    );
    const sources: CopySource[] = counted
      .filter(({ count }) => count > 0)
      .map(({ c, count }) => ({
        id: c.id,
        tahun: c.tahun_anggaran,
        tahap: c.tahap_pagu ?? "KEBUTUHAN",
        status: c.status,
        total: c.total_anggaran ?? 0,
        nodes: count,
      }));

    sources.sort(
      (a, b) =>
        b.tahun - a.tahun ||
        TAHAP_ORDER.indexOf(a.tahap as TahapPagu) -
          TAHAP_ORDER.indexOf(b.tahap as TahapPagu),
    );
    return { ok: true, sources };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: errMsg(e) };
  }
}

export type CopyResult =
  | { ok: true; copied: number }
  | { ok: false; error: string };

/** Salin seluruh struktur dari usulan sumber ke usulan tujuan (harus Draft kosong). */
export async function copyAnggaranAction(
  targetUsulanId: string,
  sourceUsulanId: string,
): Promise<CopyResult> {
  try {
    const user = await requireUser();
    const sb = (await createServerSupabase()) as unknown as {
      from: (t: string) => any;
    };

    const { data: target } = await sb
      .from("usulan_anggaran")
      .select("id, status, satker_id, program_id, kegiatan_id")
      .eq("id", targetUsulanId)
      .single();
    if (!target) throw new Error("Usulan tujuan tidak ditemukan.");

    const isAdmin = user.role === "Administrator";
    if (!isAdmin && target.satker_id !== user.satker_id)
      throw new Error("Anda tidak berhak menyalin ke usulan ini.");
    if (target.status !== "Draft")
      throw new Error(
        "Hanya usulan berstatus Draft yang dapat diisi dengan salinan.",
      );

    const { count: tgtCount } = await sb
      .from("usulan_struktur")
      .select("id", { count: "exact", head: true })
      .eq("usulan_id", targetUsulanId);
    if ((tgtCount ?? 0) > 0)
      throw new Error(
        "Usulan tujuan sudah berisi rincian. Kosongkan dahulu sebelum menyalin.",
      );

    const { data: source } = await sb
      .from("usulan_anggaran")
      .select("id, satker_id, total_anggaran, program_id, kegiatan_id")
      .eq("id", sourceUsulanId)
      .single();
    if (!source) throw new Error("Usulan sumber tidak ditemukan.");
    if (source.satker_id !== target.satker_id)
      throw new Error("Hanya bisa menyalin dari usulan satker yang sama.");

    const rows = await fetchAllStruktur(sb, sourceUsulanId);
    if (rows.length === 0)
      throw new Error("Usulan sumber tidak memiliki rincian untuk disalin.");

    // Petakan ulang seluruh struktur (id baru, parent diremap, batch per level).
    const batches = remapStruktur(rows, targetUsulanId, () =>
      crypto.randomUUID(),
    );

    let copied = 0;
    for (const batch of batches) {
      for (let i = 0; i < batch.length; i += 500) {
        const chunk = batch.slice(i, i + 500);
        const { error } = await sb.from("usulan_struktur").insert(chunk);
        if (error) throw new Error(error.message);
        copied += chunk.length;
      }
    }

    await sb
      .from("usulan_anggaran")
      .update({
        total_anggaran: source.total_anggaran ?? 0,
        program_id: target.program_id ?? source.program_id ?? null,
        kegiatan_id: target.kegiatan_id ?? source.kegiatan_id ?? null,
      })
      .eq("id", targetUsulanId);

    revalidatePath("/penganggaran");
    revalidatePath(`/penganggaran/${targetUsulanId}`);
    return { ok: true, copied };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: errMsg(e) };
  }
}
