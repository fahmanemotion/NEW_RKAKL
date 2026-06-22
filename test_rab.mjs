import {
  buildRabPerKomponen,
  buildRabPerSubKomponen,
  rincianText,
  terbilang,
  titleCase,
} from "./src/lib/rab-data.ts";
import { buildKertasKerja } from "./src/lib/kertas-kerja.ts";

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m)); };

const rows = [
  { id: "p", parent_id: null, level: "PROGRAM", kode: "022.12.DL", uraian: "Program Dukungan", jumlah: 0, urutan: 0 },
  { id: "keg", parent_id: "p", level: "KEGIATAN", kode: "4627", uraian: "Keg", jumlah: 0, urutan: 0 },
  { id: "kro", parent_id: "keg", level: "KRO", kode: "4627.EBA", uraian: "Layanan Dukungan", jumlah: 0, urutan: 0, volume: 1, satuan: "Layanan" },
  { id: "ro", parent_id: "kro", level: "RO", kode: "4627.EBA.994", uraian: "Layanan Perkantoran", jumlah: 0, urutan: 0, volume: 1, satuan: "Layanan" },
  { id: "k2", parent_id: "ro", level: "KOMPONEN", kode: "002", uraian: "Operasional Kantor", jumlah: 0, urutan: 1 },
  { id: "sA", parent_id: "k2", level: "SUB_KOMPONEN", kode: "A", uraian: "Kebutuhan Sehari-hari", jumlah: 0, urutan: 0 },
  { id: "akA", parent_id: "sA", level: "AKUN", kode: "522191", uraian: "Belanja Jasa", jumlah: 0, urutan: 0, sumber_dana: "RM" },
  { id: "dA", parent_id: "akA", level: "DETAIL", kode: null, uraian: "Satpam", jumlah: 4810000, urutan: 0, volume: 845, satuan: "OB", harga: 5700, volume_rincian: [{ qty: 65, sat: "Org" }, { qty: 13, sat: "Bln" }] },
  { id: "sB", parent_id: "k2", level: "SUB_KOMPONEN", kode: "B", uraian: "Langganan Daya", jumlah: 0, urutan: 1 },
  { id: "akB", parent_id: "sB", level: "AKUN", kode: "522111", uraian: "Belanja Listrik", jumlah: 0, urutan: 0, sumber_dana: "RM" },
  { id: "dB", parent_id: "akB", level: "DETAIL", kode: null, uraian: "Listrik", jumlah: 1200000, urutan: 0, volume: 12, satuan: "Bln", harga: 100000 },
];
const kk = buildKertasKerja(rows);

console.log("buildRabPerKomponen (rekap):");
const perK = buildRabPerKomponen(kk.rows);
ok(perK.length === 1, "1 komponen → 1 unit");
const k = perK[0];
ok(k.level === "KOMPONEN" && k.sheetName === "002", "level KOMPONEN, sheet '002'");
ok(k.lines.length === 2, "rekap: 2 baris sub komponen (A,B)");
ok(k.lines.every((l) => l.level === "SUB_KOMPONEN" && !l.isDetail), "semua baris = sub komponen ringkas (tanpa detail)");
ok(k.lines[0].jumlah === 4810000 && k.lines[1].jumlah === 1200000, "jumlah tiap sub komponen benar");
ok(k.total === 6010000, "total komponen = 6.010.000");
ok(k.subKode === null, "mode komponen: subKode null");
ok(k.programKode === "022.12.DL" && k.programUraian === "Program Dukungan", "program kode & uraian terisi (untuk filter dropdown)");

console.log("buildRabPerSubKomponen (rincian):");
const perS = buildRabPerSubKomponen(kk.rows);
ok(perS.length === 2, "2 sub komponen → 2 unit");
const a = perS.find((x) => x.subKode === "A");
ok(a.level === "SUB_KOMPONEN" && a.sheetName === "002.A", "sheet '002.A'");
ok(a.komponenKode === "002" && a.komponenUraian === "Operasional Kantor", "konteks komponen induk");
ok(a.subUraian === "Kebutuhan Sehari-hari", "uraian sub komponen");
ok(a.total === 4810000, "total sub komponen A");
// rincian penuh: akun + detail
ok(a.lines.length === 2, "rincian: akun + detail (2 baris)");
ok(a.lines[0].level === "AKUN" && a.lines[1].isDetail, "akun lalu detail");
ok(a.roUraian === "Layanan Perkantoran" && a.kroKode === "4627.EBA", "konteks RO & KRO");

console.log("rincianText / terbilang:");
ok(rincianText(a.lines[1]) === "65 Org x 13 Bln", "rincian dari segmen");
ok(terbilang(6010000) === "enam juta sepuluh ribu rupiah", "terbilang 6.010.000");
ok(terbilang(1500) === "seribu lima ratus rupiah", "1500");
ok(titleCase(terbilang(1000)) === "Seribu Rupiah", "titleCase");

// Nama file RAB sesuai format SAKTI: {RO}.{komponen}.{sub}
import { rabFileCode, safeFileName } from "./src/lib/rab-data.ts";
console.log("rabFileCode / safeFileName:");
{
  const sub = perS[0];
  ok(
    rabFileCode(sub) === `${sub.roKode}.${sub.komponenKode}.${sub.subKode}`,
    `sub → ${rabFileCode(sub)} (RO.komponen.sub)`,
  );
  // Contoh persis yang diminta user.
  ok(
    rabFileCode({ level: "SUB_KOMPONEN", roKode: "3996.AEC.002", komponenKode: "051", subKode: "A" }) ===
      "3996.AEC.002.051.A",
    "format contoh 3996.AEC.002.051.A",
  );
  ok(
    rabFileCode({ level: "KOMPONEN", roKode: "3996.AEC.002", komponenKode: "051", subKode: null }) ===
      "3996.AEC.002.051",
    "per komponen → 3996.AEC.002.051 (tanpa sub)",
  );
  ok(safeFileName('3996.AEC.002/051:A') === "3996.AEC.002_051_A", "karakter ilegal diganti, titik tetap");
  ok(safeFileName("") === "RAB", "kosong → RAB");
}

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
