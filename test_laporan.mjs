import {
  rekapSumber,
  rekapJenis,
  rekapKategori,
  rekapStruktur,
  rekapAkun,
} from "./src/lib/laporan-data.ts";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m));
};

const total = {
  pegRM: 1000,
  barOpsRM: 500,
  barOpsBLU: 300,
  barNonRM: 200,
  barNonBLU: 100,
  modal: 900,
  rm: 1700,
  blu: 400,
  sbsn: 900,
};
const totalJumlah = 3000;

console.log("rekapSumber:");
const s = rekapSumber(total, totalJumlah);
ok(s[0].value === 1700 && Math.abs(s[0].pct - 56.6667) < 0.01, "RM 1700 (~56.67%)");
ok(s[1].value === 400 && s[2].value === 900, "BLU 400, SBSN 900");
ok(s.reduce((a, b) => a + b.value, 0) === totalJumlah, "Σ sumber = total");

console.log("rekapJenis:");
const j = rekapJenis(total, totalJumlah);
ok(j[0].value === 1000, "Pegawai 1000");
ok(j[1].value === 800, "Barang Ops = 500+300 = 800");
ok(j[2].value === 300, "Barang Non = 200+100 = 300");
ok(j[3].value === 900, "Modal 900");
ok(j.reduce((a, b) => a + b.value, 0) === totalJumlah, "Σ jenis = total");

console.log("rekapKategori:");
const k = rekapKategori(total, totalJumlah);
ok(k[0].value === 1800, "Operasional = 1000+500+300 = 1800");
ok(k[1].value === 1200, "Non Operasional = 200+100+900 = 1200");
ok(k[0].value + k[1].value === totalJumlah, "Σ kategori = total");

console.log("rekapStruktur:");
const rows = [
  { kode: "022.12.DL", uraian: "Program", level: "PROGRAM", depth: 0, jumlah: 3000 },
  { kode: "1975", uraian: "Keg", level: "KEGIATAN", depth: 1, jumlah: 3000 },
  { kode: "1975.DAB", uraian: "KRO", level: "KRO", depth: 2, jumlah: 3000 },
  { kode: "1975.DAB.002", uraian: "RO", level: "RO", depth: 3, jumlah: 3000 },
  { kode: "051", uraian: "Komp", level: "KOMPONEN", depth: 4, jumlah: 3000 },
  { kode: "521211", uraian: "Akun", level: "AKUN", depth: 6, jumlah: 3000 },
];
const rk = rekapStruktur(rows, 3);
ok(rk.length === 4, "depth<=3 → 4 baris (Program..RO)");
ok(rk.every((r) => r.depth <= 3), "tidak ada depth > 3");
ok(rekapStruktur(rows, 1).length === 2, "maxDepth=1 → 2 baris");

// rekapAkun — agregasi per kode akun
const akunRows = [
  { kode: "521211", uraian: "Belanja Bahan", level: "AKUN", depth: 6, jumlah: 1000 },
  { kode: "525112", uraian: "Belanja Barang", level: "AKUN", depth: 6, jumlah: 2000 },
  { kode: "521211", uraian: "Belanja Bahan", level: "AKUN", depth: 6, jumlah: 500 },
  { kode: "537112", uraian: "Modal BLU", level: "AKUN", depth: 6, jumlah: 1500 },
  { kode: null, uraian: "Detil bukan akun", level: "DETAIL", depth: 7, jumlah: 9999 },
];
const ra = rekapAkun(akunRows, 5000);
ok(ra.length === 3, "rekapAkun: 3 kode unik (521211 digabung)");
const a521 = ra.find((x) => x.kode === "521211");
ok(a521.value === 1500, "521211 digabung = 1000 + 500 = 1500");
ok(a521.jenis === "Barang", "521211 → jenis Barang (52x)");
ok(ra.find((x) => x.kode === "537112").jenis === "Modal", "537112 → Modal (53x)");
ok(Math.abs(a521.pct - 30) < 0.001, "521211 pct = 1500/5000 = 30%");
ok(ra[0].kode === "521211" && ra[2].kode === "537112", "terurut berdasarkan kode");
ok(!ra.some((x) => x.value === 9999), "baris DETAIL diabaikan");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
