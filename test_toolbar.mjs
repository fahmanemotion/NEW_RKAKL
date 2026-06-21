import { toolbarActions } from './src/lib/toolbar.ts';
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m));};
const lbl=(s,c=null)=>toolbarActions(s,c).map(a=>a.label).join(',');

ok(lbl(null)==='Tambah Program','default: Tambah Program');
// Tiap level: tombol "Tambah <level sama>" (sibling) + "Tambah <anak>" (child) + Hapus
ok(lbl('PROGRAM')==='Tambah Program,Tambah Kegiatan,Hapus','Program -> Tambah Program + Tambah Kegiatan + Hapus');
ok(lbl('KEGIATAN')==='Tambah Kegiatan,Tambah KRO,Hapus','Kegiatan -> Tambah Kegiatan + Tambah KRO + Hapus');
ok(lbl('KRO')==='Tambah KRO,Tambah RO,Hapus','KRO -> Tambah KRO + Tambah RO + Hapus');
ok(lbl('RO')==='Tambah RO,Tambah Komponen,Hapus','RO -> Tambah RO + Tambah Komponen + Hapus');
ok(lbl('KOMPONEN')==='Tambah Komponen,Tambah Sub Komponen,Hapus','Komponen -> Tambah Komponen + Tambah Sub Komponen + Hapus');
ok(lbl('SUB_KOMPONEN')==='Tambah Sub Komponen,Tambah Akun,Edit,Salin,Hapus','Sub Komponen -> +Sub +Akun +Edit +Salin +Hapus');
ok(lbl('AKUN')==='Tambah Akun,Tambah Detail,Edit,Salin,Hapus','Akun -> +Akun +Detail +Edit +Salin +Hapus');
ok(lbl('DETAIL')==='Tambah Detail,Header,Edit,Salin,Hapus','Detail -> Tambah Detail + Header + Edit + Salin + Hapus');
ok(toolbarActions('DETAIL').some(a=>a.kind==='header'),'Detail punya tombol Header (kind header)');
ok(lbl('HEADER')==='Tambah Header,Tambah Detail,Edit,Hapus','Header -> Tambah Header + Tambah Detail + Edit + Hapus');
{
  const h=toolbarActions('HEADER');
  ok(h.find(a=>a.as==='child')?.addLevel==='DETAIL','child Header = DETAIL');
  ok(h.find(a=>a.as==='sibling')?.addLevel==='HEADER','sibling Header = HEADER');
  ok(h.some(a=>a.kind==='edit'),'Header bisa di-Edit (uraian)');
}

// Dua tombol tambah: pertama sibling (level sama), kedua child (level anak)
['PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','SUB_KOMPONEN','AKUN'].forEach((s)=>{
  const adds=toolbarActions(s).filter(a=>a.kind==='add');
  ok(adds.length===2 && adds[0].as==='sibling' && adds[0].addLevel===s && adds[1].as==='child',
     s+': 2 tombol tambah (sibling level sama + child level anak)');
});
{
  const adds=toolbarActions('DETAIL').filter(a=>a.kind==='add');
  ok(adds.length===1 && adds[0].as==='sibling' && adds[0].addLevel==='DETAIL','DETAIL: hanya 1 tombol Tambah Detail (sibling)');
}
// child level benar
ok(toolbarActions('PROGRAM').find(a=>a.as==='child').addLevel==='KEGIATAN','child Program=KEGIATAN');
ok(toolbarActions('AKUN').find(a=>a.as==='child').addLevel==='DETAIL','child Akun=DETAIL');

// setiap level (kecuali default) punya aksi delete
['PROGRAM','KEGIATAN','KRO','RO','KOMPONEN','SUB_KOMPONEN','AKUN','DETAIL'].forEach((s)=>{
  ok(toolbarActions(s).some(a=>a.kind==='delete'), 'ada tombol Hapus di '+s);
});
ok(!toolbarActions(null).some(a=>a.kind==='delete'),'tanpa pilihan: tidak ada Hapus');

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

// Edit untuk Sub Komponen & Akun & Detail; KRO tanpa Edit
{
  const sk = toolbarActions('SUB_KOMPONEN');
  ok(sk.some(a=>a.kind==='edit') && sk.some(a=>a.kind==='delete') && sk.some(a=>a.addLevel==='AKUN'), 'SUB_KOMPONEN: Tambah Akun + Edit + Hapus');
  const ak = toolbarActions('AKUN');
  ok(ak.some(a=>a.kind==='edit') && ak.some(a=>a.addLevel==='DETAIL') && ak.some(a=>a.kind==='delete'), 'AKUN: Tambah Detail + Edit + Hapus');
  const kro = toolbarActions('KRO');
  ok(!kro.some(a=>a.kind==='edit'), 'KRO: tetap tanpa Edit');
  const det = toolbarActions('DETAIL');
  ok(det.some(a=>a.kind==='edit') && det.some(a=>a.kind==='delete'), 'DETAIL: Edit + Hapus');
}

console.log('\nHasil: '+pass+' lulus, '+fail+' gagal'); process.exit(fail?1:0);
