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

// ── Urutan AKUN by kode (bukan urutan input) ────────────────────────────────
console.log("Urutan AKUN hirarkis by kode:");
{
  const rows = [
    { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12", uraian: "P", jumlah: 0, urutan: 0 },
    { id: "kg", parent_id: "p", level: "KEGIATAN", kode: "1975", uraian: "K", jumlah: 0, urutan: 0 },
    { id: "kr", parent_id: "kg", level: "KRO", kode: "1975.DAB", uraian: "KR", jumlah: 0, urutan: 0 },
    { id: "ro", parent_id: "kr", level: "RO", kode: "1975.DAB.002", uraian: "RO", jumlah: 0, urutan: 0 },
    { id: "km", parent_id: "ro", level: "KOMPONEN", kode: "051", uraian: "KM", jumlah: 0, urutan: 0 },
    { id: "sk", parent_id: "km", level: "SUB_KOMPONEN", kode: "A", uraian: "SK", jumlah: 0, urutan: 0 },
    // diinput: 521811 dulu (urutan 0), lalu 521211 (urutan 1)
    { id: "ak1", parent_id: "sk", level: "AKUN", kode: "521811", uraian: "Konsumsi", jumlah: 0, urutan: 0, sumber_dana: "RM" },
    { id: "d1", parent_id: "ak1", level: "DETAIL", kode: null, uraian: "x", jumlah: 100, urutan: 0, volume: 1, satuan: "x", harga: 100 },
    { id: "ak2", parent_id: "sk", level: "AKUN", kode: "521211", uraian: "ATK", jumlah: 0, urutan: 1, sumber_dana: "RM" },
    { id: "d2", parent_id: "ak2", level: "DETAIL", kode: null, uraian: "y", jumlah: 200, urutan: 0, volume: 1, satuan: "y", harga: 200 },
  ];
  const out = buildKertasKerja(rows).rows;
  const akunOrder = out.filter((r) => r.level === "AKUN").map((r) => r.kode);
  ok(akunOrder[0] === "521211" && akunOrder[1] === "521811", "521211 di atas 521811 walau diinput belakangan");
  // detail tetap mengikuti akun induknya
  const idxAk211 = out.findIndex((r) => r.kode === "521211");
  const idxAk811 = out.findIndex((r) => r.kode === "521811");
  const idxD2 = out.findIndex((r) => r.id === "d2");
  ok(idxAk211 < idxD2 && idxD2 < idxAk811, "detail 521211 tetap menempel di bawah akunnya, sebelum 521811");
}

// ── Urutan Kegiatan/KRO/RO hirarkis by kode ─────────────────────────────────
console.log("Urutan Program→RO hirarkis by kode:");
{
  const rows = [
    { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12", uraian: "P", jumlah: 0, urutan: 0 },
    // dua kegiatan diinput terbalik (3996 dulu, lalu 1975)
    { id: "kg2", parent_id: "p", level: "KEGIATAN", kode: "3996", uraian: "Keg2", jumlah: 0, urutan: 0 },
    { id: "kg1", parent_id: "p", level: "KEGIATAN", kode: "1975", uraian: "Keg1", jumlah: 0, urutan: 1 },
    // dua KRO di kg1 terbalik
    { id: "krB", parent_id: "kg1", level: "KRO", kode: "1975.DCB", uraian: "KRO B", jumlah: 0, urutan: 0 },
    { id: "krA", parent_id: "kg1", level: "KRO", kode: "1975.DAB", uraian: "KRO A", jumlah: 0, urutan: 1 },
    // dua RO di krA terbalik
    { id: "ro9", parent_id: "krA", level: "RO", kode: "1975.DAB.994", uraian: "RO 994", jumlah: 0, urutan: 0 },
    { id: "ro2", parent_id: "krA", level: "RO", kode: "1975.DAB.002", uraian: "RO 002", jumlah: 0, urutan: 1 },
  ];
  const out = buildKertasKerja(rows).rows;
  const kegOrder = out.filter((r) => r.level === "KEGIATAN").map((r) => r.kode);
  ok(kegOrder[0] === "1975" && kegOrder[1] === "3996", "Kegiatan 1975 di atas 3996 (walau diinput belakangan)");
  const kroOrder = out.filter((r) => r.level === "KRO").map((r) => r.kode);
  ok(kroOrder[0] === "1975.DAB" && kroOrder[1] === "1975.DCB", "KRO DAB di atas DCB");
  const roOrder = out.filter((r) => r.level === "RO").map((r) => r.kode);
  ok(roOrder[0] === "1975.DAB.002" && roOrder[1] === "1975.DAB.994", "RO 002 di atas 994");
}

// Komponen juga urut by kode (walau diinput acak)
console.log("Urutan Komponen hirarkis by kode:");
{
  const rows = [
    { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12", uraian: "P", jumlah: 0, urutan: 0 },
    { id: "kg", parent_id: "p", level: "KEGIATAN", kode: "3996", uraian: "K", jumlah: 0, urutan: 0 },
    { id: "kro", parent_id: "kg", level: "KRO", kode: "3996.AEC", uraian: "KRO", jumlah: 0, urutan: 0 },
    { id: "ro", parent_id: "kro", level: "RO", kode: "3996.AE002", uraian: "RO", jumlah: 0, urutan: 0 },
    // komponen diinput acak: 053, 051, 052, 601
    { id: "c53", parent_id: "ro", level: "KOMPONEN", kode: "053", uraian: "C53", jumlah: 0, urutan: 0 },
    { id: "c51", parent_id: "ro", level: "KOMPONEN", kode: "051", uraian: "C51", jumlah: 0, urutan: 1 },
    { id: "c52", parent_id: "ro", level: "KOMPONEN", kode: "052", uraian: "C52", jumlah: 0, urutan: 2 },
    { id: "c601", parent_id: "ro", level: "KOMPONEN", kode: "601", uraian: "C601", jumlah: 0, urutan: 3 },
  ];
  const komp = buildKertasKerja(rows).rows.filter((r) => r.level === "KOMPONEN").map((r) => r.kode);
  ok(JSON.stringify(komp) === JSON.stringify(["051", "052", "053", "601"]), "Komponen terurut 051,052,053,601 (walau diinput acak)");
}

// ── HEADER diawali ">> " pada output kertas kerja ───────────────────────────
console.log("Header '>>':");
{
  const rows = [
    { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12.DL", uraian: "Prog", urutan: 0, jumlah: 0 },
    { id: "k", parent_id: "p", level: "KEGIATAN", kode: "3996", uraian: "Keg", urutan: 0, jumlah: 0 },
    { id: "kr", parent_id: "k", level: "KRO", kode: "3996.AEC", uraian: "KRO", urutan: 0, jumlah: 0 },
    { id: "ro", parent_id: "kr", level: "RO", kode: "3996.AE002", uraian: "RO", urutan: 0, jumlah: 0 },
    { id: "ko", parent_id: "ro", level: "KOMPONEN", kode: "051", uraian: "Komp", urutan: 0, jumlah: 0 },
    { id: "s", parent_id: "ko", level: "SUB_KOMPONEN", kode: "A", uraian: "Sub", urutan: 0, jumlah: 0 },
    { id: "ak", parent_id: "s", level: "AKUN", kode: "525112", uraian: "Belanja", urutan: 0, jumlah: 0 },
    { id: "h", parent_id: "ak", level: "HEADER", kode: "", uraian: "Kegiatan Satu atap", urutan: 0, jumlah: 0 },
    { id: "d", parent_id: "h", level: "DETAIL", kode: "", uraian: "Konsumsi", urutan: 0, jumlah: 100 },
  ];
  const kk = buildKertasKerja(rows);
  const h = kk.rows.find((r) => r.id === "h");
  const d = kk.rows.find((r) => r.id === "d");
  ok(h.uraian === ">> Kegiatan Satu atap", "HEADER diawali '>> '");
  ok(d.uraian === "Konsumsi", "DETAIL tetap apa adanya (prefix '- ' ditambah saat render)");
}

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);