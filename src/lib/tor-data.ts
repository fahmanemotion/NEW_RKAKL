// SIPPT — penyiapan data TOR per komponen (untuk generator hal. 1-2).
import { createClient } from "@/lib/supabase";
import { terbilang } from "./rab-data";
import type { TorTokens } from "./tor-generate";

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

interface StrukturRow {
  id: string; parent_id: string | null; level: string;
  kode: string | null; uraian: string | null; volume: number | null; satuan: string | null;
}
interface TorKodeRow {
  komponen: string; unit_eselon: string | null;
  sasaran_program: string | null; indikator_kinerja_program: string | null;
  sasaran_kegiatan: string | null; indikator_kinerja_kegiatan: string | null;
}

export interface TorKomponenItem {
  id: string;
  kode: string;
  uraian: string;
  roUraian: string;
  kroUraian: string;
}

async function loadContext(usulanId: string) {
  const [{ data: u }, { data: rows }, { data: tor }] = await Promise.all([
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
      .select("id, parent_id, level, kode, uraian, volume, satuan")
      .eq("usulan_id", usulanId),
    sb().from("master_tor_kode").select(
      "komponen, unit_eselon, sasaran_program, indikator_kinerja_program, sasaran_kegiatan, indikator_kinerja_kegiatan",
    ),
  ]);
  return {
    u,
    rows: (rows ?? []) as StrukturRow[],
    tor: (tor ?? []) as TorKodeRow[],
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
        roUraian: ro?.uraian ?? "",
        kroUraian: kro?.uraian ?? "",
      };
    })
    .sort((a, b) => a.kode.localeCompare(b.kode));
}

/** Bangun token + logo + nama file untuk satu komponen. */
export async function buildTorForKomponen(
  usulanId: string,
  komponenId: string,
): Promise<{ tokens: Partial<TorTokens>; logo: string | null; filename: string }> {
  const { u, rows, tor } = await loadContext(usulanId);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const komp = byId.get(komponenId);
  const ro = komp?.parent_id ? byId.get(komp.parent_id) : undefined;
  const kro = ro?.parent_id ? byId.get(ro.parent_id) : undefined;

  // Volume RO = Σ volume komponen di bawah RO (dari kertas kerja).
  let volRoNum = 0;
  if (ro) for (const r of rows) if (r.level === "KOMPONEN" && r.parent_id === ro.id) volRoNum += Number(r.volume || 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satker: any = u?.satker ?? {};
  const unit = satker?.unit ?? {};
  const kem = unit?.kem ?? {};
  const kompNama = komp?.uraian ?? "";
  const t = tor.find(
    (x) => String(x.komponen).trim().toLowerCase() === kompNama.trim().toLowerCase(),
  );

  const KL = kem?.nama || "Kementerian";
  const program = u?.program ? `${u.program.nama_program} (${u.program.kode_program})` : "";
  const kegiatan = u?.kegiatan ? `${u.kegiatan.nama_kegiatan} (${u.kegiatan.kode_kegiatan})` : "";
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
    IND_KRO: "", // belum tersedia di KODE TOR
    RO_ROW: ro ? `${ro.uraian} (${ro.kode})` : "",
    IND_RO: "", // belum tersedia di KODE TOR
    VOL_RO: volRO(volRoNum),
    SATUAN_RO: ro?.satuan || komp?.satuan || "",
    KOMP: kompNama,
    VOL_KOMP: volKomp(Number(komp?.volume || 0), komp?.satuan || ""),
  };

  const filename = `TOR_${(komp?.kode || "komponen").replace(/[^\w.]+/g, "_")}.docx`;
  return { tokens, logo: satker?.logo_tor ?? null, filename };
}
