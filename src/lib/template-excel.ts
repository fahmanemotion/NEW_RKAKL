import * as XLSX from 'xlsx';
import type { MasterDef } from './referensi';

/**
 * Buat & unduh file Excel template untuk import master (mis. Akun).
 * Header = importCols (urutan kolom sesuai importer), diikuti baris contoh,
 * plus sheet "Petunjuk" berisi nilai yang diizinkan untuk kolom pilihan.
 * Dipakai di toolbar halaman master maupun di dalam modal Import Excel.
 */
export function downloadMasterTemplate(def: MasterDef) {
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
    if (c === def.kodeCol) { guide.push([c, 'Ya', `Kode ${def.label.toLowerCase()}, contoh: 521211`]); return; }
    if (c === def.namaCol) { guide.push([c, 'Ya', `Uraian / nama ${def.label.toLowerCase()}, contoh: Belanja Bahan`]); return; }
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
