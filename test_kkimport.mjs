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
  // DUPLIKAT SEJATI komponen 052 (kode + uraian sama persis, induk RO sama) → digabung
  row({1:"052",2:"Publikasi Nasional",21:40000}),     // KOMPONEN 052 (dup persis)
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
for(const n of res.nodes){ const k=(n.parentTempId||"root")+"|"+n.level+"|"+(n.kode||"").toUpperCase()+"|"+(n.uraian||"").toUpperCase(); if(["PROGRAM","KEGIATAN","KRO","RO","KOMPONEN","SUB_KOMPONEN","AKUN"].includes(n.level)){ if(seen.has(k))dup++; seen.set(k,1);} }
ok(dup===0,"tidak ada duplikat sibling (kode+uraian) Program..Akun");

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

ok(res.programTotals[0].kode==="022.12.DL" && res.total===945000,"total program = penjumlahan detail (495rb+200rb+250rb)");
ok(res.skipped.preProgramRows>=1,"baris di atas Program (judul) dilaporkan dilewati");
ok(res.skipped.orphanDetails===0,"tidak ada detail orphan pada contoh ini");

// fileTotal: total resmi dari baris satker (UNIT) ditangkap dari kolom 21
{
  const rf = parseKertasKerja([
    row({1:"022.12",2:"Satker",21:253182015000}),
    row({1:"022.12.DL",2:"Program",21:1}),
    row({1:"3996",2:"Keg",21:1}),
    row({1:"3996.AEC",2:"KRO",21:1}),
    row({1:"3996.AE002",2:"RO",21:1}),
    row({1:"051",2:"Komp",21:1}),
    row({1:"A",2:"Sub",21:1}),
    row({1:"525112",2:"Belanja",21:1,32:"BLU"}),
    row({2:"d1",18:1,20:100,21:100}),
  ]);
  ok(rf.fileTotal===253182015000,"fileTotal diambil dari baris satker (UNIT)");
  ok(rf.total===100,"total = Σ rincian (independen dari header)");
}

// Header Kegiatan/KRO HILANG di file → direkonstruksi dari kode RO 3-segmen
{
  const r4 = parseKertasKerja([
    row({1:"022.12",2:"Satker"}),
    row({1:"022.12.DL",2:"Program",21:1}),
    row({1:"3996",2:"Pendidikan",21:1}),
    row({1:"3996.AEC",2:"KRO AEC",21:1}),
    row({1:"3996.AEC.002",2:"RO AEC",21:1}),
    row({1:"051",2:"Komp",21:1}),
    row({1:"A",2:"Sub",21:1}),
    row({1:"525112",2:"Belanja",21:1,32:"BLU"}),
    row({2:"d1",18:1,20:1,21:1}),
    // RO dgn KRO 3996.BMA yang TIDAK ada header-nya → KRO harus dibangun
    row({1:"3996.BMA.002",2:"RO BMA",21:1}),
    row({1:"051",2:"Komp2",21:1}),
    row({1:"A",2:"Sub2",21:1}),
    row({1:"525112",2:"Belanja",21:1,32:"BLU"}),
    row({2:"d2",18:1,20:1,21:1}),
    // RO dgn KEGIATAN 4627 yang TIDAK ada header-nya → kegiatan + KRO dibangun
    row({1:"4627.EBA.962",2:"RO EBA gaji",21:1}),
    row({1:"052",2:"Komp3",21:1}),
    row({1:"A",2:"Sub3",21:1}),
    row({1:"511111",2:"Gaji",21:1,32:"RM"}),
    row({2:"d3 gaji",18:1,20:1,21:1}),
  ]);
  const byId=new Map(r4.nodes.map(n=>[n.tempId,n]));
  const kroParentKeg=(kroKode)=>{ const k=r4.nodes.find(n=>n.level==="KRO"&&n.kode===kroKode); let p=byId.get(k.parentTempId); return p?p.kode:null; };
  ok(r4.nodes.some(n=>n.level==="KRO"&&n.kode==="3996.BMA"),"KRO 3996.BMA dibangun dari kode RO");
  ok(kroParentKeg("3996.BMA")==="3996","KRO 3996.BMA di bawah Kegiatan 3996");
  ok(r4.nodes.some(n=>n.level==="KEGIATAN"&&n.kode==="4627"),"Kegiatan 4627 (hilang) dibangun dari kode RO");
  ok(kroParentKeg("4627.EBA")==="4627","KRO 4627.EBA di bawah Kegiatan 4627 (bukan 3996)");
  let bad=0;
  for(const n of r4.nodes){ if(n.level==="KRO"||n.level==="RO"){ let p=byId.get(n.parentTempId); while(p&&p.level!=="KEGIATAN")p=byId.get(p.parentTempId); if(p&&p.kode!==(n.kode||"").split(".")[0])bad++; } }
  ok(bad===0,"semua KRO/RO bersarang di kegiatan yang benar (0 salah prefix)");
  ok(r4.nodes.filter(n=>n.level==="DETAIL").length===3,"3 detail utuh setelah rekonstruksi");
}

