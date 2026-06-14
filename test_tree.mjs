// Uji util tree-grid SIPPT (node --experimental-strip-types).
import { buildTree, flattenForGrid } from './src/lib/tree.ts';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  \u2713 ' + m); } else { fail++; console.log('  \u2717 ' + m); } };

const row = (o) => ({
  id: o.id, usulan_id: 'U', parent_id: o.parent ?? null, level: o.level,
  referensi_id: null, kode: o.kode, uraian: o.uraian ?? o.kode,
  volume: o.volume ?? 0, satuan: o.satuan ?? null, harga: o.harga ?? 0,
  jumlah: o.level === 'DETAIL' ? (o.volume ?? 0) * (o.harga ?? 0) : 0,
  sumber_dana: o.sd ?? null, urutan: o.urutan ?? 0, created_at: '', updated_at: '',
});

const rows = [
  row({ id: 'kro', level: 'KRO', kode: '3996.SAB', uraian: 'Pendidikan Vokasi', volume: 2874, satuan: 'Orang' }),
  row({ id: 'ro', parent: 'kro', level: 'RO', kode: '3996.SAB.004', uraian: 'Diklat Reguler', volume: 41, satuan: 'Orang' }),
  row({ id: 'komp', parent: 'ro', level: 'KOMPONEN', kode: '051', uraian: 'Diploma IV Nautika' }),
  row({ id: 'sub', parent: 'komp', level: 'SUB_KOMPONEN', kode: 'A', uraian: 'Angkatan 42' }),
  row({ id: 'akun', parent: 'sub', level: 'AKUN', kode: '521211', uraian: 'Belanja Bahan', sd: 'RM' }),
  row({ id: 'd1', parent: 'akun', level: 'DETAIL', kode: '', uraian: 'Konsumsi pengawas', volume: 10, harga: 24000 }),
  row({ id: 'd2', parent: 'akun', level: 'DETAIL', kode: '', uraian: 'ATK', volume: 1, harga: 500000 }),
];

// 1) Agregasi
const { roots } = buildTree(rows);
ok(roots.length === 1 && roots[0].agg === 10 * 24000 + 500000, 'agregasi root (KRO) = Σ detail: ' + roots[0].agg);

// 2) Flatten + baris info
const { gridRows, total } = flattenForGrid(rows);
ok(total === 740000, 'total = 740.000 (' + total + ')');
const types = gridRows.map((r) => r.type);
ok(types[0] === 'KRO', 'baris pertama KRO');
ok(gridRows.some((r) => r.type === 'INFO' && /Lokasi/.test(r.uraian)), 'baris info Lokasi di bawah KRO');
ok(gridRows.some((r) => r.type === 'INFO' && /Jumlah Komponen Utama/.test(r.uraian) && r.jumlah === 740000), 'baris Jumlah Komponen Utama membawa total RO');
ok(gridRows.some((r) => r.type === 'INFO' && /KPPN/.test(r.uraian)), 'baris KPPN di bawah Akun');

// 3) Penomoran detail + nilai
const dets = gridRows.filter((r) => r.type === 'DETAIL');
ok(dets.length === 2 && /^00\.00\. 1 -/.test(dets[0].uraian) && /^00\.00\. 2 -/.test(dets[1].uraian), 'detail bernomor 00.00. n');
ok(dets[0].jumlah === 240000 && dets[1].jumlah === 500000, 'jumlah detail = vol*harga');

// 4) Depth berjenjang
const akun = gridRows.find((r) => r.type === 'AKUN');
ok(akun.depth === 6, 'kedalaman AKUN = 6');

// 5) Baris info tidak bisa dipilih
ok(gridRows.filter((r) => r.type === 'INFO').every((r) => !r.selectable), 'baris info non-selectable');

// 6) Pohon berakar PROGRAM → KEGIATAN → KRO → ... → DETAIL (model multi-program)
const full = [
  row({ id:'prog', level:'PROGRAM', kode:'022.12.DL', uraian:'Program Diklat' }),
  row({ id:'keg', parent:'prog', level:'KEGIATAN', kode:'3996', uraian:'Pendidikan Transportasi' }),
  row({ id:'kro2', parent:'keg', level:'KRO', kode:'3996.SAB', uraian:'Vokasi' }),
  row({ id:'ro2', parent:'kro2', level:'RO', kode:'3996.SAB.005', uraian:'Diklat' }),
  row({ id:'komp2', parent:'ro2', level:'KOMPONEN', kode:'051', uraian:'Diploma IV' }),
  row({ id:'sub2', parent:'komp2', level:'SUB_KOMPONEN', kode:'A', uraian:'Angk 45' }),
  row({ id:'akun2', parent:'sub2', level:'AKUN', kode:'525112', uraian:'Belanja Barang BLU', sd:'BLU' }),
  row({ id:'det2', parent:'akun2', level:'DETAIL', kode:'', uraian:'Belanja Bahan', volume:1, harga:3500000 }),
];
const ff = flattenForGrid(full);
const dep = {}; ff.gridRows.forEach(r=>{ if(r.type!=='INFO') dep[r.type]=r.depth; });
ok(dep.PROGRAM===0 && dep.KEGIATAN===1 && dep.KRO===2 && dep.RO===3 && dep.KOMPONEN===4 && dep.SUB_KOMPONEN===5 && dep.AKUN===6 && dep.DETAIL===7,'kedalaman Program..Detail = 0..7');
ok(ff.total===3500000,'total pohon penuh = 3.500.000');
const prog = ff.gridRows.find(r=>r.type==='PROGRAM');
ok(prog.jumlah===3500000,'agregasi naik sampai PROGRAM');

// 7) Hapus subtree (simulasi cascade): buang akun2+det2 → total jadi 0
const pruned = full.filter(r=>!['akun2','det2'].includes(r.id));
ok(flattenForGrid(pruned).total===0,'hapus subtree akun → total 0 (rollup)');

// 8) Semua id baris HARUS unik (cegah error React "duplicate key") — termasuk
//    saat ada >1 RO/AKUN yang masing-masing menyisipkan baris-info.
const multi = [
  row({ id:'kroM', level:'KRO', kode:'4627.EBA', uraian:'Layanan' }),
  row({ id:'ro_a', parent:'kroM', level:'RO', kode:'4627.EBA.962', uraian:'Umum' }),
  row({ id:'ro_b', parent:'kroM', level:'RO', kode:'4627.EBA.994', uraian:'Perkantoran' }),
  row({ id:'kompM', parent:'ro_b', level:'KOMPONEN', kode:'001', uraian:'Gaji' }),
  row({ id:'subM', parent:'kompM', level:'SUB_KOMPONEN', kode:'A', uraian:'PNS' }),
  row({ id:'ak1', parent:'subM', level:'AKUN', kode:'511111', uraian:'Gaji Pokok', sd:'RM' }),
  row({ id:'ak2', parent:'subM', level:'AKUN', kode:'511119', uraian:'Pembulatan', sd:'RM' }),
];
const gm = flattenForGrid(multi).gridRows;
const ids = gm.map(r=>r.id);
ok(new Set(ids).size === ids.length, 'semua id baris unik ('+ids.length+' baris, '+new Set(ids).size+' unik)');
const jkuCount = gm.filter(r=>/Jumlah Komponen Utama/.test(r.uraian)).length;
ok(jkuCount === 2, 'dua baris "Jumlah Komponen Utama" untuk dua RO, id tetap unik');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
