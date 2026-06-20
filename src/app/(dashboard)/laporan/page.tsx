import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  LaporanClient,
  type LaporanUsulan,
} from "@/components/laporan/laporan-client";
import { KertasKerjaImport } from "@/components/laporan/kertas-kerja-import";

export default async function LaporanPage() {
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
      <KertasKerjaImport usulanList={usulanList} />
      <LaporanClient usulanList={usulanList} />
    </div>
  );
}
