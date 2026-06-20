import { parseKertasKerja, levelOf } from "./src/lib/kertas-kerja-import.ts";
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log("  \u2713 "+m)):(fail++,console.log("  \u2717 "+m));};

console.log("levelOf (format lama & baru):");
ok(levelOf("022.12.DL","x")==="PROGRAM","022.12.DL = PROGRAM");
ok(levelOf("022.12","x")==="UNIT","022.12 = UNIT");
ok(levelOf("3996","x")==="KEGIATAN","3996 = KEGIATAN");
ok(levelOf("3996.AEC","x")==="KRO","3996.AEC = KRO (3 huruf)");
ok(levelOf("3996.AE002","x")==="RO","3996.AE002 = RO (format baru 2 huruf+3 angka)");
ok(levelOf("3996.AEC.002","x")==="RO","3996.AEC.002 = RO (format lama 3 segmen)");
ok(levelOf("051","x")==="KOMPONEN","051 = KOMPONEN");
ok(levelOf("A","x")==="SUB_KOMPONEN","A = SUB_KOMPONEN");
ok(levelOf("525112","x")==="AKUN","525112 = AKUN");
ok(levelOf("","Goodie Bag")==="DETAIL","kode kosong + uraian (tanpa '-') = DETAIL");
ok(levelOf("","- Spanduk")==="DETAIL","kode kosong + '- ' = DETAIL (format lama)");
ok(levelOf("","")===null,"kosong total = null");

function row(obj){ const r=new Array(33).fill(""); for(const[k,v]of Object.entries(obj)) r[k]=v; return r; }
const aoa=[
  row({2:"KERTAS KERJA RKA-KL"}),                          // judul sebelum program → dilewati
  row({1:"022.12",2:"PIP Makassar"}),                      // UNIT → dilewati
  row({1:"022.12.DL",2:"Program",21:100000}),              // PROGRAM
  row({1:"3996",2:"Keg",21:100000}),                       // KEGIATAN
  row({1:"3996.AEC",2:"KRO",21:100000}),                   // KRO
  row({1:"3996.AE002",2:"RO baru",21:100000}),             // RO (format baru)
  row({1:"052",2:"Publikasi Nasional",21:60000}),          // KOMPONEN 052
  row({1:"A",2:"Sub A",21:60000}),                         // SUB A
  row({1:"525112",2:"Belanja Barang",21:60000,26:60000,32:"BLU"}), // AKUN (nonops BLU)
  row({2:"Goodie Bag",4:9,5:"keg",7:1,8:"buah",18:9,19:"buah",20:55000,21:495000}), // detail tanpa '-'
  row({2:"- Spanduk",18:1,19:"Keg",20:200000,21:200000}),  // detail format lama
  // DUPLIKAT komponen 052 (induk RO sama) → harus digabung
  row({1:"052",2:"Publikasi Internasional",21:40000}),     // KOMPONEN 052 (dup)
  row({1:"A",2:"Sub A",21:40000}),                         // SUB A (dup)
  row({1:"525112",2:"Belanja Barang",21:40000,26:40000,32:"BLU"}), // AKUN (dup)
  row({2:"Plakat",18:1,19:"buah",20:250000,21:250000}),    // detail baru di komponen ke-2
];
const res=parseKertasKerja(aoa);
console.log("\nparseKertasKerja + dedup:");
ok(res.counts.PROGRAM===1 && res.counts.KEGIATAN===1 && res.counts.KRO===1 && res.counts.RO===1,"Program/Keg/KRO/RO masing-masing 1");
ok(res.counts.KOMPONEN===1,"Komponen 052 ganda DIGABUNG → 1 komponen");
ok(res.counts.SUB_KOMPONEN===1,"Sub A ganda digabung → 1");
ok(res.counts.AKUN===1,"Akun 525112 ganda digabung → 1");
ok(res.counts.DETAIL===3,"semua 3 detail dipertahankan (Goodie Bag, Spanduk, Plakat)");

