import { flattenForGrid } from "./src/lib/tree.ts";
let pass=0, fail=0; const ok=(c,m)=>{c?(pass++,console.log("  \u2713 "+m)):(fail++,console.log("  \u2717 "+m));};
const base = [
  {id:"prog",parent_id:null,level:"PROGRAM",kode:"022.12.DL",uraian:"Prog",urutan:0,jumlah:0},
  {id:"keg",parent_id:"prog",level:"KEGIATAN",kode:"3996",uraian:"Keg",urutan:0,jumlah:0},
  {id:"kro",parent_id:"keg",level:"KRO",kode:"3996.AEC",uraian:"KRO",urutan:0,jumlah:0},
  {id:"ro",parent_id:"kro",level:"RO",kode:"3996.AE002",uraian:"RO",urutan:0,jumlah:0},
  {id:"komp",parent_id:"ro",level:"KOMPONEN",kode:"051",uraian:"Komp",urutan:0,jumlah:0},
  {id:"sub",parent_id:"komp",level:"SUB_KOMPONEN",kode:"A",uraian:"Sub",urutan:0,jumlah:0},
  {id:"akun",parent_id:"sub",level:"AKUN",kode:"525112",uraian:"Belanja",urutan:0,jumlah:0},
];
const rows = [
  ...base,
  {id:"hdr",parent_id:"akun",level:"HEADER",kode:"",uraian:"Diklat DPV",urutan:1,jumlah:0},
  {id:"d1",parent_id:"hdr",level:"DETAIL",kode:"",uraian:"Teori",urutan:0,jumlah:100},
  {id:"d2",parent_id:"hdr",level:"DETAIL",kode:"",uraian:"Praktek",urutan:1,jumlah:200},
  {id:"d3",parent_id:"akun",level:"DETAIL",kode:"",uraian:"Lepas",urutan:2,jumlah:50},
];
const { gridRows, total } = flattenForGrid(rows);
const g = (id)=>gridRows.find(r=>r.id===id);
ok(g("akun").jumlah===350,"Akun = Σ(header + detail lepas) = 350");
ok(g("hdr").jumlah===300,"Header = Σ detail di bawahnya = 300");
ok(g("hdr").type==="HEADER","baris header bertipe HEADER");
ok(g("hdr").depth===7 && g("d1").depth===8 && g("d3").depth===7,"indentasi: detail di header lebih dalam dari detail lepas");
ok(total===350,"total root mencakup nilai header");
// hanya header (tanpa detail lepas) → akun = nilai header
const rows2=[...base,
  {id:"h",parent_id:"akun",level:"HEADER",kode:"",uraian:"H",urutan:0,jumlah:0},
  {id:"x",parent_id:"h",level:"DETAIL",kode:"",uraian:"x",urutan:0,jumlah:777}];
ok(flattenForGrid(rows2).gridRows.find(r=>r.id==="akun").jumlah===777,"akun = nilai header bila tak ada detail lepas");
console.log("\nHasil: "+pass+" lulus, "+fail+" gagal"); process.exit(fail?1:0);
