import { toolbarActions } from './src/lib/toolbar.ts';
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m));};
const lbl=(s,c=null)=>toolbarActions(s,c).map(a=>a.label).join(',');
ok(lbl(null)==='Tambah Program','default: Tambah Program');
ok(lbl('PROGRAM')==='Tambah Kegiatan,Hapus','Program -> Tambah Kegiatan + Hapus');
ok(lbl('KEGIATAN')==='Tambah KRO,Hapus','Kegiatan -> Tambah KRO + Hapus');
ok(lbl('KRO')==='Tambah RO,Hapus','KRO -> Tambah RO + Hapus');
ok(lbl('RO')==='Tambah Komponen,Hapus','RO -> Tambah Komponen + Hapus');
ok(lbl('KOMPONEN')==='Tambah Sub Komponen,Hapus','Komponen -> Tambah Sub Komponen + Hapus');
ok(lbl('SUB_KOMPONEN')==='Tambah Akun,Edit,Salin,Hapus','Sub Komponen -> Tambah Akun + Edit + Salin + Hapus');
ok(lbl('AKUN')==='Tambah Detail,Edit,Salin,Hapus','Akun -> Tambah Detail + Edit + Salin + Hapus');
ok(lbl('DETAIL')==='Edit,Salin,Hapus','Detail -> Edit + Salin + Hapus');
// setiap level (kecuali default) punya aksi delete
['PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','SUB_KOMPONEN','AKUN','DETAIL'].forEach((s)=>{
  ok(toolbarActions(s).some(a=>a.kind==='delete'), 'ada tombol Hapus di '+s);
});
ok(!toolbarActions(null).some(a=>a.kind==='delete'),'tanpa pilihan: tidak ada Hapus');
ok(toolbarActions('PROGRAM')[0].addLevel==='KEGIATAN','addLevel Program=KEGIATAN');

// Salin hanya untuk Sub Komponen, Akun, Detail
ok(toolbarActions('SUB_KOMPONEN').some(a=>a.kind==='copy'), 'SUB_KOMPONEN bisa Salin');
ok(toolbarActions('AKUN').some(a=>a.kind==='copy'), 'AKUN bisa Salin');
ok(toolbarActions('DETAIL').some(a=>a.kind==='copy'), 'DETAIL bisa Salin');
ok(!toolbarActions('KOMPONEN').some(a=>a.kind==='copy'), 'KOMPONEN tidak punya Salin');
ok(!toolbarActions('PROGRAM').some(a=>a.kind==='copy'), 'PROGRAM tidak punya Salin');

// Tempel: muncul saat clipboard cocok dengan induk terpilih
console.log('Tempel:');
ok(toolbarActions('KOMPONEN','SUB_KOMPONEN').some(a=>a.kind==='paste'), 'clipboard Sub Komponen + pilih Komponen -> Tempel');
ok(toolbarActions('SUB_KOMPONEN','AKUN').some(a=>a.kind==='paste'), 'clipboard Akun + pilih Sub Komponen -> Tempel');
ok(toolbarActions('AKUN','DETAIL').some(a=>a.kind==='paste'), 'clipboard Detail + pilih Akun -> Tempel');
ok(!toolbarActions('AKUN','SUB_KOMPONEN').some(a=>a.kind==='paste'), 'clipboard Sub Komponen + pilih Akun -> tidak ada Tempel');
ok(!toolbarActions('KOMPONEN','AKUN').some(a=>a.kind==='paste'), 'clipboard Akun + pilih Komponen -> tidak ada Tempel');
ok(!toolbarActions('KOMPONEN',null).some(a=>a.kind==='paste'), 'clipboard kosong -> tidak ada Tempel');
ok(toolbarActions('KOMPONEN','SUB_KOMPONEN').find(a=>a.kind==='paste').label==='Tempel Sub Komponen', 'label Tempel Sub Komponen');

// Edit untuk Sub Komponen & Akun
{
  const sk = toolbarActions('SUB_KOMPONEN');
  ok(sk.some(a=>a.kind==='edit') && sk.some(a=>a.kind==='delete') && sk.some(a=>a.addLevel==='AKUN'), 'SUB_KOMPONEN: Tambah Akun + Edit + Hapus');
  const ak = toolbarActions('AKUN');
  ok(ak.some(a=>a.kind==='edit') && ak.some(a=>a.addLevel==='DETAIL') && ak.some(a=>a.kind==='delete'), 'AKUN: Tambah Detail + Edit + Hapus');
  const kro = toolbarActions('KRO');
  ok(!kro.some(a=>a.kind==='edit'), 'KRO: tetap tanpa Edit (hanya Tambah + Hapus)');
  const det = toolbarActions('DETAIL');
  ok(det.some(a=>a.kind==='edit') && det.some(a=>a.kind==='delete'), 'DETAIL: Edit + Hapus');
}

console.log('\nHasil: '+pass+' lulus, '+fail+' gagal'); process.exit(fail?1:0);
