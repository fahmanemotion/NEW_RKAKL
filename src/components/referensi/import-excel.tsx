'use client';
import * as React from 'react';
import type * as XLSXTypes from 'xlsx';
import { loadXLSXPlain } from '@/lib/xlsx-lazy';
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button, Select } from '@/components/ui';
import { mapImportRows, type MasterDef, type ParsedRow } from '@/lib/referensi';
import { bulkImport } from '@/lib/referensi-api';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  def: MasterDef;
  onClose: () => void;
  onDone: () => void;
}

type Phase = 'pick' | 'preview' | 'saving' | 'done';

export function ImportExcel({ open, def, onClose, onDone }: Props) {
  const [phase, setPhase] = React.useState<Phase>('pick');
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [fileName, setFileName] = React.useState('');
  const [sheetNames, setSheetNames] = React.useState<string[]>([]);
  const [activeSheet, setActiveSheet] = React.useState('');
  const wbRef = React.useRef<XLSXTypes.WorkBook | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ inserted: number; skipped: number; failed: number; errors: string[] } | null>(null);

  React.useEffect(() => {
    if (open) { setPhase('pick'); setRows([]); setFileName(''); setSheetNames([]); setActiveSheet(''); wbRef.current = null; setErr(null); setResult(null); }
  }, [open, def.table]);

  async function parseSheet(name: string) {
    const wb = wbRef.current;
    if (!wb) return;
    const XLSX = await loadXLSXPlain();
    const ws = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' });
    const { rows: parsed } = mapImportRows(def, raw as unknown[][]);
    if (parsed.length === 0) { setErr(`Sheet "${name}" tidak berisi baris data sesuai format ${def.label}.`); setRows([]); }
    else { setErr(null); setRows(parsed); }
    setActiveSheet(name);
    setPhase('preview');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setErr(null);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await loadXLSXPlain();
      const wb = XLSX.read(buf, { type: 'array' });
      wbRef.current = wb;
      setSheetNames(wb.SheetNames);
      // Auto-pilih sheet yang namanya cocok dengan label master, jika tidak ada → sheet pertama.
      const match = wb.SheetNames.find((n) => n.toLowerCase() === def.label.toLowerCase())
        ?? wb.SheetNames.find((n) => n.toLowerCase().includes(def.label.toLowerCase()))
        ?? wb.SheetNames[0];
      await parseSheet(match);
    } catch (e) {
      setErr('Gagal membaca file: ' + (e as Error).message);
    }
  }

  async function save() {
    setPhase('saving'); setErr(null);
    try {
      const res = await bulkImport(def, rows);
      setResult(res);
      setPhase('done');
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setPhase('preview');
    }
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  // Urutan kolom Excel yang diharapkan (untuk petunjuk)
  const expected = def.importCols.join('  |  ');

  return (
    <Modal
      open={open} onClose={onClose} title={`Import Excel — ${def.label}`} className="max-w-4xl"
      footer={
        phase === 'preview' ? (
          <>
            <Button variant="outline" onClick={() => setPhase('pick')}>Ganti File</Button>
            <Button onClick={save} disabled={validCount === 0}>Simpan {validCount} baris</Button>
          </>
        ) : phase === 'done' ? (
          <Button onClick={onClose}>Selesai</Button>
        ) : (
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        )
      }
    >
      {phase === 'pick' && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/40">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-6" />
            </span>
            <p className="mb-3 text-sm text-muted-foreground">Pilih file Excel (.xlsx / .xls) atau CSV</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Upload className="size-4" /> Pilih File
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
            </label>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs">
            <p className="font-medium">Urutan kolom yang diharapkan (baris pertama boleh header, akan dilewati):</p>
            <p className="mt-1 font-mono text-muted-foreground">{expected}</p>
            {def.parent && <p className="mt-1 text-muted-foreground">Kolom pertama = <strong>kode {def.parent.label}</strong> (induk) yang harus sudah ada di master.</p>}
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">{fileName}</span>
            {sheetNames.length > 1 && (
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Sheet:</span>
                <Select value={activeSheet} onChange={(e) => parseSheet(e.target.value)} className="h-8 w-auto">
                  {sheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </label>
            )}
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-4" /> {validCount} valid</span>
            {invalidCount > 0 && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="size-4" /> {invalidCount} dilewati</span>}
          </div>
          <div className="max-h-[46vh] overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted">
                  <th className="px-2 py-1.5 font-semibold">#</th>
                  {def.parent && <th className="px-2 py-1.5 font-semibold">Induk ({def.parent.label})</th>}
                  <th className="px-2 py-1.5 font-semibold">Kode</th>
                  <th className="px-2 py-1.5 font-semibold">Nama</th>
                  {def.extraFields?.map((f) => <th key={f.key} className="px-2 py-1.5 font-semibold">{f.label}</th>)}
                  <th className="px-2 py-1.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={cn('border-t border-border', !r.valid && 'bg-amber-50 dark:bg-amber-950/20')}>
                    <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                    {def.parent && <td className="px-2 py-1 font-mono">{r.parentCode}</td>}
                    <td className="px-2 py-1 font-mono">{r.values[def.kodeCol]}</td>
                    <td className="px-2 py-1">{r.values[def.namaCol]}</td>
                    {def.extraFields?.map((f) => <td key={f.key} className="px-2 py-1">{r.values[f.key]}</td>)}
                    <td className="px-2 py-1">{r.valid ? <span className="text-emerald-600 dark:text-emerald-400">OK</span> : <span className="text-amber-600 dark:text-amber-400">{r.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}

      {phase === 'saving' && (
        <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 size-6 animate-spin" /> Menyimpan ke database…</div>
      )}

      {phase === 'done' && result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-5" /> Import selesai.</div>
          <ul className="text-sm">
            <li><strong>{result.inserted}</strong> baris ditambahkan (duplikat diabaikan otomatis).</li>
            {result.skipped > 0 && <li>{result.skipped} baris dilewati (tidak valid).</li>}
            {result.failed > 0 && <li className="text-amber-600 dark:text-amber-400">{result.failed} baris gagal.</li>}
          </ul>
          {result.errors.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg border border-border bg-muted/50 p-2 text-xs text-muted-foreground">
              {result.errors.slice(0, 50).map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
