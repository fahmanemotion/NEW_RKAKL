"use client";
import * as React from "react";
import { loadXLSXPlain } from "@/lib/xlsx-lazy";
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Card, Button, Select } from "@/components/ui";
import { fmtN } from "@/lib/constants";
import { parseKertasKerja, type KKImportResult } from "@/lib/kertas-kerja-import";
import { importKertasKerjaAction } from "@/app/(dashboard)/laporan/import-actions";

export interface ImportUsulan {
  id: string;
  tahun: number;
  tahap: string;
  status: string;
  satkerNama: string;
}

const LEVELS = ["PROGRAM", "KEGIATAN", "KRO", "RO", "KOMPONEN", "SUB_KOMPONEN", "AKUN", "DETAIL"];
const LABEL: Record<string, string> = {
  PROGRAM: "Program", KEGIATAN: "Kegiatan", KRO: "KRO", RO: "RO",
  KOMPONEN: "Komponen", SUB_KOMPONEN: "Sub Komponen", AKUN: "Akun", DETAIL: "Detail",
};

export function KertasKerjaImport({ usulanList }: { usulanList: ImportUsulan[] }) {
  const [target, setTarget] = React.useState("");
  const [parsed, setParsed] = React.useState<KKImportResult | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ inserted: number; total: number } | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file) return;
    setErr(null);
    setDone(null);
    setParsed(null);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await loadXLSXPlain();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets["DETAIL"] ?? wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
      const res = parseKertasKerja(aoa);
      if (res.nodes.length === 0) throw new Error("Tidak ada baris struktur yang dikenali. Pastikan format kertas kerja SAKTI.");
      setParsed(res);
      setFileName(file.name);
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  async function onImport() {
    if (!target || !parsed) return;
    const u = usulanList.find((x) => x.id === target);
    if (!confirm(
      `Ganti SELURUH rincian usulan ${u?.tahun} · ${u?.tahap} (${u?.satkerNama}) dengan kertas kerja ini?\n\n` +
      `Data lama akan DIHAPUS dan diganti dengan ${parsed.nodes.length} baris baru. Tindakan ini tidak bisa dibatalkan.`,
    )) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await importKertasKerjaAction(target, parsed.nodes, parsed.fileTotal);
      if (!res.ok) throw new Error(res.error || "Gagal mengimpor.");
      setDone({ inserted: res.inserted ?? 0, total: res.total ?? 0 });
      setParsed(null);
      setFileName("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="size-5 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Import Kertas Kerja</h2>
          <p className="text-xs text-muted-foreground">
            Unggah kertas kerja SAKTI (.xlsx) dan jadikan rincian usulan — lengkap sampai detail.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Usulan tujuan (akan diganti)</span>
          <Select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full">
            <option value="">— pilih usulan —</option>
            {usulanList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.tahun} · {u.tahap} · {u.satkerNama} ({u.status})
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">File kertas kerja</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="size-4" /> Pilih File
            </Button>
            <span className="truncate text-xs text-muted-foreground">{fileName || "belum ada file"}</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          </div>
        </label>
      </div>

      {parsed && (
        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <p className="mb-2 font-medium">
            Pratinjau: {parsed.nodes.length} baris · Total {fmtN(parsed.total)}
            {parsed.programTotals.length > 1 ? ` · ${parsed.programTotals.length} program` : ""}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {LEVELS.map((l) => (
              <span key={l}>{LABEL[l]}: <strong className="text-foreground">{parsed.counts[l] ?? 0}</strong></span>
            ))}
          </div>
          {(parsed.skipped.wrappedOperational > 0 || parsed.skipped.orphanDetails > 0) && (
            <p className="mt-2 flex items-start gap-1.5 text-sky-700 dark:text-sky-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {parsed.skipped.wrappedOperational > 0 && (
                  <>{parsed.skipped.wrappedOperational} baris operasional/gaji di luar Program dibungkus otomatis ke program sintetis <strong>"Belanja Pegawai &amp; Operasional"</strong> agar tidak hilang & tidak menggantung. Rincian akunnya bisa Anda sesuaikan setelah impor. </>
                )}
                {parsed.skipped.orphanDetails > 0 && (
                  <>{parsed.skipped.orphanDetails} detail tanpa induk akun dilewati. </>
                )}
              </span>
            </p>
          )}
          {parsed.fileTotal > 0 && Math.abs(parsed.total - parsed.fileTotal) >= 1 && (
            <p className="mt-2 flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Σ rincian <strong>Rp {fmtN(parsed.total)}</strong> berbeda dari total header satker di file <strong>Rp {fmtN(parsed.fileTotal)}</strong> (selisih Rp {fmtN(Math.abs(parsed.total - parsed.fileTotal))}).
                {" "}Ini karena di file ada akun yang rincian (kebutuhan)-nya melebihi nilai pagu akun — umumnya akun gaji/tunjangan pada file <em>Pagu Kebutuhan</em>, di mana sebagian item (mis. pakaian dinas) tercatat tanpa header akun tersendiri. Aplikasi menjumlahkan <strong>seluruh rincian</strong>, sehingga angkanya lebih lengkap daripada subtotal header file.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={onImport} disabled={!target || !parsed || busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? "Mengimpor… (mohon tunggu)" : "Ganti Rincian Usulan"}
        </Button>
        {parsed && !busy && (
          <span className="text-xs text-amber-600">
            Data lama pada usulan tujuan akan dihapus.
          </span>
        )}
      </div>

      {done && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>
            Berhasil — {done.inserted} baris diimpor, total {fmtN(done.total)}. Buka modul Penganggaran
            atau pilih usulan di bawah untuk melihat kertas kerja & RAB-nya.
          </span>
        </div>
      )}
      {err && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}
    </Card>
  );
}