const byId=new Map(res.nodes.map(n=>[n.tempId,n]));
// no sibling duplicate
const seen=new Map(); let dup=0;
for(const n of res.nodes){ const k=(n.parentTempId||"root")+"|"+n.level+"|"+(n.kode||"").toUpperCase(); if(["PROGRAM","KEGIATAN","KRO","RO","KOMPONEN","SUB_KOMPONEN","AKUN"].includes(n.level)){ if(seen.has(k))dup++; seen.set(k,1);} }
ok(dup===0,"tidak ada duplikat sibling Program..Akun");

const det=res.nodes.find(n=>n.uraian==="Goodie Bag");
ok(det.level==="DETAIL" && det.kode===null,"Goodie Bag = DETAIL tanpa kode");
ok(JSON.stringify(det.segments)===JSON.stringify([{qty:9,sat:"keg"},{qty:1,sat:"buah"}]),"segmen multi terbaca");
ok(det.volume===9 && det.satuan==="buah" && det.harga===55000 && det.jumlah===495000,"vol/satuan/harga/jumlah detail benar");
ok(det.sumber_dana==="BLU" && det.jenis_belanja==="NON_OPS","detail mewarisi sumber BLU + NON_OPS dari akun");
const spanduk=res.nodes.find(n=>n.uraian==="Spanduk");
ok(spanduk && spanduk.level==="DETAIL" && spanduk.segments===null,"detail '- Spanduk' (lama) dikenali, segmen null");
// ketiga detail menempel ke satu akun yang sama (hasil merge)
const akunIds=new Set(res.nodes.filter(n=>n.level==="DETAIL").map(n=>n.parentTempId));
ok(akunIds.size===1,"3 detail menempel pada SATU akun (hasil gabung)");
// komponen yang dipertahankan memakai uraian kemunculan pertama
const komp=res.nodes.find(n=>n.level==="KOMPONEN");
ok(komp.uraian==="Publikasi Nasional","komponen gabungan memakai uraian kemunculan pertama");

ok(res.programTotals[0].kode==="022.12.DL" && res.total===100000,"total program dari baris program");
ok(res.skipped.preProgramRows>=1,"baris di atas Program (judul/rekap) dilaporkan sebagai dilewati");
ok(res.skipped.orphanDetails===0,"tidak ada detail orphan pada contoh ini");

// Detail rekap menggantung (di bawah UNIT sebelum akun mana pun) → dilewati & dilaporkan
{
  const r2 = parseKertasKerja([
    row({1:"022.12",2:"Satker"}),
    row({2:"- Belanja Tunj Struktural PNS",18:1,20:30240000,21:30240000}), // detail rekap, tanpa program/akun
    row({2:"- Uang Lembur",18:1,20:17000,21:17000}),
    row({1:"022.12.DL",2:"Program",21:100000}),
    row({1:"3996",2:"Keg",21:100000}),
    row({1:"3996.AEC",2:"KRO",21:100000}),
    row({1:"3996.AE002",2:"RO",21:100000}),
    row({1:"051",2:"Komp",21:100000}),
    row({1:"A",2:"Sub",21:100000}),
    row({1:"525112",2:"Belanja Barang",21:100000,32:"BLU"}),
    row({2:"Item nyata",18:1,20:100000,21:100000}),
  ]);
  ok(r2.skipped.preProgramRows===2,"2 detail rekap di atas Program dilewati & dihitung");
  ok(r2.counts.DETAIL===1 && r2.nodes.some(n=>n.uraian==="Item nyata"),"hanya detail nyata (di bawah akun) yang diimpor");
  ok(!r2.nodes.some(n=>n.uraian.includes("Lembur")),"detail rekap tidak ikut sebagai orphan");
}

console.log("\nHasil: "+pass+" lulus, "+fail+" gagal"); if(fail>0)process.exit(1);
