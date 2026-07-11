"use server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import type { KKImportNode } from "@/lib/kertas-kerja-import";

const LEVEL_DEPTH: Record<string, number> = {
  PROGRAM: 0, KEGIATAN: 1, KRO: 2, RO: 3,
  KOMPONEN: 4, SUB_KOMPONEN: 5, AKUN: 6, HEADER: 6.5, DETAIL: 7,
};

export interface ImportResult {
  ok: boolean;
  inserted?: number;
  counts?: Record<string, number>;
  total?: number;
  /** Referensi: berapa node ditautkan ke master yang SUDAH ada vs master BARU dibuat. */
  refLinked?: number;
  refCreated?: number;
  refFailed?: number;
  error?: string;
}

/** Normalisasi kode BA ke 3 digit ("22" → "022") agar tak tercipta BA ganda
 *  (Kertas Kerja memakai "022", impor KODE dulu memakai "22"). */
function normBaKode(k: string | undefined): string {
  const s = (k || "").trim();
  return /^\d+$/.test(s) ? s.padStart(3, "0") : s;
}

/** Kategori belanja (enum master_akun) diturunkan dari prefiks kode akun (BAS). */
function akunKategori(kode: string): string {
  const k = (kode || "").replace(/\D/g, "");
  if (k.startsWith("51")) return "Belanja Pegawai";
  if (k.startsWith("53")) return "Belanja Modal";
  return "Belanja Barang"; // 52x & lainnya
}

/**
 * Ganti seluruh rincian sebuah usulan dengan hasil parse Kertas Kerja.
 * Menghapus struktur lama lalu menyisipkan struktur baru (service-role).
 *
 * REKONSILIASI REFERENSI: tiap node struktural (PROGRAM→KOMPONEN + AKUN)
 * dicocokkan ke tabel master. Kode yang SUDAH ada dipakai ulang (dedup, tak
 * membuat duplikat) dan yang BELUM ada dibuat otomatis, lalu `referensi_id`
 * ditautkan — sehingga struktur hasil impor bisa langsung diedit (picker anak
 * berfungsi) & konsisten dengan Referensi. Pencocokan ber-scope induk sehingga
 * deterministik walau master global memuat kode duplikat.
 */
