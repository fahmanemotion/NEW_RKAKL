import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import { fetchStrukturServer } from "./data";
import {
  PenganggaranClient,
  type UsulanHeader,
} from "@/components/grid/penganggaran-client";

export default async function Page({
  params,
}: {
  params: Promise<{ usulanId: string }>;
}) {
  const { usulanId } = await params;
  const supabase = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data: u, error: uErr } = await supabase
    .from("usulan_anggaran")
    .select(
      `
      id, tahun_anggaran, status, kegiatan_id,
      satker:master_satker!satker_id ( kode_satker, nama_satker, kppn, lokus,
        unit:master_unit_eselon1!unit_id ( nama,
          kem:master_kementerian!kementerian_id ( nama,
            ba:master_ba!ba_id ( kode_ba, nama_ba ) ) ) ),
      program:master_program!program_id ( kode_program, nama_program ),
      kegiatan:master_kegiatan!kegiatan_id ( id, kode_kegiatan, nama_kegiatan )
    `,
    )
    .eq("id", usulanId)
    .single();

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

  let tahapPagu: string | undefined;
  {
    const { data: t } = await supabase
      .from("usulan_anggaran")
      .select("tahap_pagu")
      .eq("id", usulanId)
      .single();
    tahapPagu = (t as any)?.tahap_pagu ?? undefined;
  }

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

  const rows = await fetchStrukturServer(usulanId);

  return (
    <div className="space-y-4">
      <Link
        href="/penganggaran"
        className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/20"
      >
        <ArrowLeft className="size-4" /> Kembali ke daftar usulan
      </Link>
      <div>
        <h1 className="text-xl font-bold">Penganggaran — RUH Belanja</h1>
        <p className="text-sm text-muted-foreground">
          Penyusunan usulan hierarkis ala SAKTI. TA {header.tahun_anggaran} ·{" "}
          {header.satker}
        </p>
      </div>
      <PenganggaranClient header={header} initialRows={rows} />
    </div>
  );
}
