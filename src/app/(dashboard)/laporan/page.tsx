import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  LaporanClient,
  type LaporanUsulan,
} from "@/components/laporan/laporan-client";

export default async function LaporanPage() {
  await requireUser();
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data } = await sb
    .from("usulan_anggaran")
    .select(
      "id, tahun_anggaran, tahap_pagu, status, total_anggaran, satker:master_satker!satker_id(nama_satker, kode_satker)",
    )
    .order("tahun_anggaran", { ascending: false });

  const usulanList: LaporanUsulan[] = (data ?? []).map(
    (u: {
      id: string;
      tahun_anggaran: number;
      tahap_pagu: string | null;
      status: string;
      total_anggaran: number | null;
      satker: { nama_satker?: string; kode_satker?: string } | null;
    }) => ({
      id: u.id,
      tahun: u.tahun_anggaran,
      tahap: u.tahap_pagu ?? "KEBUTUHAN",
      status: u.status,
      satkerNama: u.satker?.nama_satker ?? "Satker",
      satkerKode: u.satker?.kode_satker ?? "",
    }),
  );

  return <LaporanClient usulanList={usulanList} />;
}