export async function importKertasKerjaAction(
  usulanId: string,
  nodes: KKImportNode[],
  fileTotal = 0,
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

    // 2) Rekonsiliasi REFERENSI (get-or-create, top-down). ---------------------
    let refLinked = 0;
    let refCreated = 0;
    let refFailed = 0;
    const cache = new Map<string, string>(); // cacheKey → masterId (hindari query berulang)

    /** Cari master by kolom pencocok; bila tak ada, BUAT. Kembalikan id master. */
    async function getOrCreate(
      table: string,
      match: Record<string, string | null>,
      insertRow: Record<string, unknown>,
      cacheKey: string,
    ): Promise<{ id: string; created: boolean }> {
      const hit = cache.get(cacheKey);
      if (hit) return { id: hit, created: false };

      const sel = () => {
        let q = sb.from(table).select("id");
        for (const [c, v] of Object.entries(match))
          q = v === null ? q.is(c, null) : q.eq(c, v);
        return q.limit(1);
      };

      const { data: found } = await sel();
      if (found && found[0]?.id) {
        cache.set(cacheKey, found[0].id);
        return { id: found[0].id, created: false };
      }

      const { data: created, error } = await sb
        .from(table)
        .insert(insertRow)
        .select("id")
        .single();
      if (!error && created?.id) {
        cache.set(cacheKey, created.id);
        return { id: created.id, created: true };
      }

      // Konflik unik (mis. balapan) → ambil ulang yang sudah ada.
      const { data: again } = await sel();
      if (again && again[0]?.id) {
        cache.set(cacheKey, again[0].id);
        return { id: again[0].id, created: false };
      }
      throw new Error(error?.message || `Gagal resolusi ${table}`);
    }

    // Nodes dari parser sudah PRE-ORDER (induk sebelum anak) → refId induk siap
    // saat memproses anak.
    const refIdByTempId = new Map<string, string | null>();
    const lastSeg = (k: string) => k.split(".").pop() || k;

    for (const n of nodes) {
      const parentRef = n.parentTempId
        ? refIdByTempId.get(n.parentTempId) ?? null
        : null;
      const kode = (n.kode ?? "").trim();
      const uraian = (n.uraian ?? "").trim();
      let refId: string | null = null;

      try {
        if (n.level === "PROGRAM" && kode) {
          // "022.12.DL" → BA "022" + kode_program "12.DL"
          const parts = kode.split(".");
          const baKode = normBaKode(parts[0]) || "022";
          const progKode = parts.slice(1).join(".") || kode;
          const ba = await getOrCreate(
            "master_ba",
            { kode_ba: baKode },
            { kode_ba: baKode, nama_ba: baKode },
            `ba|${baKode}`,
          );
          const r = await getOrCreate(
            "master_program",
            { ba_id: ba.id, kode_program: progKode },
            { ba_id: ba.id, kode_program: progKode, nama_program: uraian || progKode },
            `prog|${ba.id}|${progKode}`,
          );
          refId = r.id;
          r.created ? refCreated++ : refLinked++;
        } else if (n.level === "KEGIATAN" && kode && parentRef) {
          const r = await getOrCreate(
            "master_kegiatan",
            { program_id: parentRef, kode_kegiatan: kode },
            { program_id: parentRef, kode_kegiatan: kode, nama_kegiatan: uraian || kode },
            `keg|${parentRef}|${kode}`,
          );
          refId = r.id;
          r.created ? refCreated++ : refLinked++;
        } else if (n.level === "KRO" && kode && parentRef) {
          const kk = lastSeg(kode); // "3996.BMA" → "BMA"
          const r = await getOrCreate(
            "master_kro",
            { kegiatan_id: parentRef, kode_kro: kk },
            { kegiatan_id: parentRef, kode_kro: kk, nama_kro: uraian || kk },
            `kro|${parentRef}|${kk}`,
          );
          refId = r.id;
          r.created ? refCreated++ : refLinked++;
        } else if (n.level === "RO" && kode && parentRef) {
          const rk = lastSeg(kode); // "3996.BMA.005" → "005"
          const r = await getOrCreate(
            "master_ro",
            { kro_id: parentRef, kode_ro: rk },
            { kro_id: parentRef, kode_ro: rk, nama_ro: uraian || rk },
            `ro|${parentRef}|${rk}`,
          );
          refId = r.id;
          r.created ? refCreated++ : refLinked++;
        } else if (n.level === "KOMPONEN" && kode && parentRef) {
          const ck = lastSeg(kode); // "051"
          const r = await getOrCreate(
            "master_komponen",
            { ro_id: parentRef, kode_komponen: ck },
            { ro_id: parentRef, kode_komponen: ck, nama_komponen: uraian || ck },
            `komp|${parentRef}|${ck}`,
          );
          refId = r.id;
          r.created ? refCreated++ : refLinked++;
        } else if (n.level === "AKUN" && kode) {
          const r = await getOrCreate(
            "master_akun",
            { kode_akun: kode },
            {
              kode_akun: kode,
              nama_akun: uraian || kode,
              kategori_belanja: akunKategori(kode),
              sumber_dana: n.sumber_dana || "RM",
            },
            `akun|${kode}`,
          );
          refId = r.id;
          r.created ? refCreated++ : refLinked++;
        }
        // SUB_KOMPONEN / HEADER / DETAIL: tak punya master → referensi_id null.
      } catch {
        // Jangan gagalkan seluruh impor karena satu resolusi gagal — biarkan
        // node tsb tak-tertaut (referensi_id null) & catat sebagai gagal.
        refId = null;
        refFailed++;
      }
      refIdByTempId.set(n.tempId, refId);
    }

    // 3) Petakan tempId → uuid, urutan per induk.
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
        referensi_id: refIdByTempId.get(n.tempId) ?? null,
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

    // 4) Sisipkan per kedalaman (induk sebelum anak), per potongan 500.
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

    // 5) Bersihkan klaim KRO (data segar untuk input paralel) + segarkan total.
    await sb
      .from("usulan_struktur")
      .update({ dikerjakan_oleh: null, dikerjakan_oleh_nama: null, dikerjakan_pada: null })
      .eq("usulan_id", usulanId)
      .eq("level", "KRO");

    const total = nodes
      .filter((n) => n.level === "DETAIL")
      .reduce((s, n) => s + (n.jumlah ?? 0), 0);
    await sb.from("usulan_anggaran").update({ total_anggaran: total, total_header: fileTotal || null }).eq("id", usulanId);

    const counts: Record<string, number> = {};
    for (const n of nodes) counts[n.level] = (counts[n.level] ?? 0) + 1;

    return { ok: true, inserted, counts, total, refLinked, refCreated, refFailed };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
