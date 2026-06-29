"use client";
import * as React from "react";
import { Loader2, Save, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Pengaturan tempat (kota) & tanggal yang dicetak pada laporan RAB (satu baris, id=1). */
export function TempatTanggalManager() {
  const [kota, setKota] = React.useState("");
  const [tanggal, setTanggal] = React.useState(""); // ISO yyyy-mm-dd, "" = otomatis (hari ini)
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const { data, error } = await sb
          .from("pengaturan_rab")
          .select("kota, tanggal")
          .eq("id", 1)
          .maybeSingle();
        if (error) throw error;
        if (!alive) return;
        setKota(data?.kota ?? "Makassar");
        setTanggal(data?.tanggal ?? "");
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function save() {
    if (!kota.trim()) { setErr("Tempat (kota) wajib diisi."); return; }
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const sb = createClient();
      const { error } = await sb.from("pengaturan_rab").upsert({
        id: 1,
        kota: kota.trim(),
        tanggal: tanggal || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaved(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const preview = (() => {
    const d = tanggal ? new Date(tanggal + "T00:00:00") : new Date();
    return `${kota || "—"}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  })();

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="mx-auto size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-border p-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Tempat &amp; Tanggal RAB</h2>
            <p className="text-xs text-muted-foreground">
              Dicetak pada bagian penutup laporan RAB.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5" /> Tempat (Kota)
            </label>
            <Input
              value={kota}
              onChange={(e) => { setKota(e.target.value); setSaved(false); }}
              placeholder="mis. Makassar"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Calendar className="size-3.5" /> Tanggal
            </label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => { setTanggal(e.target.value); setSaved(false); }}
              className="w-auto"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Kosongkan untuk memakai tanggal hari ini secara otomatis saat RAB dibuat.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm">
            <span className="text-xs text-muted-foreground">Pratinjau pada RAB: </span>
            <span className="font-medium">{preview}</span>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> Tersimpan. Akan dipakai pada RAB berikutnya.
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={busy}>
              {busy ? <><Loader2 className="size-4 animate-spin" /> Menyimpan…</> : <><Save className="size-4" /> Simpan</>}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
