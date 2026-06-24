import { buildDashboardRows, summarize, normKategori } from './src/lib/dashboard-data.ts';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  \u2713 ' + m)) : (fail++, console.log('  \u2717 ' + m)); };

// AKUN dengan: 1 DETAIL langsung (NON_OPS) + 1 HEADER yang berisi 1 DETAIL (OPS).
// Regresi: detail di bawah HEADER tidak terambil → expand & kategori kosong.
const rows = [
  { id: 'a1', parent_id: null, level: 'AKUN',   kode: '521211', uraian: 'Belanja Bahan', jumlah: 300, urutan: 1, sumber_dana: 'RM' },
  { id: 'd1', parent_id: 'a1', level: 'DETAIL', kode: '',       uraian: 'ATK',           jumlah: 100, urutan: 1, jenis_belanja: 'NON_OPS', sumber_dana: 'RM' },
  { id: 'h1', parent_id: 'a1', level: 'HEADER', kode: '',       uraian: 'Kelompok',      jumlah: 200, urutan: 2 },
  { id: 'd2', parent_id: 'h1', level: 'DETAIL', kode: '',       uraian: 'Konsumsi',      jumlah: 200, urutan: 1, jenis_belanja: 'OPS',     sumber_dana: 'RM' },
];

const drows = buildDashboardRows(rows);
ok(drows.length === 1, 'satu baris tingkat AKUN');

const a = drows[0];
ok(a.details.length === 2, 'detail di bawah HEADER ikut terambil (langsung + bawah header = 2) → bisa di-expand');
ok(a.kategoriSet.includes('OPS') && a.kategoriSet.includes('NON'), 'kolom kategori menampilkan OPS & NON');
ok(a.pagu === 300, 'pagu akun = total seluruh detail = 300');

const sum = summarize(drows);
ok(sum.ops === 200, 'ringkasan OPS = 200 (dari detail di bawah header)');
ok(sum.non === 100, 'ringkasan NON = 100 (dari detail langsung)');
ok(sum.total === 300, 'ringkasan total = 300');

ok(normKategori('OPS') === 'OPS' && normKategori('NON_OPS') === 'NON', 'normKategori memetakan OPS/NON_OPS dengan benar');

// Tanpa header (detail langsung) tetap benar.
const rows2 = [
  { id: 'a2', parent_id: null, level: 'AKUN',   kode: '522111', uraian: 'Belanja Jasa', jumlah: 50, urutan: 1 },
  { id: 'x1', parent_id: 'a2', level: 'DETAIL', kode: '', uraian: 'Cetak', jumlah: 50, urutan: 1, jenis_belanja: 'OPS', sumber_dana: 'RM' },
];
const d2 = buildDashboardRows(rows2);
ok(d2[0].details.length === 1 && d2[0].kategoriSet.includes('OPS'), 'detail langsung (tanpa header) tetap terbaca');

// Rantai RO → KOMPONEN → SUB_KOMPONEN → AKUN: komponenKode harus terisi (untuk filter Komponen).
const rows3 = [
  { id: 'ro1', parent_id: null,  level: 'RO',           kode: '5241.BMA.001', uraian: 'RO', jumlah: 0, urutan: 1 },
  { id: 'k1',  parent_id: 'ro1', level: 'KOMPONEN',     kode: '051',          uraian: 'Komponen A', jumlah: 0, urutan: 1 },
  { id: 's1',  parent_id: 'k1',  level: 'SUB_KOMPONEN', kode: 'A',            uraian: 'Sub', jumlah: 0, urutan: 1 },
  { id: 'ak1', parent_id: 's1',  level: 'AKUN',         kode: '521211',       uraian: 'Belanja Bahan', jumlah: 80, urutan: 1 },
  { id: 'de1', parent_id: 'ak1', level: 'DETAIL',       kode: '',             uraian: 'ATK', jumlah: 80, urutan: 1, jenis_belanja: 'OPS', sumber_dana: 'RM' },
];
const d3 = buildDashboardRows(rows3);
ok(d3[0].komponenKode === '051', 'komponenKode terisi dari leluhur KOMPONEN (untuk filter Komponen)');

console.log(`\nDashboard: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
