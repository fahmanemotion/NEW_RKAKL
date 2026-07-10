import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  ReviewClient,
  type ReviewUsulan,
} from "@/components/review/review-client";
import { PageSkeleton } from "@/components/ui/skeleton";

// Streaming (#2): halaman langsung menampilkan skeleton berbentuk konten
// (hero + filter + tabel) sementara daftar usulan diambil dari database.
export default function ReviewPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReviewData />
    </Suspense>
  );
}

async function ReviewData() {
  await requireUser();
  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const { data } = await sb
    .from("usulan_anggaran")
    .select(
      "id, tahun_anggaran, tahap_pagu, status, satker:master_satker!satker_id(nama_satker, kode_satker)",
    )
    .order("tahun_anggaran", { ascending: false });

  const usulanList: ReviewUsulan[] = (data ?? []).map(
    (u: {
      id: string;
      tahun_anggaran: number;
      tahap_pagu: string | null;
      status: string;
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

  return <ReviewClient usulanList={usulanList} />;
}
