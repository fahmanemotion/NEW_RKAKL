import { collectSubtree, remapSubtree } from "./src/lib/copy-subtree.ts";

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m)); };

const rows = [
  { id: "ro", parent_id: null, level: "RO", kode: "994", urutan: 0 },
  { id: "km", parent_id: "ro", level: "KOMPONEN", kode: "002", urutan: 0 },
  { id: "skA", parent_id: "km", level: "SUB_KOMPONEN", kode: "A", uraian: "Sub A", urutan: 0 },
  { id: "ak1", parent_id: "skA", level: "AKUN", kode: "521211", uraian: "ATK", sumber_dana: "RM", urutan: 0 },
  { id: "d1", parent_id: "ak1", level: "DETAIL", kode: null, uraian: "Kertas", volume: 10, satuan: "Rim", harga: 50000, jumlah: 500000, sumber_dana: "RM", jenis_belanja: "OPS", urutan: 0, volume_rincian: [{ qty: 10, sat: "Rim" }] },
  { id: "d2", parent_id: "ak1", level: "DETAIL", kode: null, uraian: "Tinta", volume: 4, satuan: "Botol", harga: 80000, jumlah: 320000, urutan: 1 },
  { id: "ak2", parent_id: "skA", level: "AKUN", kode: "521811", uraian: "Konsumsi", sumber_dana: "RM", urutan: 1 },
  { id: "d3", parent_id: "ak2", level: "DETAIL", kode: null, uraian: "Snack", volume: 20, satuan: "Box", harga: 25000, jumlah: 500000, urutan: 0 },
  // komponen tujuan tempel
  { id: "kmB", parent_id: "ro", level: "KOMPONEN", kode: "003", urutan: 1 },
];

console.log("collectSubtree:");
ok(collectSubtree(rows, "skA").length === 6, "subtree Sub Komponen A = 6 node (sub+2 akun+3 detail)");
ok(collectSubtree(rows, "ak1").length === 3, "subtree Akun 521211 = akun + 2 detail");
ok(collectSubtree(rows, "d1").length === 1, "subtree Detail = 1 node saja");

let n = 0;
const gen = () => "new" + (++n);

console.log("remapSubtree — salin Sub Komponen A ke Komponen B:");
const batches = remapSubtree(rows, "skA", "kmB", "U1", gen, 0);
const flat = batches.flat();
ok(flat.length === 6, "menghasilkan 6 baris baru");
ok(batches.length === 3, "3 batch (sub/akun/detail) terurut dangkal→dalam");
const root = flat.find((r) => r.level === "SUB_KOMPONEN");
ok(root.parent_id === "kmB", "root sub komponen menempel ke induk baru (kmB)");
ok(root.urutan === 0, "root memakai urutan tujuan");
ok(flat.every((r) => r.id.startsWith("new")), "semua id baru");
ok(flat.every((r) => r.usulan_id === "U1"), "usulan_id terisi");
// keterhubungan parent: akun menunjuk ke root baru, detail menunjuk akun baru
const akunNew = flat.filter((r) => r.level === "AKUN");
ok(akunNew.every((a) => a.parent_id === root.id), "akun baru menunjuk root sub komponen baru");
const detNew = flat.filter((r) => r.level === "DETAIL");
ok(detNew.every((d) => akunNew.some((a) => a.id === d.parent_id)), "detail baru menunjuk akun baru (bukan id lama)");
// data terbawa
const kertas = detNew.find((d) => d.uraian === "Kertas");
ok(kertas.volume === 10 && kertas.harga === 50000 && kertas.jumlah === 500000, "nilai detail terbawa");
ok(JSON.stringify(kertas.volume_rincian) === JSON.stringify([{ qty: 10, sat: "Rim" }]), "volume_rincian (segmen) ikut tersalin");
ok(akunNew.find((a) => a.kode === "521211").sumber_dana === "RM", "sumber dana akun terbawa");

console.log("remapSubtree — salin Detail saja:");
const b2 = remapSubtree(rows, "d1", "ak2", "U1", gen, 5).flat();
ok(b2.length === 1 && b2[0].level === "DETAIL", "hanya 1 detail");
ok(b2[0].parent_id === "ak2" && b2[0].urutan === 5, "detail menempel akun tujuan + urutan baru");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
