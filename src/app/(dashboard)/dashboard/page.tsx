import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  DashboardClient,
  type UsulanRingkas,
} from "@/components/dashboard/dashboard-client";
import { PageSkeleton } from "@/components/ui/skeleton";

// Dashboard — pemilih Tahun & Tahap Pagu + tabel "Daftar Usulan Kegiatan".
// Streaming (#2): skeleton konten tampil seketika; daftar usulan mengalir masuk.
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

async function DashboardData() {
  const user = await requireUser();
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data } = await sb
    .from("usulan_anggaran")
    .select("id, tahun_anggaran, tahap_pagu, status, total_anggaran")
    .order("tahun_anggaran", { ascending: false });

  const usulanList: UsulanRingkas[] = (data ?? []).map(
    (u: {
      id: string;
      tahun_anggaran: number;
      tahap_pagu: string | null;
      status: string;
      total_anggaran: number | null;
    }) => ({
      id: u.id,
      tahun: u.tahun_anggaran,
      tahap: u.tahap_pagu ?? "KEBUTUHAN",
      status: u.status,
      total: Number(u.total_anggaran) || 0,
    }),
  );

  return (
    <DashboardClient
      usulanList={usulanList}
      satkerNama={user.satker_nama ?? "Satker"}
    />
  );
}
