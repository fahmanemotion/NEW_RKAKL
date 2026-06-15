import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { Card, Badge } from "@/components/ui";
import { fmtRp, STATUS_COLOR, type Status } from "@/lib/constants";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import { ChevronRight } from "lucide-react";
import { NewUsulanButton } from "@/components/penganggaran/new-usulan-dialog";

export default async function PenganggaranListPage() {
  await requireUser();
  // Client longgar: kolom tahap_pagu mungkin belum ada di tipe Database.
  const supabase = (await createServerSupabase()) as unknown as {
    from: (t: string) => any;
  };
  const { data: list } = await supabase
    .from("usulan_anggaran")
    .select(
      `id, tahun_anggaran, status, total_anggaran,
      program:master_program!program_id(kode_program, nama_program),
      kegiatan:master_kegiatan!kegiatan_id(kode_kegiatan, nama_kegiatan)`,
    )
    .order("created_at", { ascending: false });

  // Ambil tahap_pagu terpisah & aman (tetap jalan bila kolom belum ada di DB).
  const tahapMap: Record<string, string> = {};
  try {
    const { data: t } = await supabase
      .from("usulan_anggaran")
      .select("id, tahap_pagu");
    (t ?? []).forEach((r: any) => {
      tahapMap[r.id] = r.tahap_pagu;
    });
  } catch {
    /* kolom belum ada */
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Penganggaran</h1>
          <p className="text-sm text-muted-foreground">
            Daftar usulan anggaran satker Anda.
          </p>
        </div>
        <NewUsulanButton />
      </div>

      <Card className="divide-y divide-border">
        {(list ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Belum ada usulan. Klik{" "}
            <span className="font-medium text-primary">Buat Usulan</span> untuk
            memulai.
          </div>
        ) : (
          (list ?? []).map((u: any) => (
            <Link
              key={u.id}
              href={`/penganggaran/${u.id}`}
              className="flex items-center gap-4 p-4 hover:bg-accent"
            >
              <div className="flex-1">
                <div className="font-medium">
                  TA {u.tahun_anggaran} —{" "}
                  {TAHAP_LABEL[tahapMap[u.id] as TahapPagu] ?? "Usulan"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {u.kegiatan?.nama_kegiatan
                    ? `${u.kegiatan.kode_kegiatan ?? ""} ${u.kegiatan.nama_kegiatan}`
                    : (u.program?.nama_program ?? "")}
                </div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {fmtRp(u.total_anggaran)}
                </div>
              </div>
              <Badge className={STATUS_COLOR[u.status as Status]}>
                {u.status}
              </Badge>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}
