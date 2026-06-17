import { remapStruktur, LEVEL_DEPTH } from "./src/lib/copy-anggaran.ts";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m));
};

// id generator deterministik
let n = 0;
const gen = () => "new-" + ++n;

const rows = [
  { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12.DL", uraian: "Prog", jumlah: 0, urutan: 0, referensi_id: "rp", volume: null, satuan: null, harga: null, sumber_dana: null, jenis_belanja: null },
  { id: "ak", parent_id: "sub", level: "AKUN", kode: "521211", uraian: "Akun", jumlah: 0, urutan: 0, referensi_id: null, volume: null, satuan: null, harga: null, sumber_dana: "RM", jenis_belanja: null },
  { id: "d1", parent_id: "ak", level: "DETAIL", kode: null, uraian: "Detil", jumlah: 1000, urutan: 0, referensi_id: null, volume: 1, satuan: "KEG", harga: 1000, sumber_dana: "RM", jenis_belanja: "OPS" },
  { id: "sub", parent_id: "p", level: "SUB_KOMPONEN", kode: "A", uraian: "Sub", jumlah: 0, urutan: 0, referensi_id: null, volume: null, satuan: null, harga: null, sumber_dana: null, jenis_belanja: null },
];

const batches = remapStruktur(rows, "TARGET", gen);
const flat = batches.flat();

console.log("remapStruktur:");
ok(flat.length === 4, "jumlah baris sama (4)");
ok(flat.every((r) => r.usulan_id === "TARGET"), "semua usulan_id = TARGET");
ok(flat.every((r) => r.id.startsWith("new-")), "semua id baru");

// batch terurut berdasarkan kedalaman level (induk dulu)
const depthSeq = batches.map((b) => LEVEL_DEPTH[b[0].level]);
ok(
  depthSeq.every((d, i) => i === 0 || d >= depthSeq[i - 1]),
  "batch terurut menaik berdasarkan kedalaman level",
);
// program (depth 0) ada di batch pertama, detail (7) di batch terakhir
ok(batches[0][0].level === "PROGRAM", "batch pertama = PROGRAM");
ok(batches[batches.length - 1][0].level === "DETAIL", "batch terakhir = DETAIL");

// parent remap benar: akun.parent → sub id baru; detail.parent → akun id baru
const newAk = flat.find((r) => r.kode === "521211");
const newSub = flat.find((r) => r.level === "SUB_KOMPONEN");
const newDet = flat.find((r) => r.level === "DETAIL");
const newProg = flat.find((r) => r.level === "PROGRAM");
ok(newAk.parent_id === newSub.id, "AKUN.parent → id baru SUB_KOMPONEN");
ok(newDet.parent_id === newAk.id, "DETAIL.parent → id baru AKUN");
ok(newSub.parent_id === newProg.id, "SUB.parent → id baru PROGRAM");
ok(newProg.parent_id === null, "PROGRAM.parent = null");

// field penting ikut tersalin
ok(newDet.jumlah === 1000 && newDet.volume === 1 && newDet.harga === 1000, "nilai detail tersalin");
ok(newProg.referensi_id === "rp", "referensi_id tersalin");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
