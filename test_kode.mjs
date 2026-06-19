import { parseKodeSheet } from "./src/lib/kode-import.ts";

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m)); };

// Header + beberapa baris jalur penuh (mirip template).
const raw = [
  ["BA", "URAIAN BA", "PROGRAM", "URAIAN PROGRAM", "KEGIATAN", "URAIAN KEGIATAN", "KRO", "URAIAN KRO", "RO", "URAIAN RO", "KOMP", "URAIAN KOMP"],
  [22, "KEMENTERIAN PERHUBUNGAN", "12.DL", "Program Diklat", "1975", "Pengembangan SDM", "DAB", "Pendidikan Vokasi", 2, "Diklat Pembentukan", 51, "Diploma IV Nautika"],
  [22, "KEMENTERIAN PERHUBUNGAN", "12.DL", "Program Diklat", "1975", "Pengembangan SDM", "DAB", "Pendidikan Vokasi", 2, "Diklat Pembentukan", 601, "Dukungan Diklat"],
  [22, "KEMENTERIAN PERHUBUNGAN", "12.DL", "Program Diklat", 3996, "Pendidikan Transportasi", "DCB", "Pelatihan Infrastruktur", 4, "Diklat Peningkatan", "051", "DP-I Nautika"],
  ["", "", "", "", "", "", "", "", "", "", "", ""], // baris kosong → diabaikan
];
const p = parseKodeSheet(raw);

console.log("BA:");
ok(p.ba.length === 1, "1 BA unik");
ok(p.ba[0].kode === "22" && p.ba[0].nama === "KEMENTERIAN PERHUBUNGAN", "BA kode & nama");

console.log("Program / Kegiatan:");
ok(p.program.length === 1, "1 program (12.DL)");
ok(p.program[0].kode === "12.DL" && p.program[0].ba === "22", "program kode apa adanya + induk BA");
ok(p.kegiatan.length === 2, "2 kegiatan (1975, 3996)");
ok(p.kegiatan.some((k) => k.kode === "1975") && p.kegiatan.some((k) => k.kode === "3996"), "kegiatan di-pad 4 digit");

console.log("KRO / RO / Komponen:");
ok(p.kro.length === 2, "2 KRO (DAB, DCB)");
ok(p.kro.find((x) => x.kode === "DAB").kegiatan === "1975", "KRO DAB induk kegiatan 1975");
ok(p.ro.length === 2, "2 RO");
ok(p.ro.some((x) => x.kode === "002") && p.ro.some((x) => x.kode === "004"), "RO di-pad 3 digit (002, 004)");
ok(p.komponen.length === 3, "3 komponen");
ok(p.komponen.some((x) => x.kode === "051") && p.komponen.some((x) => x.kode === "601"), "komponen di-pad 3 digit (051, 601)");
const k051 = p.komponen.find((x) => x.kode === "051" && x.kro === "DCB");
ok(k051.ro === "004" && k051.kegiatan === "3996", "komponen 051 (jalur DCB) membawa induk lengkap");
ok(p.komponen.filter((x) => x.kode === "051").length === 2, "dua '051' di jalur berbeda tetap terpisah");
ok(p.dataRows === 3, "3 baris data (header & kosong dilewati)");

console.log("Dedup:");
const raw2 = [...raw, [22, "KEMENTERIAN PERHUBUNGAN", "12.DL", "Program Diklat", "1975", "Pengembangan SDM", "DAB", "Pendidikan Vokasi", 2, "Diklat Pembentukan", 51, "Diploma IV Nautika"]];
const p2 = parseKodeSheet(raw2);
ok(p2.komponen.length === 3, "baris duplikat tidak menambah komponen");
ok(p2.ba.length === 1 && p2.program.length === 1, "BA & program tetap unik");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
