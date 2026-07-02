// SIPPT — operasi penganggaran via Supabase (browser client). RLS membatasi tulis ke Administrator.
import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Level, UsulanStruktur } from "@/types/database";
import { LEVEL_LABEL } from "@/lib/constants";
import { refQueryFor, type RefQuery } from "@/lib/ref-query";
import { remapSubtreeMerge } from "@/lib/copy-subtree";
import { fetchAllStruktur } from "@/lib/fetch-struktur";

export { refQueryFor };
export type { RefQuery };

// Tipe tabel di proyek ini belum memetakan Insert/Update, sehingga client bertipe
// ketat akan menyimpulkan `never`. Pakai client longgar di sini; keamanan tetap
// dijaga oleh RLS + trigger database.
const sb = (): SupabaseClient => createClient() as unknown as SupabaseClient;

export interface PathCtx {
  usulan_id: string;
  parent_id: string | null;
}

// Level yang tidak boleh diisi dobel pada induk yang sama dalam satu usulan.
// (AKUN & DETAIL sengaja dikecualikan — satu akun boleh memuat banyak detail,
// dan akun yang sama bisa relevan di tempat berbeda.)
const DUP_GUARD_LEVELS: Level[] = [
  "PROGRAM",
  "KEGIATAN",
  "KRO",
  "RO",
  "KOMPONEN",
  "SUB_KOMPONEN",
];

const normKode = (k: string | null | undefined) =>
  (k ?? "").trim().toUpperCase();

/**
 * Pastikan node belum ada pada induk yang sama (anti-duplikat).
 * Identitas duplikat: referensi_id yang sama ATAU kode yang sama (di antara
 * sesama level & induk yang sama dalam satu usulan).
 */
async function assertNotDuplicate(input: {
  usulan_id: string;
  parent_id: string | null;
  level: Level;
  referensi_id?: string | null;
  kode: string;
  uraian: string;
}): Promise<void> {
  let q = sb()
    .from("usulan_struktur")
    .select("id, kode, referensi_id")
    .eq("usulan_id", input.usulan_id)
    .eq("level", input.level);
  q = input.parent_id
    ? q.eq("parent_id", input.parent_id)
    : q.is("parent_id", null);
  const { data, error } = await q;
  if (error) throw error;

  const siblings = (data ?? []) as {
    kode: string | null;
    referensi_id: string | null;
  }[];

  const sameRef = input.referensi_id
    ? siblings.some(
        (s) => s.referensi_id && s.referensi_id === input.referensi_id,
      )
    : false;
  const sameKode = normKode(input.kode)
    ? siblings.some((s) => normKode(s.kode) === normKode(input.kode))
    : false;

  if (sameRef || sameKode) {
    const label = LEVEL_LABEL[input.level] ?? input.level;
    throw new Error(
      `${label} "${input.kode}${input.uraian ? " — " + input.uraian : ""}" ` +
        "sudah ada pada usulan ini. Tidak boleh ditambahkan dua kali.",
    );
  }
}

/** Tambah node struktur (KRO/RO/KOMPONEN/SUB_KOMPONEN/AKUN). */
export async function addNode(input: {
  usulan_id: string;
  parent_id: string | null;
  level: Level;
  referensi_id?: string | null;
  kode: string;
  uraian: string;
  satuan?: string | null;
  sumber_dana?: string | null;
}): Promise<UsulanStruktur> {
  if (DUP_GUARD_LEVELS.includes(input.level)) {
    await assertNotDuplicate(input);
  }
  const urutan = await nextUrutan(input.usulan_id, input.parent_id);
  const { data, error } = await sb()
    .from("usulan_struktur")
    .insert({ ...input, urutan, volume: 0, harga: 0, jumlah: 0 })
    .select("*")
    .single();
  if (error) throw error;
  return data as UsulanStruktur;
}

