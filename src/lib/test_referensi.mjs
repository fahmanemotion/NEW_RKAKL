import { MASTERS, mapImportRows, cleanCode, cleanText } from './src/lib/referensi.ts';
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m));};

// cleanCode padding
ok(cleanCode(601,3)==='601' && cleanCode(2,3)==='002' && cleanCode('AEC',3)==='AEC','cleanCode pad angka, biarkan huruf');
ok(cleanText(' a\n b  c ')==='a b c','cleanText rapikan spasi/baris');

// Import KRO (berinduk kegiatan): [kode_kegiatan, kode_kro, nama_kro, satuan]
const kroRaw = [
  ['Kegiatan','KRO','Uraian KRO','Satuan'],         // header → dilewati
  ['3996','AEC','Kerja sama','Layanan'],
  ['3996','AFA','Norma, Standar',''],
  ['', 'XX','tanpa induk',''],                       // induk kosong → invalid
];
const kro = mapImportRows(MASTERS.kro, kroRaw).rows;
ok(kro.length===3,'3 baris (header dilewati): '+kro.length);
ok(kro[0].parentCode==='3996' && kro[0].values.kode_kro==='AEC' && kro[0].valid,'baris KRO valid + induk benar');
ok(kro[2].valid===false && /induk/i.test(kro[2].error),'induk kosong → invalid');

// Import Komponen: padding kode 3 digit + jenis
const kompRaw = [['002','51','Komp A','Utama']];
const komp = mapImportRows(MASTERS.komponen, kompRaw).rows;
ok(komp[0].parentCode==='002' && komp[0].values.kode_komponen==='051','komponen kode dipad 051');
ok(komp[0].values.jenis==='Utama','komponen membawa jenis');

// Import Akun (flat, tanpa induk): [kode, nama, kategori, sumber_dana]
const akunRaw = [
  ['Kode','Nama','Kategori','SD'],                  // header
  ['521211','Belanja Bahan','Belanja Barang','RM'],
  ['999999','Tanpa kategori','',''],                // kategori kosong → invalid
];
const akun = mapImportRows(MASTERS.akun, akunRaw).rows;
ok(akun.length===2,'akun: 2 baris (header dilewati)');
ok(akun[0].parentCode===undefined && akun[0].values.kode_akun==='521211','akun flat tanpa induk');
ok(akun[1].valid===false && /kategori/i.test(akun[1].error),'akun tanpa kategori → invalid');

// nama kosong → diisi kode
const noName = mapImportRows(MASTERS.akun, [['525112','','Belanja Barang','BLU']]).rows;
ok(noName[0].values.nama_akun==='525112','nama kosong diisi kode');

console.log('\nHasil: '+pass+' lulus, '+fail+' gagal'); process.exit(fail?1:0);
