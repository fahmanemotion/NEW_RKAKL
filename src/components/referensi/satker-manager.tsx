"use client";
import * as React from "react";
import { Loader2, Save, Building2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase";

interface SatkerRow {
  id: string;
  kode_satker: string;
  nama_satker: string;
  kppn: string | null;
  lokus: string | null;
}

/**
 * Ubah identitas satker yang sedang memakai aplikasi.
 * Karena seluruh tampilan (shell, monitoring, review, laporan, RAB) membaca
 * nama dari master_satker, perubahan di sini langsung berlaku di mana-mana
 * setelah halaman disegarkan.
 */
export function SatkerManager({ satkerId }: { satkerId: string | null }) {
  const router = useRouter();
  const [row, setRow] = React.useState<SatkerRow | null>(null);
  const [nama, setNama] = React.useState("");
  const [kode, setKode] = React.useState("");
  const [kppn, setKppn] = React.useState("");
  const [lokus, setLokus] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const sel = sb.from("master_satker").select("id, kode_satker, nama_satker, kppn, lokus");
        const { data, error } = satkerId
          ? await sel.eq("id", satkerId).maybeSingle()
          : await sel.order("nama_satker").limit(1).maybeSingle();
        if (error) throw error;
        if (!alive) return;
        if (data) {
          const r = data as SatkerRow;
          setRow(r);
          setNama(r.nama_satker ?? "");
          setKode(r.kode_satker ?? "");
          setKppn(r.kppn ?? "");
          setLokus(r.lokus ?? "");
        }
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [satkerId]);

  const touch = () => setSaved(false);

  async function save() {
    if (!row) return;
    if (!nama.trim()) { setErr("Nama satker wajib diisi."); return; }
    if (!kode.trim()) { setErr("Kode satker wajib diisi."); return; }
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const sb = createClient();
      const { error } = await sb
        .from("master_satker")
        .update({
          nama_satker: nama.trim(),
          kode_satker: kode.trim(),
          kppn: kppn.trim() || null,
          lokus: lokus.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw error;
      setSaved(true);
      router.refresh(); // segarkan nama satker di shell & halaman server lain
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="mx-auto size-5 animate-spin" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="rounded-md border border-amber-400/50 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
        Belum ada data satker yang dapat diubah. Pastikan akun Anda tertaut ke sebuah satker, atau tambahkan satker terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-border p-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Identitas Satker</h2>
            <p className="text-xs text-muted-foreground">
              Berlaku di seluruh aplikasi &amp; laporan RAB setelah disimpan.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Building2 className="size-3.5" /> Nama Satker
            </label>
            <Input value={nama} onChange={(e) => { setNama(e.target.value); touch(); }} placeholder="mis. Politeknik Ilmu Pelayaran Makassar" />
            <p className="mt-1 text-xs text-muted-foreground">
              Nama ini tampil di seluruh aplikasi (header, monitoring, review, laporan) dan pada RAB.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kode Satker</label>
              <Input value={kode} onChange={(e) => { setKode(e.target.value); touch(); }} placeholder="mis. 287494" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">KPPN</label>
              <Input value={kppn} onChange={(e) => { setKppn(e.target.value); touch(); }} placeholder="opsional" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokus</label>
            <Input value={lokus} onChange={(e) => { setLokus(e.target.value); touch(); }} placeholder="opsional" />
          </div>

          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm">
            <span className="text-xs text-muted-foreground">Pratinjau di RAB: </span>
            <span className="font-medium">{(kode || "—") + " — " + (nama || "—")}</span>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" /> Tersimpan. Nama satker diperbarui di seluruh aplikasi.
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
