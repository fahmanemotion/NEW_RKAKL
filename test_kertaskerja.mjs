import { detailBuckets, buildKertasKerja, unitKodeFromRows } from "./src/lib/kertas-kerja.ts";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m));
};

// ── detailBuckets ───────────────────────────────────────────────────────────
console.log("detailBuckets:");
let b = detailBuckets(1000, "RM", "OPS", "521211"); // barang ops RM
ok(b.barOpsRM === 1000 && b.rm === 1000, "barang OPS RM → barOpsRM & rm");
b = detailBuckets(2000, "BLU", "OPS", "525112"); // barang ops BLU
ok(b.barOpsBLU === 2000 && b.blu === 2000, "barang OPS BLU → barOpsBLU & blu");
b = detailBuckets(3000, "RM", "NON_OPS", "521219"); // barang non RM
ok(b.barNonRM === 3000 && b.rm === 3000, "barang NON RM → barNonRM");
b = detailBuckets(4000, "BLU", "NON_OPS", "525112");
ok(b.barNonBLU === 4000 && b.blu === 4000, "barang NON BLU → barNonBLU");
b = detailBuckets(5000, "RM", "OPS", "511111"); // pegawai
ok(b.pegRM === 5000 && b.rm === 5000, "akun 51x → pegawai (pegRM)");
b = detailBuckets(6000, "BLU", "OPS", "537112"); // modal BLU
ok(b.modal === 6000 && b.blu === 6000, "akun 53x → modal, sumber BLU");
b = detailBuckets(7000, null, null, "999"); // default RM, barang ops
ok(b.rm === 7000 && b.barOpsRM === 7000, "sumber null → default RM");

// ── buildKertasKerja: hierarki & agregasi ──────────────────────────────────
console.log("buildKertasKerja:");
const rows = [
  { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12.DL", uraian: "Program", jumlah: 0, urutan: 0 },
  { id: "k", parent_id: "p", level: "KEGIATAN", kode: "1975", uraian: "Keg", jumlah: 0, urutan: 0 },
  { id: "kro", parent_id: "k", level: "KRO", kode: "1975.DAB", uraian: "KRO", jumlah: 0, urutan: 0, volume: 280, satuan: "Orang" },
  { id: "ro", parent_id: "kro", level: "RO", kode: "1975.DAB.002", uraian: "RO", jumlah: 0, urutan: 0, volume: 280, satuan: "Orang" },
  { id: "kmp", parent_id: "ro", level: "KOMPONEN", kode: "051", uraian: "Komp", jumlah: 0, urutan: 0 },
  { id: "sub", parent_id: "kmp", level: "SUB_KOMPONEN", kode: "A", uraian: "Sub", jumlah: 0, urutan: 0 },
  { id: "ak1", parent_id: "sub", level: "AKUN", kode: "521211", uraian: "Belanja Bahan", jumlah: 0, urutan: 0, sumber_dana: "RM" },
  { id: "d1", parent_id: "ak1", level: "DETAIL", kode: null, uraian: "Konsumsi", jumlah: 1000, urutan: 0, sumber_dana: "RM", jenis_belanja: "OPS", volume: 1, satuan: "KEG", harga: 1000 },
  { id: "ak2", parent_id: "sub", level: "AKUN", kode: "525112", uraian: "Belanja Barang", jumlah: 0, urutan: 1, sumber_dana: "BLU" },
  { id: "d2", parent_id: "ak2", level: "DETAIL", kode: null, uraian: "ATK", jumlah: 5000, urutan: 0, sumber_dana: "BLU", jenis_belanja: "NON_OPS", volume: 2, satuan: "Pkt", harga: 2500 },
];
const { rows: kk, total, totalJumlah } = buildKertasKerja(rows);
ok(totalJumlah === 6000, "total jumlah = 1000 + 5000 = 6000: " + totalJumlah);
ok(total.barOpsRM === 1000 && total.barNonBLU === 5000, "total bucket OPS-RM=1000, NON-BLU=5000");
ok(total.rm === 1000 && total.blu === 5000, "total sumber RM=1000, BLU=5000");
const prog = kk.find((r) => r.level === "PROGRAM");
ok(prog.jumlah === 6000, "program agregasi = 6000");
const akun1 = kk.find((r) => r.id === "ak1");
ok(akun1.sumber === "RM" && akun1.jumlah === 1000, "akun1 sumber RM, jumlah 1000");
// urutan pre-order: program sebelum detail
ok(kk[0].level === "PROGRAM" && kk[kk.length - 1].isDetail, "urutan pre-order benar");
// depth
ok(kk.find((r) => r.level === "DETAIL").depth === 7, "depth DETAIL = 7");

// ── unitKodeFromRows ────────────────────────────────────────────────────────
console.log("unitKodeFromRows:");
ok(unitKodeFromRows(kk) === "022.12", "kode unit dari program → 022.12");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
