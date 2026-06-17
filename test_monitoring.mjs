import {
  buildMonitoringRows,
  summarizeMonitoring,
  tahapDeltas,
  MON_TAHAP,
} from "./src/lib/monitoring-data.ts";

let pass = 0,
  fail = 0;
const ok = (c, m) => {
  c ? (pass++, console.log("  \u2713 " + m)) : (fail++, console.log("  \u2717 " + m));
};

const U = (id, satkerId, nama, tahap, status, total) => ({
  id,
  tahun: 2026,
  tahap,
  status,
  total,
  satkerId,
  satkerNama: nama,
  satkerKode: satkerId,
});

const usulan = [
  U("a", "s1", "PIP Makassar", "KEBUTUHAN", "Final", 180000),
  U("b", "s1", "PIP Makassar", "INDIKATIF", "Draft", 150000),
  U("c", "s2", "PIP Surabaya", "KEBUTUHAN", "Diajukan", 90000),
  // duplikat tahap: Final harus menang
  U("d", "s2", "PIP Surabaya", "KEBUTUHAN", "Final", 95000),
];

console.log("buildMonitoringRows:");
const rows = buildMonitoringRows(usulan);
ok(rows.length === 2, "2 satker → 2 baris");
const s1 = rows.find((r) => r.satkerId === "s1");
const s2 = rows.find((r) => r.satkerId === "s2");
ok(s1.cells.KEBUTUHAN.total === 180000 && s1.cells.KEBUTUHAN.status === "Final", "s1 Kebutuhan Final 180000");
ok(s1.cells.INDIKATIF.total === 150000, "s1 Indikatif 150000");
ok(s1.cells.ANGGARAN === null && s1.cells.ALOKASI === null, "s1 Anggaran/Alokasi kosong");
ok(s1.latestTahap === "INDIKATIF" && s1.latestTotal === 150000, "s1 tahap terkini = Indikatif");
ok(s1.finalizedCount === 1, "s1 finalized = 1");
ok(s2.cells.KEBUTUHAN.status === "Final" && s2.cells.KEBUTUHAN.total === 95000, "duplikat: Final menang (95000)");
ok(s2.latestTahap === "KEBUTUHAN", "s2 tahap terkini = Kebutuhan");
// urutan: latestTotal desc → s1 (150000) sebelum s2 (95000)
ok(rows[0].satkerId === "s1", "urut berdasarkan pagu terkini desc");

console.log("summarizeMonitoring:");
const sum = summarizeMonitoring(rows);
ok(sum.satkerCount === 2, "satkerCount = 2");
ok(sum.usulanCount === 3, "usulanCount = 3 (s1:2, s2:1)");
ok(sum.totalPagu === 150000 + 95000, "totalPagu = 245000 (jumlah pagu terkini)");
ok(sum.finalizedTahaps === 2, "finalizedTahaps = 2 (s1 Kebutuhan, s2 Kebutuhan)");
ok(sum.inProgressTahaps === 1, "inProgressTahaps = 1 (s1 Indikatif Draft)");

console.log("tahapDeltas:");
const d = tahapDeltas(s1);
ok(d.length === 1, "s1 punya 1 delta (Kebutuhan→Indikatif)");
ok(d[0].delta === -30000, "delta = 150000 - 180000 = -30000");
ok(Math.abs(d[0].pct - -16.6667) < 0.01, "pct ≈ -16.67%");
ok(tahapDeltas(s2).length === 0, "s2 tanpa delta (hanya 1 tahap)");

ok(MON_TAHAP.length === 4, "ada 4 tahap");

console.log("\nHasil: " + pass + " lulus, " + fail + " gagal");
if (fail > 0) process.exit(1);
