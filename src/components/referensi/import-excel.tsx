'use client';
import * as React from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle2, AlertTriangle, Loader2, Download } from 'lucide-react';
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
  const wbRef = React.useRef<XLSX.WorkBook | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ inserted: number; skipped: number; failed: number; errors: string[] } | null>(null);

  React.useEffect(() => {
    if (open) { setPhase('pick'); setRows([]); setFileName(''); setSheetNames([]); setActiveSheet(''); wbRef.current = null; setErr(null); setResult(null); }
  }, [open, def.table]);

  function parseSheet(name: string) {
    const wb = wbRef.current;
    if (!wb) return;
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
      const wb = XLSX.read(buf, { type: 'array' });
      wbRef.current = wb;
      setSheetNames(wb.SheetNames);
      // Auto-pilih sheet yang namanya cocok dengan label master, jika tidak ada → sheet pertama.
      const match = wb.SheetNames.find((n) => n.toLowerCase() === def.label.toLowerCase())
        ?? wb.SheetNames.find((n) => n.toLowerCase().includes(def.label.toLowerCase()))
        ?? wb.SheetNames[0];
      parseSheet(match);
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

  /** Buat & unduh file Excel template sesuai format master (untuk akun: kode, uraian, kategori, sumber dana). */
  function downloadTemplate() {
    const cols = def.importCols;

    // Baris contoh — khusus akun diberi contoh nyata, master lain memakai placeholder.
    let examples: string[][];
    if (def.table === 'master_akun') {
      examples = [
        ['521211', 'Belanja Bahan', 'Belanja Barang', 'RM'],
        ['524111', 'Belanja Perjalanan Dinas Biasa', 'Belanja Barang', 'RM'],
        ['511111', 'Belanja Gaji Pokok PNS', 'Belanja Pegawai', 'RM'],
      ];
    } else {
      examples = [
        cols.map((c, i) => {
          if (def.parent && i === 0) return 'KODE_INDUK';
          if (c === def.kodeCol) return 'KODE';
          if (c === def.namaCol) return `Uraian ${def.label}`;
          const ef = def.extraFields?.find((f) => f.key === c);
          return ef?.options?.length ? ef.options[0].value : '';
        }),
      ];
    }

    // Sheet data: baris 1 = header (akan dilewati saat import), berikutnya = contoh.
    const ws = XLSX.utils.aoa_to_sheet([cols, ...examples]);
    ws['!cols'] = cols.map((c) => ({ wch: c === def.namaCol ? 42 : 18 }));

    // Sheet petunjuk: penjelasan tiap kolom + nilai yang diizinkan.
    const guide: string[][] = [['Kolom', 'Wajib', 'Keterangan / Nilai yang diizinkan']];
    cols.forEach((c, i) => {
      if (def.parent && i === 0) { guide.push([c, 'Ya', `Kode induk ${def.parent.label} (harus sudah ada di master)`]); return; }
      if (c === def.kodeCol) { guide.push([c, 'Ya', 'Kode akun, contoh: 521211']); return; }
      if (c === def.namaCol) { guide.push([c, 'Ya', 'Uraian / nama akun, contoh: Belanja Bahan']); return; }
      const ef = def.extraFields?.find((f) => f.key === c);
      const wajib = ef?.required ? 'Ya' : 'Tidak';
      const ket = ef?.options?.length ? 'Pilih salah satu: ' + ef.options.map((o) => o.value).join(', ') : '';
      guide.push([c, wajib, ket]);
    });
    guide.push(['']);
    guide.push(['Catatan', '', 'Baris pertama (header) otomatis dilewati saat import. Isi data mulai baris ke-2. Urutan kolom harus sesuai header.']);
    const wsG = XLSX.utils.aoa_to_sheet(guide);
    wsG['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 64 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, def.label.slice(0, 28));
    XLSX.utils.book_append_sheet(wb, wsG, 'Petunjuk');
    XLSX.writeFile(wb, `Template_Import_${def.label.replace(/\s+/g, '_')}.xlsx`);
  }

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
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <Upload className="mx-auto mb-2 size-7 text-muted-foreground" />
            <p className="mb-3 text-sm text-muted-foreground">Pilih file Excel (.xlsx / .xls) atau CSV</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Upload className="size-4" /> Pilih File
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
              </label>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="size-4" /> Unduh Template
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Belum punya format? Unduh template Excel-nya, isi datanya, lalu unggah di sini.
            </p>
          </div>
          <div className="rounded-md bg-muted p-3 text-xs">
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
            <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-4" /> {validCount} valid</span>
            {invalidCount > 0 && <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="size-4" /> {invalidCount} dilewati</span>}
          </div>
          <div className="max-h-[46vh] overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-2 py-1.5 text-left">#</th>
                  {def.parent && <th className="px-2 py-1.5 text-left">Induk ({def.parent.label})</th>}
                  <th className="px-2 py-1.5 text-left">Kode</th>
                  <th className="px-2 py-1.5 text-left">Nama</th>
                  {def.extraFields?.map((f) => <th key={f.key} className="px-2 py-1.5 text-left">{f.label}</th>)}
                  <th className="px-2 py-1.5 text-left">Status</th>
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
                    <td className="px-2 py-1">{r.valid ? <span className="text-emerald-600">OK</span> : <span className="text-amber-600">{r.error}</span>}</td>
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
          <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="size-5" /> Import selesai.</div>
          <ul className="text-sm">
            <li><strong>{result.inserted}</strong> baris ditambahkan (duplikat diabaikan otomatis).</li>
            {result.skipped > 0 && <li>{result.skipped} baris dilewati (tidak valid).</li>}
            {result.failed > 0 && <li className="text-amber-600">{result.failed} baris gagal.</li>}
          </ul>
          {result.errors.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
              {result.errors.slice(0, 50).map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
