"use client";
import * as React from "react";
import {
  Database, Download, Upload, Loader2, CheckCircle2, AlertTriangle,
  Archive, ArchiveRestore, FileArchive,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  isValidBackup, backupFileName, totalRows, BACKUP_TABLES,
  type BackupFile,
} from "@/lib/backup";
import {
  exportBackupAction, importBackupAction,
} from "@/app/(dashboard)/referensi/backup-actions";

const LABELS: Record<string, string> = {
  master_ba: "BA", master_kementerian: "Kementerian", master_unit_eselon1: "Unit Eselon I",
  master_satker: "Satker", master_program: "Program", master_kegiatan: "Kegiatan",
  master_kro: "KRO", master_ro: "RO", master_komponen: "Komponen",
  master_sub_komponen: "Sub Komponen", master_akun: "Akun", master_tor_kode: "KODE TOR",
  master_penandatangan: "Penandatangan", pengaturan_rab: "Pengaturan RAB",
  usulan_anggaran: "Usulan Anggaran", usulan_struktur: "Rincian (struktur)",
  tor_narasi: "TOR — Narasi", tor_tahapan: "TOR — Tahapan", tor_komponen_opsi: "TOR — Opsi",
  tor_isi_template: "TOR — Template", dokumen_kertas_kerja: "Dokumen KK",
};

async function pizzip() {
  return (await import("pizzip")).default;
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function CountGrid({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      {BACKUP_TABLES.filter((t) => (counts[t] ?? 0) > 0).map((t) => (
        <div key={t} className="flex justify-between gap-2">
          <span className="truncate text-muted-foreground">{LABELS[t] ?? t}</span>
          <span className="shrink-0 font-medium tabular-nums">{counts[t]}</span>
        </div>
      ))}
    </div>
  );
}

export function BackupManager() {
  // Export
  const [exporting, setExporting] = React.useState(false);
  const [exportErr, setExportErr] = React.useState<string | null>(null);
  const [exported, setExported] = React.useState<{ counts: Record<string, number>; total: number } | null>(null);

  // Import
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [staged, setStaged] = React.useState<BackupFile | null>(null);
  const [stagedName, setStagedName] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [importErr, setImportErr] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ restored: Record<string, number>; skipped: string[]; errors: string[] } | null>(null);

  async function onExport() {
    setExporting(true);
    setExportErr(null);
    setExported(null);
    try {
      const res = await exportBackupAction();
      if (!res.ok || !res.backup) throw new Error(res.error || "Gagal membuat backup.");
      const backup = res.backup;
      const PizZip = await pizzip();
      const zip = new PizZip();
      zip.file("backup.json", JSON.stringify(backup));
      zip.file(
        "README.txt",
        `Backup ${backup.manifest.app} v${backup.manifest.version}\n` +
          `Dibuat: ${backup.manifest.createdAt}\n` +
          `Total baris: ${totalRows(backup.manifest.counts)}\n\n` +
          `Unggah ulang berkas ZIP ini di menu Referensi → Backup untuk memulihkan seluruh data di server baru.`,
      );
      const blob = zip.generate({ type: "blob", compression: "DEFLATE" }) as Blob;
      downloadBlob(blob, backupFileName());
      setExported({ counts: backup.manifest.counts, total: totalRows(backup.manifest.counts) });
    } catch (e) {
      setExportErr((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file) return;
    setImportErr(null);
    setResult(null);
    setStaged(null);
    try {
      const PizZip = await pizzip();
      const zip = new PizZip(await file.arrayBuffer());
      const entry = zip.file("backup.json");
      if (!entry) throw new Error("ZIP tidak berisi backup.json — bukan berkas backup SIRANGGA.");
      const parsed = JSON.parse(entry.asText());
      if (!isValidBackup(parsed)) throw new Error("Isi backup tidak sah / bukan backup SIRANGGA.");
      setStaged(parsed);
      setStagedName(file.name);
    } catch (e) {
      setImportErr((e as Error).message);
    }
  }

  async function onImport() {
    if (!staged) return;
    if (
      !confirm(
        `Pulihkan SELURUH data dari backup ini?\n\n` +
          `${totalRows(staged.manifest.counts)} baris akan disalin/diperbarui ke database ini ` +
          `(dicocokkan per ID). Sebaiknya dijalankan pada database BARU yang masih kosong.\n\n` +
          `Lanjutkan?`,
      )
    )
      return;
    setImporting(true);
    setImportErr(null);
    setResult(null);
    try {
      const res = await importBackupAction(staged);
      if (!res.ok && res.error) throw new Error(res.error);
      setResult({ restored: res.restored ?? {}, skipped: res.skipped ?? [], errors: res.errors ?? [] });
      if ((res.errors ?? []).length === 0) setStaged(null);
    } catch (e) {
      setImportErr((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── BACKUP (ekspor) ─────────────────────────────────────────────── */}
      <Card className="space-y-3 border-t-4 border-t-sky-400 p-4 dark:border-t-sky-500">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300">
            <Archive className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Buat Backup</h2>
            <p className="text-xs text-muted-foreground">
              Simpan SELURUH data — referensi kode, input anggaran, TOR, serta dasar Kertas Kerja &amp; RAB — ke satu berkas ZIP.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exporting ? "Menyiapkan…" : "Buat & Unduh Backup (.zip)"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Kertas Kerja &amp; RAB tak disimpan terpisah — keduanya diturunkan dari rincian struktur.
          </span>
        </div>
        {exportErr && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span>{exportErr}</span>
          </div>
        )}
        {exported && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="mb-2 flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" /> Backup terunduh — {exported.total} baris.
            </p>
            <CountGrid counts={exported.counts} />
          </div>
        )}
      </Card>

      {/* ── IMPORT (pulihkan) ───────────────────────────────────────────── */}
      <Card className="space-y-3 border-t-4 border-t-amber-400 p-4 dark:border-t-amber-500">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
            <ArchiveRestore className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Pulihkan dari Backup</h2>
            <p className="text-xs text-muted-foreground">
              Unggah berkas ZIP backup untuk menyalin seluruh data ke aplikasi/server ini. Ideal untuk pindah server.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <FileArchive className="size-4" /> Pilih File ZIP
          </Button>
          <span className="truncate text-xs text-muted-foreground">{stagedName || "belum ada file"}</span>
          <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={onFile} />
        </div>

        {importErr && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span>{importErr}</span>
          </div>
        )}

        {staged && (
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium">
              Pratinjau backup ({new Date(staged.manifest.createdAt).toLocaleString("id-ID")}) —{" "}
              {totalRows(staged.manifest.counts)} baris:
            </p>
            <CountGrid counts={staged.manifest.counts} />
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={onImport} disabled={importing}>
                {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {importing ? "Memulihkan…" : "Pulihkan Sekarang"}
              </Button>
              <span className="text-xs text-amber-600">
                Data yang berpadanan (ID sama) akan ditimpa.
              </span>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="mb-2 flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" /> Pemulihan selesai —{" "}
              {totalRows(result.restored)} baris disalin.
            </p>
            <CountGrid counts={result.restored} />
            {result.errors.length > 0 && (
              <div className="mt-2 rounded border border-amber-400/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="font-medium">⚠ Sebagian tabel gagal:</p>
                <ul className="mt-1 list-inside list-disc break-words">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Database className="mt-0.5 size-3.5 shrink-0" />
          Sebaiknya dipulihkan ke database BARU (skema sudah dibuat oleh migrasi, tapi belum berisi data) agar hasilnya salinan bersih.
        </p>
      </Card>
    </div>
  );
}
