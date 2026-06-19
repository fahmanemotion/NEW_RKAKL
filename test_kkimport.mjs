import { parseKertasKerja, levelOf } from "./src/lib/kertas-kerja-import.ts";
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log("  \u2713 "+m)):(fail++,console.log("  \u2717 "+m));};

console.log("levelOf:");
ok(levelOf("022.12.DL","x")==="PROGRAM","022.12.DL = PROGRAM");
ok(levelOf("022.12","x")==="UNIT","022.12 = UNIT (dilewati)");
ok(levelOf("3996","x")==="KEGIATAN","3996 = KEGIATAN");
ok(levelOf("3996.AEC","x")==="KRO","3996.AEC = KRO");
ok(levelOf("3996.AEC.002","x")==="RO","3996.AEC.002 = RO");
ok(levelOf("051","x")==="KOMPONEN","051 = KOMPONEN");
ok(levelOf("A","x")==="SUB_KOMPONEN","A = SUB_KOMPONEN");
ok(levelOf("525112","x")==="AKUN","525112 = AKUN");
ok(levelOf("","- Goodie Bag")==="DETAIL","kode kosong + '-' = DETAIL");
ok(levelOf("","Belanja")===null,"kode kosong tanpa '-' = null");

// AOA: kolom 0..32. Bangun baris dgn helper.
function row(obj){ const r=new Array(33).fill(""); for(const[k,v]of Object.entries(obj)) r[k]=v; return r; }
const aoa=[
  row({1:"022.12",2:"Unit"}),                          // UNIT → dilewati
  row({1:"022.12.DL",2:"Program A",21:100000}),        // PROGRAM
  row({1:"3996",2:"Keg",21:100000}),                   // KEGIATAN
  row({1:"3996.AEC",2:"KRO",21:100000}),               // KRO
  row({1:"3996.AEC.002",2:"RO",21:100000}),            // RO
  row({1:"051",2:"Komp",21:100000}),                   // KOMPONEN
  row({1:"A",2:"Sub A",21:100000}),                    // SUB_KOMPONEN
  row({1:"525112",2:"Belanja Barang",21:100000,26:100000,32:"BLU"}), // AKUN (nonops BLU)
  // detail multi-segmen: 9 keg x 1 buah = 9 buah, harga 55000
  row({2:"- Goodie Bag",4:9,5:"keg",7:1,8:"buah",18:9,19:"buah",20:55000,21:495000}),
  // detail tunggal: 1 Keg
  row({2:" -Spanduk",18:1,19:"Keg",20:200000,21:200000}),
];
const res=parseKertasKerja(aoa);
console.log("parseKertasKerja:");
ok(res.counts.PROGRAM===1 && res.counts.AKUN===1 && res.counts.DETAIL===2,"jumlah node per level benar");
ok(res.nodes.length===9,"baris UNIT dilewati (9 node)");
const byId=new Map(res.nodes.map(n=>[n.tempId,n]));
const det1=res.nodes.find(n=>n.uraian==="Goodie Bag");
ok(det1.level==="DETAIL" && det1.kode===null,"detail tanpa kode");
ok(JSON.stringify(det1.segments)===JSON.stringify([{qty:9,sat:"keg"},{qty:1,sat:"buah"}]),"segmen multi terbaca");
ok(det1.volume===9 && det1.satuan==="buah" && det1.harga===55000 && det1.jumlah===495000,"vol/satuan/harga/jumlah detail");
const akun=byId.get(det1.parentTempId);
ok(akun.level==="AKUN" && akun.kode==="525112","detail induknya AKUN 525112");
ok(akun.sumber_dana==="BLU" && akun.jenis_belanja==="NON_OPS","akun sumber BLU + NON_OPS (dari kolom nonops)");
ok(det1.sumber_dana==="BLU" && det1.jenis_belanja==="NON_OPS","detail mewarisi sumber & jenis dari akun");
const det2=res.nodes.find(n=>n.uraian==="Spanduk");
ok(det2.segments===null && det2.volume===1 && det2.satuan==="Keg","detail tunggal: segmen null");
// rantai parent
ok(res.programTotals[0].kode==="022.12.DL" && res.total===100000,"program total");

console.log("\nHasil: "+pass+" lulus, "+fail+" gagal"); if(fail>0)process.exit(1);
