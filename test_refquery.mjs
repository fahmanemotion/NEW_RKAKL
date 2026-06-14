import { refQueryFor } from './src/lib/ref-query.ts';
import { CHILD_OF, LEVELS } from './src/lib/constants.ts';
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log('  \u2713 '+m)):(fail++,console.log('  \u2717 '+m));};

ok(refQueryFor('PROGRAM',null).table==='master_program' && !refQueryFor('PROGRAM',null).parentCol,'PROGRAM: master_program tanpa induk');
const keg=refQueryFor('KEGIATAN','PID'); ok(keg.table==='master_kegiatan' && keg.parentCol==='program_id' && keg.parentId==='PID','KEGIATAN: filter program_id');
const kro=refQueryFor('KRO','KID'); ok(kro.table==='master_kro' && kro.parentCol==='kegiatan_id' && kro.parentId==='KID','KRO: filter kegiatan_id');
const ro=refQueryFor('RO','X'); ok(ro.table==='master_ro' && ro.parentCol==='kro_id','RO: filter kro_id');
const komp=refQueryFor('KOMPONEN','X'); ok(komp.table==='master_komponen' && komp.parentCol==='ro_id' && komp.extraCol==='jenis','KOMPONEN: filter ro_id + jenis');
const akun=refQueryFor('AKUN',null); ok(akun.table==='master_akun' && !akun.parentCol && akun.extraCol==='kategori_belanja','AKUN: flat + kategori');
ok(refQueryFor('SUB_KOMPONEN',null)===null,'SUB_KOMPONEN: manual (null)');
ok(refQueryFor('DETAIL',null)===null,'DETAIL: manual (null)');

// rantai hirarki CHILD_OF konsisten
ok(CHILD_OF.PROGRAM==='KEGIATAN' && CHILD_OF.KEGIATAN==='KRO' && CHILD_OF.AKUN==='DETAIL','rantai CHILD_OF benar');
ok(LEVELS[0]==='PROGRAM' && LEVELS[LEVELS.length-1]==='DETAIL','urutan LEVELS Program..Detail');
console.log('\nHasil: '+pass+' lulus, '+fail+' gagal'); process.exit(fail?1:0);
