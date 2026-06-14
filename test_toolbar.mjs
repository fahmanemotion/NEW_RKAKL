import { toolbarActions } from './src/lib/toolbar.ts';
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m));};
const lbl=(s)=>toolbarActions(s).map(a=>a.label).join(',');
ok(lbl(null)==='Tambah Program','default: Tambah Program');
ok(lbl('PROGRAM')==='Tambah Kegiatan,Hapus','Program -> Tambah Kegiatan + Hapus');
ok(lbl('KEGIATAN')==='Tambah KRO,Hapus','Kegiatan -> Tambah KRO + Hapus');
ok(lbl('KRO')==='Tambah RO,Hapus','KRO -> Tambah RO + Hapus');
ok(lbl('RO')==='Tambah Komponen,Hapus','RO -> Tambah Komponen + Hapus');
ok(lbl('KOMPONEN')==='Tambah Sub Komponen,Hapus','Komponen -> Tambah Sub Komponen + Hapus');
ok(lbl('SUB_KOMPONEN')==='Tambah Akun,Hapus','Sub Komponen -> Tambah Akun + Hapus');
ok(lbl('AKUN')==='Tambah Detail,Hapus','Akun -> Tambah Detail + Hapus');
ok(lbl('DETAIL')==='Edit,Hapus','Detail -> Edit + Hapus');
// setiap level (kecuali default) punya aksi delete
['PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','SUB_KOMPONEN','AKUN','DETAIL'].forEach((s)=>{
  ok(toolbarActions(s).some(a=>a.kind==='delete'), 'ada tombol Hapus di '+s);
});
ok(!toolbarActions(null).some(a=>a.kind==='delete'),'tanpa pilihan: tidak ada Hapus');
ok(toolbarActions('PROGRAM')[0].addLevel==='KEGIATAN','addLevel Program=KEGIATAN');
console.log('\nHasil: '+pass+' lulus, '+fail+' gagal'); process.exit(fail?1:0);
