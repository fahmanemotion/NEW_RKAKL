"use client";
import * as React from "react";
import { loadXLSXPlain } from "@/lib/xlsx-lazy";
import { Upload, Download, Search, Loader2, CheckCircle2, AlertTriangle, Pencil, Trash2, FolderTree, Inbox } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import {
  importKodeGabungan,
  listKodePaths,
  updateKomponen,
  deleteKomponen,
  deleteAllKode,
  type KodeImportResult,
  type KodePathRow,
} from "@/lib/referensi-api";

const HEADERS = [
  "BA", "URAIAN BA", "PROGRAM", "URAIAN PROGRAM", "KEGIATAN", "URAIAN KEGIATAN",
  "KRO", "URAIAN KRO", "RO", "URAIAN RO", "KOMP", "URAIAN KOMP",
];

export function KodeManager() {
  const [rows, setRows] = React.useState<KodePathRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<KodeImportResult | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [edit, setEdit] = React.useState<KodePathRow | null>(null);
  const [rowBusy, setRowBusy] = React.useState(false);
  const [confirmDelAll, setConfirmDelAll] = React.useState(false);
  const [delAllText, setDelAllText] = React.useState("");
  const [delAllBusy, setDelAllBusy] = React.useState(false);

  async function onDeleteAll() {
    setDelAllBusy(true);
    try {
      await deleteAllKode();
      setConfirmDelAll(false);
      setDelAllText("");
      setResult(null);
      await load();
    } catch (e) {
      alert("Gagal menghapus semua kode: " + (e as Error).message.replace("KODE_DUPLIKAT: ", ""));
    } finally {
      setDelAllBusy(false);
    }
  }

  async function onDelete(r: KodePathRow) {
    if (
      !confirm(
        `Hapus Komponen "${r.komponen} — ${r.komponenNama}" pada ${r.ro}?\n\n` +
          "Tindakan ini hanya menghapus baris komponen ini dari referensi.",
      )
    )
      return;
    try {
      await deleteKomponen(r.komponenId);
      await load();
    } catch (e) {
      alert("Gagal menghapus: " + (e as Error).message.replace("KODE_DUPLIKAT: ", ""));
    }
  }

  async function onSaveEdit(kode: string, nama: string, jenis: string) {
    if (!edit) return;
    if (!kode.trim() || !nama.trim()) return alert("Kode dan nama komponen wajib diisi.");
    setRowBusy(true);
    try {
      await updateKomponen(edit.komponenId, {
        kode_komponen: kode.trim(),
        nama_komponen: nama.trim(),
        jenis: jenis || undefined,
      });
      setEdit(null);
      await load();
    } catch (e) {
      alert((e as Error).message.replace("KODE_DUPLIKAT: ", ""));
    } finally {
      setRowBusy(false);
    }
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await listKodePaths());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await loadXLSXPlain();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: "" });
      const res = await importKodeGabungan(raw);
      setResult(res);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    const XLSX = await loadXLSXPlain();
    const ws = XLSX.utils.aoa_to_sheet([
      HEADERS,
      ["22", "KEMENTERIAN PERHUBUNGAN", "12.DL", "Program Pendidikan dan Pelatihan", "1975",
        "Pengembangan SDM Perhubungan", "DAB", "Pendidikan Vokasi", "2", "Diklat Pembentukan",
        "051", "Diploma IV Nautika"],
    ]);
    ws["!cols"] = HEADERS.map((h) => ({ wch: h.startsWith("URAIAN") ? 32 : 10 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KODE");
    XLSX.writeFile(wb, "TEMPLATE_REFERENSI_KODE.xlsx");
  }

  const term = q.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) =>
        [r.program, r.programNama, r.kegiatan, r.kegiatanNama, r.kro, r.kroNama, r.ro, r.roNama, r.komponen, r.komponenNama]
          .join(" ").toLowerCase().includes(term),
      )
    : rows;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Upload className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Import Kode Referensi</h2>
            <p className="text-xs text-muted-foreground">
              BA → Program → Kegiatan → KRO → RO → Komponen dari satu file Excel.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? "Mengimpor…" : "Import Excel"}
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" /> Unduh Template
          </Button>
          <Button
            variant="destructive"
            className="ml-auto"
            onClick={() => {
              setDelAllText("");
              setConfirmDelAll(true);
            }}
            disabled={busy || rows.length === 0}
            title="Hapus seluruh kode referensi (mis. saat pindah satker)"
          >
            <Trash2 className="size-4" /> Hapus Semua Kode
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Satu file Excel berisi seluruh kode (BA → Program → Kegiatan → KRO → RO → Komponen).
          Setiap baris adalah satu jalur lengkap. Data yang sudah ada akan diperbarui (kode sama
          tidak digandakan), data baru ditambahkan.
        </p>
        {result && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-medium">Impor selesai — {result.totalRows} baris diproses.</p>
              <p className="text-muted-foreground">
                BA {result.counts.ba} · Program {result.counts.program} · Kegiatan {result.counts.kegiatan} ·
                KRO {result.counts.kro} · RO {result.counts.ro} · Komponen {result.counts.komponen}
              </p>
              {(result.dropped.komponen > 0 || result.dropped.ro > 0) && (
                <div className="mt-2 rounded border border-amber-400/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                  <p className="font-medium">
                    ⚠ {result.dropped.komponen} komponen{result.dropped.ro > 0 ? ` & ${result.dropped.ro} RO` : ""} tidak terkait karena induknya (RO/KRO) tidak ditemukan pada data — periksa kode jalurnya di sheet, lalu impor ulang.
                  </p>
                  {result.droppedSamples.komponen.length > 0 && (
                    <p className="mt-1 break-words text-amber-700/90 dark:text-amber-300/80">
                      Contoh (KRO.RO.Komponen): {result.droppedSamples.komponen.join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {err && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <FolderTree className="size-4" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Jalur Komponen</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {rows.length}
              </span>
            </div>
          </div>
          <div className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari program / kegiatan / KRO / RO / komponen…"
              className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted text-[11px] uppercase tracking-wide text-muted-foreground [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted">
                <th className="px-2 py-2.5 text-left font-semibold">Program</th>
                <th className="px-2 py-2.5 text-left font-semibold">Kegiatan</th>
                <th className="px-2 py-2.5 text-left font-semibold">KRO</th>
                <th className="px-2 py-2.5 text-left font-semibold">RO</th>
                <th className="px-2 py-2.5 text-left font-semibold">Komponen</th>
                <th className="w-24 px-2 py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2 size-6" /> Belum ada kode. Klik <strong>Import Excel</strong> untuk memuat data.
                </td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={i} className="border-b border-border align-top transition-colors last:border-0 hover:bg-accent/40">
                    <Cell kode={r.program} nama={r.programNama} />
                    <Cell kode={r.kegiatan} nama={r.kegiatanNama} />
                    <Cell kode={r.kro} nama={r.kroNama} />
                    <Cell kode={r.ro} nama={r.roNama} />
                    <Cell kode={r.komponen} nama={r.komponenNama} />
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Edit komponen"
                          onClick={() => setEdit(r)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          title="Hapus komponen"
                          onClick={() => onDelete(r)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {filtered.length} dari {rows.length} jalur komponen
          </div>
        )}
      </Card>
      <KomponenEditModal
        row={edit}
        busy={rowBusy}
        onSave={onSaveEdit}
        onClose={() => setEdit(null)}
      />

      <Modal
        open={confirmDelAll}
        onClose={() => setConfirmDelAll(false)}
        title="Hapus Semua Kode Referensi"
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDelAll(false)}>Batal</Button>
          <Button
            variant="destructive"
            disabled={delAllBusy || delAllText.trim().toUpperCase() !== "HAPUS SEMUA"}
            onClick={onDeleteAll}
          >
            {delAllBusy ? "Menghapus…" : "Hapus Semua Kode"}
          </Button>
        </>}
      >
        <div className="space-y-3 text-sm">
          <p className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Tindakan ini menghapus <strong>seluruh</strong> kode referensi —
              Program, Kegiatan, KRO, RO, Komponen, dan Sub Komponen
              (saat ini <strong>{rows.length.toLocaleString("id-ID")}</strong> baris komponen).
              Gunakan saat berpindah satker untuk memulai dari awal.
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Data usulan/anggaran yang sudah ada <strong>tidak ikut terhapus</strong>.
            Setelah ini Anda dapat mengimpor template kode satker yang baru.
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Ketik <strong>HAPUS SEMUA</strong> untuk mengonfirmasi
            </label>
            <Input
              value={delAllText}
              onChange={(e) => setDelAllText(e.target.value)}
              placeholder="HAPUS SEMUA"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function KomponenEditModal({
  row, busy, onSave, onClose,
}: {
  row: KodePathRow | null;
  busy: boolean;
  onSave: (kode: string, nama: string, jenis: string) => void;
  onClose: () => void;
}) {
  const [kode, setKode] = React.useState("");
  const [nama, setNama] = React.useState("");
  const [jenis, setJenis] = React.useState("");
  React.useEffect(() => {
    if (row) {
      setKode(row.komponen);
      setNama(row.komponenNama);
      setJenis(row.komponenJenis || "");
    }
  }, [row]);
  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title="Edit Komponen"
      footer={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave(kode, nama, jenis)} disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </>}
    >
      <div className="space-y-3">
        {row && (
          <p className="text-xs text-muted-foreground">
            Jalur: {row.program} › {row.kegiatan} › {row.kro} › {row.ro}
          </p>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Kode Komponen</label>
          <Input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="mis. 051" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Komponen</label>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Jenis</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
          >
            <option value="">—</option>
            <option value="Utama">Utama</option>
            <option value="Pendukung">Pendukung</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          Kode tidak boleh sama dengan komponen lain pada RO yang sama; bila kembar,
          sistem akan menolak.
        </p>
      </div>
    </Modal>
  );
}

function Cell({ kode, nama }: { kode: string; nama: string }) {
  return (
    <td className="px-2 py-2">
      <div className="font-mono font-medium">{kode}</div>
      <div className="text-muted-foreground">{nama}</div>
    </td>
  );
}
