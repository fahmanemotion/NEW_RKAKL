import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  MonitoringClient,
  type MonUsulanInput,
} from "@/components/monitoring/monitoring-client";
import { PageSkeleton } from "@/components/ui/skeleton";

// Streaming (#2): skeleton konten tampil seketika; data monitoring mengalir masuk.
export default function MonitoringPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MonitoringData />
    </Suspense>
  );
}

async function MonitoringData() {
  await requireUser();
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data } = await sb
    .from("usulan_anggaran")
    .select(
      "id, tahun_anggaran, tahap_pagu, status, total_anggaran, satker:master_satker!satker_id(id, nama_satker, kode_satker)",
    )
    .order("tahun_anggaran", { ascending: false });

  const usulan: MonUsulanInput[] = (data ?? []).map(
    (u: {
      id: string;
      tahun_anggaran: number;
      tahap_pagu: string | null;
      status: string;
      total_anggaran: number | null;
      satker: {
        id?: string;
        nama_satker?: string;
        kode_satker?: string;
      } | null;
    }) => ({
      id: u.id,
      tahun: u.tahun_anggaran,
      tahap: u.tahap_pagu ?? "KEBUTUHAN",
      status: u.status,
      total: u.total_anggaran ?? 0,
      satkerId: u.satker?.id ?? "?",
      satkerNama: u.satker?.nama_satker ?? "Satker",
      satkerKode: u.satker?.kode_satker ?? "",
    }),
  );

  return <MonitoringClient usulan={usulan} />;
}
