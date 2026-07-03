"use client";
import * as React from "react";
import { Loader2, Save, Building2, CheckCircle2, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase";
import { revalidateSatkerLogoAction } from "@/app/(dashboard)/referensi/logo-actions";

interface SatkerRow {
  id: string;
  kode_satker: string;
  nama_satker: string;
  kppn: string | null;
  lokus: string | null;
  logo: string | null;
  logo_tor: string | null;
}

/** Baca file gambar → perkecil (maks 256px) → data URL PNG agar ringan disimpan. */
async function fileToLogoDataUrl(file: File, MAX = 256): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("Gagal membaca file."));
    fr.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const i = new window.Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("File bukan gambar yang valid."));
    i.src = dataUrl;
  });
  const MAX_SIZE = MAX;
  let w = img.width;
  let h = img.height;
  if (w > MAX_SIZE || h > MAX_SIZE) {
    const r = Math.min(MAX_SIZE / w, MAX_SIZE / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
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
  const [logo, setLogo] = React.useState<string | null>(null);
  const [logoTor, setLogoTor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = createClient();
        const sel = sb.from("master_satker").select("id, kode_satker, nama_satker, kppn, lokus, logo, logo_tor");
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
          setLogo(r.logo ?? null);
          setLogoTor(r.logo_tor ?? null);
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

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // izinkan memilih file yang sama lagi
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("File harus berupa gambar."); return; }
    if (file.size > 3 * 1024 * 1024) { setErr("Ukuran gambar maksimal 3 MB."); return; }
    try {
      const url = await fileToLogoDataUrl(file);
      setLogo(url);
      setErr(null);
      touch();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  async function onPickLogoTor(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("File harus berupa gambar."); return; }
    if (file.size > 3 * 1024 * 1024) { setErr("Ukuran gambar maksimal 3 MB."); return; }
    try {
      const url = await fileToLogoDataUrl(file, 420); // resolusi lebih besar untuk cetak TOR
      setLogoTor(url);
      setErr(null);
      touch();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

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
          logo: logo,
          logo_tor: logoTor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw error;
      setSaved(true);
      // Buang cache logo (server) agar logo baru langsung tampil di topnav,
      // lalu segarkan render server.
      try { await revalidateSatkerLogoAction(row.id); } catch { /* non-blocking */ }
      router.refresh(); // segarkan nama & logo satker di shell & halaman server lain
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
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="size-3.5" /> Logo Satker
            </label>
            <div className="flex items-center gap-3">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Logo satker" className="size-full object-contain" />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent">
                    <Upload className="size-4" /> {logo ? "Ganti Logo" : "Unggah Logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
                  </label>
                  {logo && (
                    <Button variant="outline" size="sm" onClick={() => { setLogo(null); touch(); }}>
                      <Trash2 className="size-4" /> Hapus
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  PNG/JPG. Tampil di pojok kiri atas aplikasi. Otomatis diperkecil &amp; disimpan saat menekan Simpan.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ImageIcon className="size-3.5" /> Logo TOR
            </label>
            <div className="flex items-center gap-3">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {logoTor ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoTor} alt="Logo TOR" className="size-full object-contain" />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent">
                    <Upload className="size-4" /> {logoTor ? "Ganti Logo TOR" : "Unggah Logo TOR"}
                    <input type="file" accept="image/*" className="hidden" onChange={onPickLogoTor} />
                  </label>
                  {logoTor && (
                    <Button variant="outline" size="sm" onClick={() => { setLogoTor(null); touch(); }}>
                      <Trash2 className="size-4" /> Hapus
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Logo instansi yang dipasang di <strong>sampul dokumen TOR/KAK</strong>. PNG/JPG, otomatis diperkecil saat disimpan.
                </p>
              </div>
            </div>
          </div>

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
