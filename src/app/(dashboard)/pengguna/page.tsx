import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { PenggunaClient } from "@/components/pengguna/pengguna-client";
import { PageSkeleton } from "@/components/ui/skeleton";

// Streaming (#2): skeleton konten tampil seketika; data ringan (roles/satker)
// mengalir masuk. Daftar pengguna sendiri diambil di sisi klien.
export default function PenggunaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PenggunaData />
    </Suspense>
  );
}

async function PenggunaData() {
  const user = await requireUser();
  const isAdmin = user.role === "Administrator";

  // Hanya baca data ringan (RLS biasa) di server. Daftar pengguna (yang butuh
  // service-role) diambil di sisi klien agar kegagalannya tidak merusak halaman.
  let roles: { id: string; nama: string; deskripsi: string | null }[] = [];
  let satkers: { id: string; nama_satker: string; kode_satker: string }[] = [];
  try {
    const sb = (await createServerSupabase()) as unknown as {
      from: (t: string) => any;
    };
    const [r, s] = await Promise.all([
      sb.from("roles").select("id, nama, deskripsi").order("nama"),
      sb
        .from("master_satker")
        .select("id, nama_satker, kode_satker")
        .order("nama_satker"),
    ]);
    roles = (r.data ?? []) as typeof roles;
    satkers = (s.data ?? []) as typeof satkers;
  } catch {
    // biarkan kosong; klien tetap dapat memuat ulang
  }

  return (
    <PenggunaClient
      isAdmin={isAdmin}
      currentUser={{
        id: user.id,
        nama: user.nama ?? "",
        email: user.email ?? "",
        role: user.role ?? "",
      }}
      roles={roles}
      satkers={satkers}
    />
  );
}
