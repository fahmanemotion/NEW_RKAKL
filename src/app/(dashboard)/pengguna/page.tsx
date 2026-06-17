import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { listUsersAction } from "./actions";
import { PenggunaClient } from "@/components/pengguna/pengguna-client";

export default async function PenggunaPage() {
  const user = await requireUser();
  const isAdmin = user.role === "Administrator";

  const sb = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };

  const [{ data: roles }, { data: satkers }] = await Promise.all([
    sb.from("roles").select("id, nama, deskripsi").order("nama"),
    sb
      .from("master_satker")
      .select("id, nama_satker, kode_satker")
      .order("nama_satker"),
  ]);

  const initialUsers = isAdmin ? await listUsersAction() : [];

  return (
    <PenggunaClient
      isAdmin={isAdmin}
      currentUser={{
        id: user.id,
        nama: user.nama ?? "",
        email: user.email ?? "",
        role: user.role ?? "",
      }}
      roles={(roles ?? []) as { id: string; nama: string; deskripsi: string | null }[]}
      satkers={
        (satkers ?? []) as {
          id: string;
          nama_satker: string;
          kode_satker: string;
        }[]
      }
      initialUsers={initialUsers}
    />
  );
}
