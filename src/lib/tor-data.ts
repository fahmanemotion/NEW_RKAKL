// SIPPT — penyiapan data TOR per komponen (untuk generator hal. 1-2).
import { createClient } from "@/lib/supabase";
import { terbilang } from "./rab-data";
import type { TorTokens, RabRow } from "./tor-generate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (): any => createClient();

function titleCase(s: string): string {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
/** Angka → "N (Ejaan Dalam Huruf)". Kosong bila 0. */
function ejaAngka(n: number): string {
  const w = terbilang(Math.round(n || 0)).replace(/\s*rupiah\s*$/i, "").trim();
  return titleCase(w);
}
function volRO(n: number): string {
  return n ? `${Math.round(n)} (${ejaAngka(n)})` : "";
}
function volKomp(n: number, satuan: string): string {
  return n ? `${Math.round(n)} (${ejaAngka(n)})${satuan ? " " + satuan : ""}` : "";
}
function fmtRupiah(n: number): string {
  return `${Math.round(n || 0).toLocaleString("id-ID")},-`;
}
/** "Kota, DD Bulan YYYY" (Indonesia). tanggal ISO opsional → default hari ini. */
function fmtTempatTgl(kota: string, tanggalIso: string | null): string {
  const bln = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const d = tanggalIso ? new Date(tanggalIso + "T00:00:00") : new Date();
  const tgl = `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
  return kota ? `${kota}, ${tgl}` : tgl;
}

/** Normalisasi nama komponen agar pencocokan KODE TOR longgar:
 *  huruf kecil, buang "(...)" (mis. "(BST)"), buang tanda baca, rapikan spasi. */
function normKomp(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

interface StrukturRow {
  id: string; parent_id: string | null; level: string;
  kode: string | null; uraian: string | null; volume: number | null; satuan: string | null;
  jumlah: number | null;
}
interface TorKodeRow {
  komponen: string; unit_eselon: string | null;
  indikator_ro: string | null; indikator_kro: string | null;
  sasaran_program: string | null; indikator_kinerja_program: string | null;
  sasaran_kegiatan: string | null; indikator_kinerja_kegiatan: string | null;
}

export interface TorKomponenItem {
  id: string;
  kode: string;
  uraian: string;
  roKode: string;
  roUraian: string;
  kroId: string;
  kroKode: string;
  kroUraian: string;
}

async function loadContext(usulanId: string) {
  const [{ data: u }, { data: rows }, { data: tor }, { data: ttd }, { data: pgr }] = await Promise.all([
    sb()
      .from("usulan_anggaran")
      .select(
        `id, tahun_anggaran,
         satker:master_satker!satker_id ( nama_satker, logo_tor, lokus,
           unit:master_unit_eselon1!unit_id ( nama,
             kem:master_kementerian!kementerian_id ( nama ) ) ),
         program:master_program!program_id ( kode_program, nama_program ),
         kegiatan:master_kegiatan!kegiatan_id ( kode_kegiatan, nama_kegiatan )`,
      )
      .eq("id", usulanId)
      .maybeSingle(),
    sb()
      .from("usulan_struktur")
      .select("id, parent_id, level, kode, uraian, volume, satuan, jumlah")
      .eq("usulan_id", usulanId),
    sb().from("master_tor_kode").select(
      "komponen, unit_eselon, indikator_ro, indikator_kro, sasaran_program, indikator_kinerja_program, sasaran_kegiatan, indikator_kinerja_kegiatan",
    ),
    sb().from("master_penandatangan").select("nama, jabatan, pangkat_golongan, nip, peran").order("nama"),
    sb().from("pengaturan_rab").select("kota, tanggal").limit(1).maybeSingle(),
  ]);
  return {
    u,
    rows: (rows ?? []) as StrukturRow[],
    tor: (tor ?? []) as TorKodeRow[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ttd: (ttd ?? []) as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pgr: (pgr ?? null) as any,
  };
}

/** Daftar komponen sebuah usulan (untuk dipilih di menu TOR). */
export async function listTorKomponen(usulanId: string): Promise<TorKomponenItem[]> {
  const { rows } = await loadContext(usulanId);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows
    .filter((r) => r.level === "KOMPONEN")
    .map((k) => {
      const ro = k.parent_id ? byId.get(k.parent_id) : undefined;
      const kro = ro?.parent_id ? byId.get(ro.parent_id) : undefined;
      return {
        id: k.id,
        kode: k.kode ?? "",
        uraian: k.uraian ?? "",
        roKode: ro?.kode ?? "",
        roUraian: ro?.uraian ?? "",
        kroId: kro?.id ?? "",
        kroKode: kro?.kode ?? "",
        kroUraian: kro?.uraian ?? "",
      };
    })
    .sort((a, b) => a.kode.localeCompare(b.kode));
}

/** Bangun token + logo + nama file + baris RAB untuk satu komponen. */
export async function buildTorForKomponen(
  usulanId: string,
  komponenId: string,
): Promise<{ tokens: Partial<TorTokens>; logo: string | null; filename: string; rab: RabRow[] }> {
  const { u, rows, tor, ttd, pgr } = await loadContext(usulanId);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const komp = byId.get(komponenId);
  const ro = komp?.parent_id ? byId.get(komp.parent_id) : undefined;
  const kro = ro?.parent_id ? byId.get(ro.parent_id) : undefined;
  // Program & Kegiatan diambil dari KERTAS KERJA (naik: KRO → KEGIATAN → PROGRAM).
  const kegiatanNode = kro?.parent_id ? byId.get(kro.parent_id) : undefined;
  const programNode = kegiatanNode?.parent_id ? byId.get(kegiatanNode.parent_id) : undefined;

  // Volume RO = Σ volume komponen di bawah RO (dari kertas kerja).
  let volRoNum = 0;
  if (ro) for (const r of rows) if (r.level === "KOMPONEN" && r.parent_id === ro.id) volRoNum += Number(r.volume || 0);
  const totalKomp = Number(komp?.jumlah || 0);
  // Penempatan tanda tangan: kiri = peran "Mengetahui", kanan = "KPA".
  // Bila peran belum diisi, pakai dua penandatangan pertama.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byPeran = (p: string) => ttd.find((x: any) => String(x?.peran || "").trim().toLowerCase() === p);
  const t1 = byPeran("mengetahui") ?? ttd[0] ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t2 = byPeran("kpa") ?? ttd.find((x: any) => x !== t1) ?? ttd[1] ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satker: any = u?.satker ?? {};
  const unit = satker?.unit ?? {};
  const kem = unit?.kem ?? {};
  const kompNama = komp?.uraian ?? "";
  // Cocokkan KODE TOR ke komponen: normalisasi dulu; bila belum ketemu, coba
  // salah satu memuat yang lain (menangani sufiks "(BST)" / prefiks kode).
  const kompKey = normKomp(kompNama);
  let t = kompKey ? tor.find((x) => normKomp(x.komponen) === kompKey) : undefined;
  if (!t && kompKey.length >= 5) {
    t = tor.find((x) => {
      const k = normKomp(x.komponen);
      return k.length >= 5 && (k.includes(kompKey) || kompKey.includes(k));
    });
  }

  const KL = kem?.nama || "Kementerian";
  // Utamakan dari kertas kerja (node pohon); fallback ke join usulan_anggaran.
  const program =
    programNode && programNode.level === "PROGRAM"
      ? `${programNode.uraian ?? ""}${programNode.kode ? ` (${programNode.kode})` : ""}`.trim()
      : u?.program
        ? `${u.program.nama_program} (${u.program.kode_program})`
        : "";
  const kegiatan =
    kegiatanNode && kegiatanNode.level === "KEGIATAN"
      ? `${kegiatanNode.uraian ?? ""}${kegiatanNode.kode ? ` (${kegiatanNode.kode})` : ""}`.trim()
      : u?.kegiatan
        ? `${u.kegiatan.nama_kegiatan} (${u.kegiatan.kode_kegiatan})`
        : "";
  const tahun = String(u?.tahun_anggaran ?? "");

  const tokens: Partial<TorTokens> = {
    KRO_UP: (kro?.uraian || "").toUpperCase(),
    RO_UP: (ro?.uraian || "").toUpperCase(),
    KOMP_UP: kompNama.toUpperCase(),
    KODE_FULL: komp?.kode || "",
    TAHUN: tahun,
    SATKER_UP: (satker?.nama_satker || "").toUpperCase(),
    ESELON1_UP: (t?.unit_eselon || unit?.nama || "").toUpperCase(),
    KL_UP: KL.toUpperCase(),
    TEMPAT_TAHUN: `${(satker?.lokus || "").toUpperCase() || "…"}, ${tahun}`,
    KL,
    UNIT_ESELON: t?.unit_eselon || unit?.nama || "",
    PROGRAM: program,
    SASARAN_PROG: t?.sasaran_program || "",
    IND_PROG: t?.indikator_kinerja_program || "",
    KEGIATAN: kegiatan,
    SASARAN_KEG: t?.sasaran_kegiatan || "",
    IND_KEG: t?.indikator_kinerja_kegiatan || "",
    KRO_ROW: kro ? `${kro.uraian} (${kro.kode})` : "",
    IND_KRO: t?.indikator_kro || "",
    RO_ROW: ro ? `${ro.uraian} (${ro.kode})` : "",
    IND_RO: t?.indikator_ro || "",
    VOL_RO: volRO(volRoNum),
    SATUAN_RO: ro?.satuan || komp?.satuan || "",
    KOMP: kompNama,
    VOL_KOMP: volKomp(Number(komp?.volume || 0), komp?.satuan || ""),
    TOTAL: fmtRupiah(totalKomp),
    TERBILANG: totalKomp ? titleCase(terbilang(Math.round(totalKomp))) : "",
    TEMPAT_TGL_TTD: fmtTempatTgl(pgr?.kota || satker?.lokus || "", pgr?.tanggal ?? null),
    TTD1_JABATAN: t1.jabatan || "",
    TTD1_NAMA: t1.nama || "",
    TTD1_NIP: t1.nip || "",
    TTD2_JABATAN: t2.jabatan || "",
    TTD2_NAMA: t2.nama || "",
    TTD2_NIP: t2.nip || "",
  };

  const filename = `TOR_${(komp?.kode || "komponen").replace(/[^\w.]+/g, "_")}.docx`;

  // Rincian RAB Bagian E: per sub-komponen (fallback: komponen itu sendiri).
  const programKode = u?.program?.kode_program || "";
  const baseKode = [programKode, komp?.kode].filter(Boolean).join(".");
  const subs = rows
    .filter((r) => r.level === "SUB_KOMPONEN" && r.parent_id === komponenId)
    .sort((a, b) => (a.kode || "").localeCompare(b.kode || ""));
  const rab: RabRow[] = subs.length
    ? subs.map((s) => ({
        kode: baseKode + (s.kode || ""),
        uraian: s.uraian || "",
        nominal: fmtRupiah(Number(s.jumlah || 0)),
      }))
    : komp
      ? [{ kode: baseKode, uraian: komp.uraian || "", nominal: fmtRupiah(totalKomp) }]
      : [];

  return { tokens, logo: satker?.logo_tor ?? null, filename, rab };
}
