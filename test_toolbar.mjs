import { toolbarActions } from './src/lib/toolbar.ts';
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m));};
const lbl=(s)=>toolbarActions(s).map(a=>a.label).join(',');
ok(lbl(null)==='Tambah Program','default: Tambah Program');
ok(lbl('PROGRAM')==='Tambah Kegiatan,Hapus','Program -> Tambah Kegiatan + Hapus');
ok(lbl('KEGIATAN')==='Tambah KRO,Hapus','Kegiatan -> Tambah KRO + Hapus');
ok(lbl('KRO')==='Tambah RO,Hapus','KRO -> Tambah RO + Hapus');
ok(lbl('RO')==='Tambah Komponen,Hapus','RO -> Tambah Komponen + Hapus');
ok(lbl('KOMPONEN')==='Tambah Sub Komponen,Hapus','Komponen -> Tambah Sub Komponen + Hapus');
ok(lbl('SUB_KOMPONEN')==='Tambah Akun,Edit,Hapus','Sub Komponen -> Tambah Akun + Edit + Hapus');
ok(lbl('AKUN')==='Tambah Detail,Edit,Hapus','Akun -> Tambah Detail + Edit + Hapus');
ok(lbl('DETAIL')==='Edit,Hapus','Detail -> Edit + Hapus');
// setiap level (kecuali default) punya aksi delete
['PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','SUB_KOMPONEN','AKUN','DETAIL'].forEach((s)=>{
  ok(toolbarActions(s).some(a=>a.kind==='delete'), 'ada tombol Hapus di '+s);
});
ok(!toolbarActions(null).some(a=>a.kind==='delete'),'tanpa pilihan: tidak ada Hapus');
ok(toolbarActions('PROGRAM')[0].addLevel==='KEGIATAN','addLevel Program=KEGIATAN');

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
