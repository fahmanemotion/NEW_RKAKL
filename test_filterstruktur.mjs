import { filterStruktur, programAncestorId } from "./src/lib/tree.ts";
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log("  \u2713 "+m)):(fail++,console.log("  \u2717 "+m));};
const R=(id,parent,level,kode)=>({id,parent_id:parent,level,kode,uraian:kode,jumlah:0,urutan:0});
// Dua program; P1 punya 2 KRO, P2 punya 1 KRO.
const rows=[
  R("p1",null,"PROGRAM","022.12.DL"),
   R("k1","p1","KEGIATAN","3996"),
    R("kroA","k1","KRO","3996.AEC"),
     R("roA","kroA","RO","3996.AEC.002"),
      R("kmA","roA","KOMPONEN","051"),
    R("kroB","k1","KRO","3996.AFA"),
     R("roB","kroB","RO","3996.AFA.001"),
  R("p2",null,"PROGRAM","022.12.WA"),
   R("k2","p2","KEGIATAN","4257"),
    R("kroC","k2","KRO","4257.EBA"),
     R("roC","kroC","RO","4257.EBA.001"),
];
const ids=(arr)=>arr.map(r=>r.id).sort().join(",");

console.log("tanpa filter:");
ok(filterStruktur(rows,null,null).length===rows.length,"programId null → semua baris");

console.log("filter program saja (P1):");
const fp=filterStruktur(rows,"p1",null);
ok(fp.every(r=>["p1","k1","kroA","roA","kmA","kroB","roB"].includes(r.id)),"hanya subtree P1");
ok(!fp.some(r=>r.id.startsWith("p2")||["k2","kroC","roC"].includes(r.id)),"P2 tidak ikut");
ok(fp.length===7,"P1 subtree = 7 node");

console.log("filter program + KRO (P1 + kroA):");
const fk=filterStruktur(rows,"p1","kroA");
ok(ids(fk)===ids([{id:"p1"},{id:"k1"},{id:"kroA"},{id:"roA"},{id:"kmA"}]),"leluhur (p1,k1) + subtree kroA (kroA,roA,kmA)");
ok(!fk.some(r=>r.id==="kroB"||r.id==="roB"),"KRO lain (kroB) tidak ikut");

console.log("KRO di program berbeda diabaikan jika tak cocok byId:");
const fk2=filterStruktur(rows,"p2","kroC");
ok(ids(fk2)===ids([{id:"p2"},{id:"k2"},{id:"kroC"},{id:"roC"}]),"P2 + kroC → p2,k2,kroC,roC");

console.log("programAncestorId:");
ok(programAncestorId(rows,"kmA")==="p1","komponen kmA → program p1");
ok(programAncestorId(rows,"roC")==="p2","ro roC → program p2");
ok(programAncestorId(rows,"p1")==="p1","program → dirinya");

console.log("\nHasil: "+pass+" lulus, "+fail+" gagal"); if(fail>0)process.exit(1);