// Kode SAMA pada induk (RO) yang sama, uraian beda → DIGABUNG (kode = patokan
// tunggal). Duplikat tak tersimpan & tak melanggar unique index sibling_kode;
// rincian (detail) dari keduanya TETAP terjaga di bawah node gabungan.
{
  const r3 = parseKertasKerja([
    row({1:"022.12",2:"Satker"}),
    row({1:"022.12.DL",2:"Program",21:1}),
    row({1:"3996",2:"Keg",21:1}),
    row({1:"3996.AEC",2:"KRO",21:1}),
    row({1:"3996.AE002",2:"RO",21:1}),
    // dua komponen "051" beda uraian
    row({1:"051",2:"Workshop Silabus",21:1}),
    row({1:"A",2:"Penyusunan",21:1}),
    row({1:"525112",2:"Belanja Barang",21:1,32:"BLU"}),
    row({2:"d1",18:1,20:1,21:1}),
    row({1:"051",2:"Basic Safety Training",21:1}),    // kode 051 LAGI, uraian beda
    row({1:"A",2:"Pelaksanaan BST",21:1}),
    row({1:"525112",2:"Belanja Barang",21:1,32:"BLU"}),
    row({2:"d2",18:1,20:1,21:1}),
    // duplikat sejati: komponen 052 uraian sama dua kali → tergabung
    row({1:"052",2:"Review Modul",21:1}),
    row({1:"A",2:"Tahap 1",21:1}),
    row({1:"525112",2:"Belanja Barang",21:1,32:"BLU"}),
    row({2:"d3",18:1,20:1,21:1}),
    row({1:"052",2:"Review Modul",21:1}),            // kode+uraian SAMA → gabung
    row({1:"A",2:"Tahap 1",21:1}),
    row({1:"525112",2:"Belanja Barang",21:1,32:"BLU"}),
    row({2:"d4",18:1,20:1,21:1}),
  ]);
  const komp = r3.nodes.filter(n=>n.level==="KOMPONEN");
  ok(komp.filter(n=>n.kode==="051").length===1,"dua komponen 051 (uraian beda) DIGABUNG jadi satu (kode = patokan)");
  ok(komp.filter(n=>n.kode==="052").length===1,"komponen 052 (uraian sama) digabung jadi satu");
  ok(r3.nodes.filter(n=>n.level==="DETAIL").length===4,"semua 4 detail terjaga (data tak hilang walau node digabung)");
  ok(komp.find(n=>n.kode==="051")?.uraian==="Workshop Silabus","komponen 051 gabungan memakai uraian kemunculan pertama (Basic Safety Training diserap)");
}
// Kode SAMA pada induk BERBEDA (RO berbeda) → TETAP terpisah: penggabungan
// ber-scope induk, jadi tak over-merge lintas induk.
{
  const r4 = parseKertasKerja([
    row({1:"022.12",2:"Satker"}),
    row({1:"022.12.DL",2:"Program",21:1}),
    row({1:"3996",2:"Keg",21:1}),
    row({1:"3996.AEC",2:"KRO",21:1}),
    row({1:"3996.AEC.001",2:"RO-1",21:1}),
    row({1:"051",2:"Komp di RO-1",21:1}),
    row({1:"A",2:"Sub",21:1}),
    row({1:"525112",2:"Akun",21:1,32:"BLU"}),
    row({2:"da",18:1,20:1,21:1}),
    row({1:"3996.AEC.002",2:"RO-2",21:1}),
    row({1:"051",2:"Komp di RO-2",21:1}),   // kode 051 sama, induk (RO) BEDA
    row({1:"A",2:"Sub",21:1}),
    row({1:"525112",2:"Akun",21:1,32:"BLU"}),
    row({2:"db",18:1,20:1,21:1}),
  ]);
  ok(r4.nodes.filter(n=>n.level==="RO").length===2,"dua RO berbeda terbentuk");
  ok(r4.nodes.filter(n=>n.level==="KOMPONEN"&&n.kode==="051").length===2,"komponen 051 di RO berbeda TETAP terpisah (scope induk)");
}
{
  const r2 = parseKertasKerja([
    row({1:"022.12",2:"Satker"}),
    row({2:"- Belanja Tunj Struktural PNS",18:1,20:30240000,21:30240000}), // detail operasional menggantung
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
  ok(r2.skipped.wrappedOperational===2,"2 baris operasional dibungkus (bukan dilewati)");
  ok(r2.counts.PROGRAM===2,"jadi 2 program: sintetis operasional + DL");
  ok(r2.nodes.some(n=>n.level==="PROGRAM" && (n.kode||"").endsWith(".00")),"ada program sintetis berkode '.00'");
  ok(r2.nodes.some(n=>n.uraian.includes("Lembur")),"detail operasional TETAP terimpor (tidak hilang)");
  ok(r2.counts.DETAIL===3,"3 detail: 2 operasional dibungkus + 1 nyata");
  // semua detail tetap di bawah akun
  const byId=new Map(r2.nodes.map(n=>[n.tempId,n]));
  ok(r2.nodes.filter(n=>n.level==="DETAIL").every(d=>{const p=byId.get(d.parentTempId); return p&&p.level==="AKUN";}),"semua detail (termasuk yang dibungkus) berada di bawah AKUN");
}

console.log("\nHasil: "+pass+" lulus, "+fail+" gagal"); if(fail>0)process.exit(1);
