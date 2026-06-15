import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import {
  Wallet,
  Building,
  Briefcase,
  Users2,
  Package,
  Hammer,
} from "lucide-react";
import { fmtRp } from "@/lib/constants";

// Dashboard ringkas (MODUL 1 versi awal). Angka realtime & tabel usulan
// menyusul pada fase #4 — di sini placeholder agar shell utuh.
const CARDS = [
  {
    label: "Total Anggaran",
    value: 0,
    pct: "—",
    icon: Wallet,
    color: "text-blue-600",
  },
  {
    label: "Belanja Operasional",
    value: 0,
    pct: "—",
    icon: Building,
    color: "text-sky-600",
  },
  {
    label: "Belanja Non Operasional",
    value: 0,
    pct: "—",
    icon: Briefcase,
    color: "text-indigo-600",
  },
  {
    label: "Belanja Pegawai",
    value: 0,
    pct: "—",
    icon: Users2,
    color: "text-cyan-600",
  },
  {
    label: "Belanja Barang",
    value: 0,
    pct: "—",
    icon: Package,
    color: "text-emerald-600",
  },
  {
    label: "Belanja Modal",
    value: 0,
    pct: "—",
    icon: Hammer,
    color: "text-amber-600",
  },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang, {user?.nama}. Ringkasan kondisi anggaran.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {fmtRp(c.value)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trend bulanan: {c.pct}
                  </p>
                </div>
                <Icon className={`size-8 ${c.color}`} />
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="p-5">
        <h2 className="mb-1 text-base font-semibold">Daftar Usulan Kegiatan</h2>
        <p className="text-sm text-muted-foreground">
          Tabel usulan (search/filter/sort + realtime) dibangun pada fase
          berikutnya. Mulai menyusun di menu{" "}
          <span className="font-medium text-primary">Penganggaran</span>.
        </p>
      </Card>
    </div>
  );
}
