import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  LaporanClient,
  type LaporanUsulan,
} from "@/components/laporan/laporan-client";
import { KertasKerjaImport } from "@/components/laporan/kertas-kerja-import";
import { TorSection } from "@/components/laporan/tor-section";
import { PageSkeleton } from "@/components/ui/skeleton";

// Streaming (#2): skeleton konten tampil seketika; daftar usulan (untuk RAB/TOR/
// impor Kertas Kerja) mengalir masuk setelah query DB selesai.
export default function LaporanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LaporanData />
    </Suspense>
  );
}

async function LaporanData() {
  await requireUser();
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data } = await sb
    .from("usulan_anggaran")
    .select(
      "id, tahun_anggaran, tahap_pagu, status, total_anggaran, total_header, satker:master_satker!satker_id(nama_satker, kode_satker)",
    )
    .order("tahun_anggaran", { ascending: false });

  const usulanList: LaporanUsulan[] = (data ?? []).map(
    (u: {
      id: string;
      tahun_anggaran: number;
      tahap_pagu: string | null;
      status: string;
      total_anggaran: number | null;
      total_header: number | null;
      satker: { nama_satker?: string; kode_satker?: string } | null;
    }) => ({
      id: u.id,
      tahun: u.tahun_anggaran,
      tahap: u.tahap_pagu ?? "KEBUTUHAN",
      status: u.status,
      satkerNama: u.satker?.nama_satker ?? "Satker",
      satkerKode: u.satker?.kode_satker ?? "",
      total: u.total_anggaran ?? 0,
      totalHeader: u.total_header ?? null,
    }),
  );

  return (
    <div className="space-y-5">
      <LaporanClient usulanList={usulanList} />
      <TorSection
        usulanList={usulanList.map((u) => ({
          id: u.id,
          tahun: u.tahun,
          tahap: u.tahap,
          satkerNama: u.satkerNama,
        }))}
      />
      <KertasKerjaImport usulanList={usulanList} />
    </div>
  );
}