/** Tambah node HEADER (pengelompok di bawah Akun; hanya uraian). */
export async function addHeader(input: {
  usulan_id: string;
  parent_id: string; // id AKUN
  uraian: string;
}): Promise<UsulanStruktur> {
  const urutan = await nextUrutan(input.usulan_id, input.parent_id);
  const { data, error } = await sb()
    .from("usulan_struktur")
    .insert({
      usulan_id: input.usulan_id,
      parent_id: input.parent_id,
      level: "HEADER" as Level,
      kode: "",
      uraian: input.uraian,
      volume: 0,
      harga: 0,
      jumlah: 0,
      urutan,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as UsulanStruktur;
}

/** Tambah / ubah Detail Belanja (jumlah dihitung trigger DB). */
export async function upsertDetail(input: {
  id?: string;
  usulan_id: string;
  parent_id: string; // id AKUN
  uraian: string;
  volume: number;
  satuan: string;
  harga: number;
  sumber_dana?: string | null; // diwarisi dari akun
  jenis_belanja?: string | null; // 'OPS' | 'NON_OPS'
  segments?: { qty: number; sat: string }[] | null; // rincian volume bertingkat
}): Promise<void> {
  const payload = {
    usulan_id: input.usulan_id,
    parent_id: input.parent_id,
    level: "DETAIL" as Level,
    uraian: input.uraian,
    volume: input.volume,
    satuan: input.satuan,
    harga: input.harga,
    sumber_dana: input.sumber_dana ?? null,
    jenis_belanja: input.jenis_belanja ?? null,
    volume_rincian:
      input.segments && input.segments.length > 0 ? input.segments : null,
  };
  if (input.id) {
    const { error } = await sb()
      .from("usulan_struktur")
      .update(payload)
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const urutan = await nextUrutan(input.usulan_id, input.parent_id);
    const { error } = await sb()
      .from("usulan_struktur")
      .insert({ ...payload, urutan });
    if (error) throw error;
  }
}

/** Metadata akun (sumber dana & kategori) untuk diwariskan ke detail. */
export async function getAkunMeta(
  masterAkunId: string,
): Promise<{ sumber_dana: string; kategori_belanja: string } | null> {
  const { data } = await sb()
    .from("master_akun")
    .select("sumber_dana, kategori_belanja")
    .eq("id", masterAkunId)
    .single();
  if (!data) return null;
  return {
    sumber_dana:
      ((data as Record<string, unknown>).sumber_dana as string) ?? "RM",
    kategori_belanja:
      ((data as Record<string, unknown>).kategori_belanja as string) ?? "",
  };
}

export async function deleteNode(id: string): Promise<void> {
  const { error } = await sb().from("usulan_struktur").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Klaim KRO untuk pengguna saat ini (input paralel). Gagal bila sudah diklaim
 * pengguna lain. Idempoten bila sudah milik sendiri.
 */
export async function claimKro(
  kroId: string,
  me: { id: string; nama: string | null },
): Promise<void> {
  const { data, error } = await sb()
    .from("usulan_struktur")
    .update({
      dikerjakan_oleh: me.id,
      dikerjakan_oleh_nama: me.nama ?? "",
      dikerjakan_pada: new Date().toISOString(),
    })
    .eq("id", kroId)
    .or(`dikerjakan_oleh.is.null,dikerjakan_oleh.eq.${me.id}`)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("KRO_TERKUNCI: KRO ini sedang dikerjakan pengguna lain.");
}

/** Lepas klaim KRO (hanya pemiliknya). */
export async function releaseKro(kroId: string, me: { id: string }): Promise<void> {
  const { error } = await sb()
    .from("usulan_struktur")
    .update({ dikerjakan_oleh: null, dikerjakan_oleh_nama: null, dikerjakan_pada: null })
    .eq("id", kroId)
    .eq("dikerjakan_oleh", me.id);
  if (error) throw error;
}

/** Deteksi error "kolom klaim belum ada" (migrasi belum dijalankan). */
function isClaimColumnMissing(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return (
    err?.code === "PGRST204" ||
    /dikerjakan_oleh|schema cache|could not find the/i.test(err?.message ?? "")
  );
}

/**
 * Klaim beberapa KRO sekaligus (atomik per-KRO via claimKro). Mengembalikan id
 * yang berhasil diklaim dan yang gagal (sudah dikunci pengguna lain) beserta
 * nama pemilik saat ini untuk ditampilkan ke pengguna.
 *
 * Jika kolom klaim belum ada di database (migrasi belum dijalankan), fungsi
 * mendegradasi dengan aman: menganggap semua KRO "terklaim" tanpa menulis ke DB,
 * sehingga lock keras nonaktif namun aplikasi tetap berjalan (lock presence tetap
 * berfungsi). Jalankan migrasi penambahan kolom untuk mengaktifkan lock keras.
 */
export async function claimKros(
  kroIds: string[],
  me: { id: string; nama: string | null },
): Promise<{ claimedIds: string[]; failed: { id: string; owner: string | null }[]; unavailable?: boolean }> {
  const claimedIds: string[] = [];
  const failed: { id: string; owner: string | null }[] = [];
  for (const id of kroIds) {
    try {
      await claimKro(id, me);
      claimedIds.push(id);
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("TERKUNCI")) {
        const { data } = await sb()
          .from("usulan_struktur")
          .select("dikerjakan_oleh_nama")
          .eq("id", id)
          .maybeSingle();
        failed.push({ id, owner: (data as { dikerjakan_oleh_nama?: string | null } | null)?.dikerjakan_oleh_nama ?? null });
      } else if (isClaimColumnMissing(e)) {
        // Fitur klaim DB belum tersedia → jangan blokir pengguna.
        return { claimedIds: [...kroIds], failed: [], unavailable: true };
      } else {
        throw e;
      }
    }
  }
  return { claimedIds, failed };
}

/** Lepas beberapa klaim KRO sekaligus (hanya milik sendiri; error diabaikan). */
export async function releaseKros(kroIds: string[], me: { id: string }): Promise<void> {
  for (const id of kroIds) {
    try {
      await releaseKro(id, me);
    } catch {
      /* abaikan kegagalan pelepasan individual */
    }
  }
}

/** Hapus beberapa node sekaligus (mis. sebuah node beserta seluruh turunannya). */
export async function deleteNodes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await sb().from("usulan_struktur").delete().in("id", ids);
  if (error) throw error;
}

/**
 * Salin sebuah node (Sub Komponen / Akun / Detail) beserta seluruh turunannya
 * ke bawah induk baru dalam usulan yang sama. Menghasilkan id-id baru.
 */
export async function pasteNode(
  usulanId: string,
  rootId: string,
  newParentId: string,
): Promise<void> {
  const rows = await fetchStruktur(usulanId);
  const rootUrutan = await nextUrutan(usulanId, newParentId);
  // Gunakan versi GABUNG: node struktural berkode sama di induk tujuan dipakai
  // ulang (mencegah pelanggaran uq_usulan_struktur_sibling_kode), detail tetap
  // ditambahkan ke dalamnya.
  const batches = remapSubtreeMerge(
    rows as unknown as Parameters<typeof remapSubtreeMerge>[0],
    rootId,
    newParentId,
    usulanId,
    () => crypto.randomUUID(),
    rootUrutan,
  );
  // Sisipkan dari level dangkal ke dalam (induk sebelum anak) agar FK aman.
  for (const batch of batches) {
    if (batch.length === 0) continue;
    const { error } = await sb().from("usulan_struktur").insert(batch);
    if (error) throw error;
  }
}

/** Ubah field sebuah node (mis. kode/uraian Sub Komponen, atau ganti referensi Akun). */
export async function editNode(
  id: string,
  patch: {
    kode?: string | null;
    uraian?: string | null;
    referensi_id?: string | null;
    sumber_dana?: string | null;
  },
): Promise<void> {
  const { error } = await sb().from("usulan_struktur").update(patch).eq("id", id);
  if (error) throw error;
}

/** Setel sumber dana seluruh anak langsung sebuah node (mis. saat akun diganti). */
export async function setChildrenSumber(
  parentId: string,
  sumber: string | null,
): Promise<void> {
  const { error } = await sb()
    .from("usulan_struktur")
    .update({ sumber_dana: sumber })
    .eq("parent_id", parentId);
  if (error) throw error;
}

/** Ubah status usulan (mis. menandai tahap SELESAI dengan 'Final'). RLS menegakkan izin. */
export async function setUsulanStatus(
  usulanId: string,
  status: string,
): Promise<void> {
  const { error } = await sb()
    .from("usulan_anggaran")
    .update({ status })
    .eq("id", usulanId);
  if (error) throw error;
}

/** Hapus usulan beserta seluruh strukturnya (cascade di DB). RLS menegakkan izin. */
export async function deleteUsulan(usulanId: string): Promise<void> {
  const { error } = await sb()
    .from("usulan_anggaran")
    .delete()
    .eq("id", usulanId);
  if (error) throw error;
}

export async function fetchStruktur(
  usulan_id: string,
): Promise<UsulanStruktur[]> {
  return fetchAllStruktur(sb(), usulan_id);
}

async function nextUrutan(
  usulan_id: string,
  parent_id: string | null,
): Promise<number> {
  let q = sb()
    .from("usulan_struktur")
    .select("urutan")
    .eq("usulan_id", usulan_id);
  q = parent_id ? q.eq("parent_id", parent_id) : q.is("parent_id", null);
  const { data } = await q.order("urutan", { ascending: false }).limit(1);
  return ((data?.[0]?.urutan as number) ?? -1) + 1;
}

/* ── Pencarian referensi (server-side: ilike + range + count) untuk MODUL 3 ── */
export interface RefRow {
  id: string;
  kode: string;
  nama: string;
  extra?: string;
}

export async function searchReference(
  cfg: RefQuery,
  q: string,
  page: number,
  perPage: number,
): Promise<{ rows: RefRow[]; total: number }> {
  const from = (page - 1) * perPage;
  let query = sb()
    .from(cfg.table)
    .select(
      `id, ${cfg.kodeCol}, ${cfg.namaCol}${cfg.extraCol ? `, ${cfg.extraCol}` : ""}`,
      { count: "exact" },
    );
  if (cfg.parentCol && cfg.parentIds && cfg.parentIds.length)
    query = query.in(cfg.parentCol, cfg.parentIds);
  else if (cfg.parentCol && cfg.parentId)
    query = query.eq(cfg.parentCol, cfg.parentId);
  if (q.trim())
    query = query.or(`${cfg.kodeCol}.ilike.%${q}%,${cfg.namaCol}.ilike.%${q}%`);
  query = query
    .order(cfg.kodeCol, { ascending: true })
    .range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  const list = (data ?? []) as unknown as Record<string, unknown>[];
  const rows: RefRow[] = list.map((r) => ({
    id: r.id as string,
    kode: r[cfg.kodeCol] as string,
    nama: r[cfg.namaCol] as string,
    extra: cfg.extraCol ? (r[cfg.extraCol] as string) : undefined,
  }));
  return { rows, total: count ?? 0 };
}

/**
 * Kumpulkan id master_ro yang cocok dengan JALUR KODE (kegiatan → KRO → RO),
 * digabung dengan referensi_id node RO (bila ada).
 *
 * Tujuannya membuat pembacaan komponen TAHAN terhadap referensi_id yang basi
 * atau keliru: RO generik seperti "994" (Layanan Perkantoran) muncul di banyak
 * KRO/Kegiatan, sehingga referensi_id node bisa menunjuk master_ro lama/lain.
 * Dengan menelusuri kode kegiatan+KRO+RO, komponen tetap terbaca dari referensi
 * TANPA melebar ke kegiatan lain (kode kegiatan unik → presisi).
 *
 * `kegKode`/`kroKode`/`roKode` = KODE PENDEK (segmen terakhir), mis. "4627"/"EBA"/"994".
 */
export async function resolveKomponenRoIds(
  kegKode: string | null,
  kroKode: string | null,
  roKode: string | null,
  fallbackRoId?: string | null,
): Promise<string[]> {
  const ids = new Set<string>();
  if (fallbackRoId) ids.add(fallbackRoId);
  if (!roKode) return [...ids];

  let kroIds: string[] | null = null;
  if (kroKode) {
    const { data: kros } = await sb()
      .from("master_kro")
      .select("id, kegiatan_id")
      .eq("kode_kro", kroKode);
    let list = (kros ?? []) as { id: string; kegiatan_id: string }[];
    // Sempitkan ke kegiatan yang cocok (presisi). Bila tak ada yang cocok,
    // pertahankan daftar luas sebagai fallback.
    if (kegKode && list.length) {
      const { data: kegs } = await sb()
        .from("master_kegiatan")
        .select("id")
        .eq("kode_kegiatan", kegKode);
      const kegIds = new Set(((kegs ?? []) as { id: string }[]).map((k) => k.id));
      if (kegIds.size) {
        const scoped = list.filter((k) => kegIds.has(k.kegiatan_id));
        if (scoped.length) list = scoped;
      }
    }
    kroIds = list.map((k) => k.id);
  }

  let q = sb().from("master_ro").select("id").eq("kode_ro", roKode);
  if (kroIds && kroIds.length) q = q.in("kro_id", kroIds);
  const { data: ros } = await q;
  for (const r of (ros ?? []) as { id: string }[]) ids.add(r.id);
  return [...ids];
}
