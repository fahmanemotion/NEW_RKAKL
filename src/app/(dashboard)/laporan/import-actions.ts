"use server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import type { KKImportNode } from "@/lib/kertas-kerja-import";

const LEVEL_DEPTH: Record<string, number> = {
  PROGRAM: 0, KEGIATAN: 1, KRO: 2, RO: 3,
  KOMPONEN: 4, SUB_KOMPONEN: 5, AKUN: 6, DETAIL: 7,
};

export interface ImportResult {
  ok: boolean;
  inserted?: number;
  counts?: Record<string, number>;
  total?: number;
  error?: string;
}

/**
 * Ganti seluruh rincian sebuah usulan dengan hasil parse Kertas Kerja.
 * Menghapus struktur lama lalu menyisipkan struktur baru (service-role).
 */
export async function importKertasKerjaAction(
  usulanId: string,
  nodes: KKImportNode[],
): Promise<ImportResult> {
  try {
    const user = await requireUser();
    if (!usulanId) throw new Error("Usulan tujuan belum dipilih.");
    if (!nodes || nodes.length === 0) throw new Error("Tidak ada data untuk diimpor.");

    const sb = createAdminClient() as unknown as { from: (t: string) => any };

    const { data: target } = await sb
      .from("usulan_anggaran")
      .select("id, satker_id, status")
      .eq("id", usulanId)
      .single();
    if (!target) throw new Error("Usulan tujuan tidak ditemukan.");

    const isAdmin = user.role === "Administrator";
    if (!isAdmin && target.satker_id !== user.satker_id)
      throw new Error("Anda tidak berhak mengubah usulan ini.");

    // 1) Hapus struktur lama (cascade lewat FK parent_id).
    const { error: delErr } = await sb
      .from("usulan_struktur")
      .delete()
      .eq("usulan_id", usulanId);
    if (delErr) throw new Error(delErr.message);

    // 2) Petakan tempId → uuid, urutan per induk.
    const idMap = new Map<string, string>();
    for (const n of nodes) idMap.set(n.tempId, crypto.randomUUID());
    const urutByParent = new Map<string, number>();

    const recs = nodes.map((n) => {
      const pkey = n.parentTempId ?? "__root__";
      const u = urutByParent.get(pkey) ?? 0;
      urutByParent.set(pkey, u + 1);
      return {
        id: idMap.get(n.tempId)!,
        usulan_id: usulanId,
        parent_id: n.parentTempId ? idMap.get(n.parentTempId)! : null,
        level: n.level,
        referensi_id: null,
        kode: n.kode,
        uraian: n.uraian,
        volume: n.volume,
        satuan: n.satuan,
        harga: n.harga,
        jumlah: n.jumlah ?? 0,
        sumber_dana: n.sumber_dana,
        jenis_belanja: n.jenis_belanja,
        volume_rincian: n.segments ?? null,
        urutan: u,
        depth: LEVEL_DEPTH[n.level] ?? 0,
      };
    });

    // 3) Sisipkan per kedalaman (induk sebelum anak), per potongan 500.
    let inserted = 0;
    for (let d = 0; d <= 7; d++) {
      const batch = recs
        .filter((r) => r.depth === d)
        .map(({ depth: _omit, ...rest }) => rest);
      for (let i = 0; i < batch.length; i += 500) {
        const chunk = batch.slice(i, i + 500);
        const { error } = await sb.from("usulan_struktur").insert(chunk);
        if (error) throw new Error(error.message);
        inserted += chunk.length;
      }
    }

    // 4) Bersihkan klaim KRO (data segar untuk input paralel) + segarkan total.
    await sb
      .from("usulan_struktur")
      .update({ dikerjakan_oleh: null, dikerjakan_oleh_nama: null, dikerjakan_pada: null })
      .eq("usulan_id", usulanId)
      .eq("level", "KRO");

    const total = nodes
      .filter((n) => n.level === "PROGRAM")
      .reduce((s, n) => s + (n.jumlah ?? 0), 0);
    await sb.from("usulan_anggaran").update({ total_anggaran: total }).eq("id", usulanId);

    const counts: Record<string, number> = {};
    for (const n of nodes) counts[n.level] = (counts[n.level] ?? 0) + 1;

    return { ok: true, inserted, counts, total };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
