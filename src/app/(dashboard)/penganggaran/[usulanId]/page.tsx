import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth";
import { fetchStrukturServer } from "./data";
import {
  PenganggaranClient,
  type UsulanHeader,
} from "@/components/grid/penganggaran-client";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";

export default async function Page({
  params,
}: {
  params: Promise<{ usulanId: string }>;
}) {
  const { usulanId } = await params;
  const supabase = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  // GET paralel: header usulan + tahap pagu + seluruh struktur dijalankan
  // BERSAMAAN (ketiganya independen, hanya perlu usulanId) agar memangkas
  // round-trip beruntun → membuka usulan terasa jauh lebih cepat.
  // GET paralel: header usulan (termasuk tahap_pagu) + seluruh struktur
  // dijalankan BERSAMAAN. tahap_pagu digabung ke query utama (tidak lagi query
  // terpisah ke baris yang sama) → satu round-trip lebih sedikit saat membuka usulan.
  const [uRes, rows] = await Promise.all([
    supabase
      .from("usulan_anggaran")
      .select(
        `
      id, tahun_anggaran, status, kegiatan_id, tahap_pagu,
      satker:master_satker!satker_id ( kode_satker, nama_satker, kppn, lokus,
        unit:master_unit_eselon1!unit_id ( nama,
          kem:master_kementerian!kementerian_id ( nama,
            ba:master_ba!ba_id ( kode_ba, nama_ba ) ) ) ),
      program:master_program!program_id ( kode_program, nama_program ),
      kegiatan:master_kegiatan!kegiatan_id ( id, kode_kegiatan, nama_kegiatan )
    `,
      )
      .eq("id", usulanId)
      .single(),
    fetchStrukturServer(usulanId),
  ]);
  const { data: u, error: uErr } = uRes;

  if (uErr) {
    return (
      <div className="space-y-4">
        <Link
          href="/penganggaran"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/20"
        >
          <ArrowLeft className="size-4" /> Kembali ke daftar usulan
        </Link>
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Gagal memuat usulan.</p>
          <p className="mt-1">{uErr.message ?? String(uErr)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Jika pesan menyebut kolom <code>tahap_pagu</code> tidak ditemukan,
            jalankan migrasi di Supabase SQL Editor.
          </p>
        </div>
      </div>
    );
  }

  if (!u) notFound();

  const tahapPagu: string | undefined =
    (u as { tahap_pagu?: string } | null)?.tahap_pagu ?? undefined;

  const one = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  const satker: any = one((u as any).satker);
  const unit: any = one(satker?.unit);
  const kem: any = one(unit?.kem);
  const ba: any = one(kem?.ba);
  const program: any = one((u as any).program);
  const kegiatan: any = one((u as any).kegiatan);

  const header: UsulanHeader = {
    id: u.id as string,
    tahun_anggaran: u.tahun_anggaran as number,
    status: u.status as string,
    tahap_pagu: tahapPagu,
    ba: ba ? `${ba.kode_ba} — ${ba.nama_ba}` : "022",
    kementerian: kem?.nama ?? "—",
    unit: unit?.nama ?? "—",
    satker: satker ? `${satker.kode_satker} — ${satker.nama_satker}` : "—",
    program_kode: program
      ? `${ba?.kode_ba ?? "022"}.${program.kode_program}`
      : "",
    program_nama: program?.nama_program ?? "",
    kegiatan_id: (u.kegiatan_id as string) ?? kegiatan?.id ?? null,
    kegiatan_kode: kegiatan?.kode_kegiatan ?? "",
    kegiatan_nama: kegiatan?.nama_kegiatan ?? "",
    kppn: satker?.kppn ? `${satker.kppn}-Makassar I` : "054-Makassar I",
    lokus: satker?.lokus ?? "19.51-KOTA MAKASSAR",
  };

  // rows sudah diambil paralel di atas. getCurrentUser di-cache() (layout sudah
  // memanggilnya) → praktis tanpa round-trip tambahan.
  const cu = await getCurrentUser();
  const me = { id: cu?.id ?? "", nama: cu?.nama ?? null };

  return (
    <div className="space-y-2">
      {/* Satu baris: tombol kembali (kiri) + judul RUH Belanja & tahap pagu (kanan, di bawah toggle tema) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/penganggaran"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/20"
        >
          <ArrowLeft className="size-4" /> Kembali ke daftar usulan
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold leading-none">RUH Belanja</h1>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
            {header.tahap_pagu
              ? (TAHAP_LABEL[header.tahap_pagu as TahapPagu] ?? header.tahap_pagu)
              : "—"}
          </span>
        </div>
      </div>
      <PenganggaranClient header={header} initialRows={rows} me={me} />
    </div>
  );
}
