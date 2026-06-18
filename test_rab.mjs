import {
  buildRabPerKomponen,
  rincianText,
  terbilang,
  titleCase,
} from "./src/lib/rab-data.ts";
import { buildKertasKerja } from "./src/lib/kertas-kerja.ts";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m));
};

// Struktur: 1 program → keg → kro → ro → 2 komponen, masing-masing subkomp→akun→detail
const rows = [
  { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12.DL", uraian: "Program Dukungan", jumlah: 0, urutan: 0 },
  { id: "keg", parent_id: "p", level: "KEGIATAN", kode: "4627", uraian: "Keg", jumlah: 0, urutan: 0 },
  { id: "kro", parent_id: "keg", level: "KRO", kode: "4627.EBA", uraian: "Layanan Dukungan", jumlah: 0, urutan: 0, volume: 1, satuan: "Layanan" },
  { id: "ro", parent_id: "kro", level: "RO", kode: "4627.EBA.994", uraian: "Layanan Perkantoran", jumlah: 0, urutan: 0, volume: 1, satuan: "Layanan" },
  { id: "k1", parent_id: "ro", level: "KOMPONEN", kode: "001", uraian: "Gaji dan Tunjangan", jumlah: 0, urutan: 0 },
  { id: "s1", parent_id: "k1", level: "SUB_KOMPONEN", kode: "A", uraian: "Sub A", jumlah: 0, urutan: 0 },
  { id: "ak1", parent_id: "s1", level: "AKUN", kode: "511111", uraian: "Belanja Gaji", jumlah: 0, urutan: 0, sumber_dana: "RM" },
  { id: "d1", parent_id: "ak1", level: "DETAIL", kode: null, uraian: "Gaji Pokok", jumlah: 132000, urutan: 0, sumber_dana: "RM", jenis_belanja: "OPS", volume: 264, satuan: "OB", harga: 500, volume_rincian: [{ qty: 24, sat: "Org" }, { qty: 11, sat: "Bln" }] },
  { id: "k2", parent_id: "ro", level: "KOMPONEN", kode: "002", uraian: "Operasional Kantor", jumlah: 0, urutan: 1 },
  { id: "s2", parent_id: "k2", level: "SUB_KOMPONEN", kode: "A", uraian: "Kebutuhan Sehari-hari", jumlah: 0, urutan: 0 },
  { id: "ak2", parent_id: "s2", level: "AKUN", kode: "521811", uraian: "Belanja Barang Konsumsi", jumlah: 0, urutan: 0, sumber_dana: "RM" },
  { id: "d2", parent_id: "ak2", level: "DETAIL", kode: null, uraian: "Kertas", jumlah: 663000, urutan: 0, sumber_dana: "RM", jenis_belanja: "OPS", volume: 10, satuan: "Pack", harga: 66300 },
];
const kk = buildKertasKerja(rows);
const rab = buildRabPerKomponen(kk.rows);

console.log("buildRabPerKomponen:");
ok(rab.length === 2, "2 komponen → 2 RAB");
const r1 = rab.find((x) => x.komponenKode === "001");
const r2 = rab.find((x) => x.komponenKode === "002");
ok(r1.komponenUraian === "Gaji dan Tunjangan", "komponen 001 uraian benar");
ok(r1.kroKode === "4627.EBA" && r1.roKode === "4627.EBA.994", "konteks KRO & RO terisi");
ok(r1.roUraian === "Layanan Perkantoran", "Output/Keluaran = uraian RO");
ok(r1.programUraian === "Program Dukungan", "program terisi");
ok(r1.total === 132000, "total komponen 001 = 132000");
// lines komponen 001: SubKomp A, Akun 511111, Detail Gaji Pokok
ok(r1.lines.length === 3, "komponen 001 punya 3 baris (sub/akun/detail)");
ok(r1.lines[0].level === "SUB_KOMPONEN" && r1.lines[0].depth === 0, "baris pertama = sub komponen depth 0");
ok(r1.lines[1].level === "AKUN" && r1.lines[1].depth === 1, "baris kedua = akun depth 1");
ok(r1.lines[2].isDetail && r1.lines[2].depth === 2, "baris ketiga = detail depth 2");
ok(r2.lines.find((l) => l.isDetail).uraian === "Kertas", "komponen 002 detail = Kertas");

console.log("rincianText:");
ok(rincianText(r1.lines[2]) === "24 Org x 11 Bln", "rincian dari segmen: 24 Org x 11 Bln");
ok(rincianText(r2.lines.find((l) => l.isDetail)) === "10 Pack", "rincian tunggal: 10 Pack");
ok(rincianText({ segments: null, vol: null, satuan: null }) === "", "tanpa data → kosong");

console.log("terbilang:");
ok(terbilang(0) === "nol rupiah", "0 → nol rupiah");
ok(terbilang(1000) === "seribu rupiah", "1000 → seribu rupiah");
ok(terbilang(1500) === "seribu lima ratus rupiah", "1500");
ok(terbilang(132000) === "seratus tiga puluh dua ribu rupiah", "132000");
ok(terbilang(21) === "dua puluh satu rupiah", "21");
ok(terbilang(115) === "seratus lima belas rupiah", "115");
ok(terbilang(2_500_000) === "dua juta lima ratus ribu rupiah", "2.5 juta");
ok(terbilang(1_000_000_000) === "satu milyar rupiah", "1 milyar");
ok(titleCase("seratus ribu rupiah") === "Seratus Ribu Rupiah", "titleCase");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
