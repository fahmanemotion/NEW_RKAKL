"use client";
import * as React from "react";
import { loadXLSXPlain } from "@/lib/xlsx-lazy";
import {
  Upload,
  Download,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Trash2,
  Inbox,
  Plus,
} from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import {
  importTorKode,
  listTorKode,
  updateTorKode,
  createTorKode,
  deleteTorKode,
  deleteAllTorKode,
  type TorKodeRow,
  type TorKodeImportResult,
} from "@/lib/tor-api";
import { TOR_KODE_HEADERS, type TorKodeRec } from "@/lib/tor-kode";

const FIELDS: { key: keyof TorKodeRec; label: string }[] = [
  { key: "indikator_ro", label: "Indikator RO" },
  { key: "indikator_kro", label: "Indikator KRO" },
  { key: "indikator_kinerja_kegiatan", label: "Indikator Kinerja Kegiatan" },
  { key: "sasaran_kegiatan", label: "Sasaran Kegiatan" },
  { key: "indikator_kinerja_program", label: "Indikator Kinerja Program" },
  { key: "sasaran_program", label: "Sasaran Program" },
  { key: "unit_eselon", label: "Unit Eselon I/II" },
];

/** Kolom yang dapat diedit per sel (Komponen + seluruh narasi kinerja). */
type EditCellState = { row: TorKodeRow; field: keyof TorKodeRec; label: string } | null;

type EditState =
  | { mode: "add" }
  | { mode: "edit"; row: TorKodeRow }
  | null;

export function TorKodeManager() {
  const [rows, setRows] = React.useState<TorKodeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<TorKodeImportResult | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [edit, setEdit] = React.useState<EditState>(null);
  const [rowBusy, setRowBusy] = React.useState(false);
  // Edit satu sel (hover pencil per kolom) — koreksi cepat narasi.
  const [editCell, setEditCell] = React.useState<EditCellState>(null);
  const [cellBusy, setCellBusy] = React.useState(false);
  const [confirmDelAll, setConfirmDelAll] = React.useState(false);
  const [delAllText, setDelAllText] = React.useState("");
  const [delAllBusy, setDelAllBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await listTorKode());
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
      const res = await importTorKode(raw);
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
      TOR_KODE_HEADERS,
      [
        "Basic Safety Training",
        "Jumlah Lulusan Diklat Teknis Bidang Transportasi Laut",
        "Jumlah Lulusan Pendidikan dan Pelatihan SDM Transportasi Laut (orang)",
        "Tingkat Pemenuhan SDM Transportasi Program Pelatihan (IKK.6)",
        "Meningkatnya Kompetensi SDM Transportasi Laut (SK.3)",
        "Indeks Peningkatan SDM Transportasi (IKP.1)",
        "Meningkatnya Kualitas SDM Transportasi yang Kompeten (SP.1)",
        "Badan Pengembangan SDM Perhubungan/ Pusat Pengembangan SDM Perhubungan Laut",
      ],
    ]);
    ws["!cols"] = TOR_KODE_HEADERS.map((h) => ({ wch: h === "KOMPONEN" ? 26 : 42 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KODE TOR");
    XLSX.writeFile(wb, "TEMPLATE_KODE_TOR.xlsx");
  }

  async function onDelete(r: TorKodeRow) {
    if (!confirm(`Hapus KODE TOR untuk komponen "${r.komponen}"?`)) return;
    try {
      await deleteTorKode(r.id);
      await load();
    } catch (e) {
      alert("Gagal menghapus: " + (e as Error).message);
    }
  }

  // Simpan hasil edit satu kolom (narasi) — hanya field yang diubah.
  async function onSaveCell(val: string) {
    if (!editCell) return;
    const isKomponen = editCell.field === "komponen";
    if (isKomponen && !val.trim()) return alert("Nama komponen wajib diisi.");
    setCellBusy(true);
    try {
      await updateTorKode(editCell.row.id, {
        [editCell.field]: isKomponen ? val.trim() : val,
      } as Partial<TorKodeRec>);
      setEditCell(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCellBusy(false);
    }
  }

  async function onDeleteAll() {
    setDelAllBusy(true);
    try {
      await deleteAllTorKode();
      setConfirmDelAll(false);
      setDelAllText("");
      setResult(null);
      await load();
    } catch (e) {
      alert("Gagal menghapus semua: " + (e as Error).message);
    } finally {
      setDelAllBusy(false);
    }
  }

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [
        r.komponen,
        r.indikator_kinerja_kegiatan,
        r.sasaran_kegiatan,
        r.indikator_kinerja_program,
        r.sasaran_program,
        r.unit_eselon,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Impor KODE TOR</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Metadata kinerja per <strong>Komponen</strong> (Sasaran &amp; Indikator Program/Kegiatan,
              Unit Eselon) untuk mengisi tabel identitas TOR yang tidak otomatis. Satu file Excel, kunci = nama komponen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" /> Unduh Template
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Impor Excel
            </Button>
          </div>
        </div>
        {result && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>
              Impor selesai — <strong>{result.inserted}</strong> ditambahkan, <strong>{result.updated}</strong> diperbarui
              (dari {result.total} baris).
            </span>
          </div>
        )}
        {err && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {err}
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari komponen / sasaran / indikator…"
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => setEdit({ mode: "add" })}>
          <Plus className="size-4" /> Tambah Manual
        </Button>
        {rows.length > 0 && (
          <Button variant="outline" onClick={() => setConfirmDelAll(true)}>
            <Trash2 className="size-4" /> Hapus Semua
          </Button>
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-muted-foreground">
              <th className="px-3 py-2.5 font-semibold">Komponen</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-3 py-2.5 font-semibold">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={FIELDS.length + 2} className="px-3 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={FIELDS.length + 2} className="px-3 py-10 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2 size-6" />
                  Belum ada KODE TOR. Unduh template, isi, lalu impor.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <TorCell
                    value={r.komponen}
                    strong
                    onEdit={() => setEditCell({ row: r, field: "komponen", label: "Komponen" })}
                  />
                  {FIELDS.map((f) => (
                    <TorCell
                      key={f.key}
                      value={(r[f.key] as string) || ""}
                      onEdit={() => setEditCell({ row: r, field: f.key, label: f.label })}
                    />
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(r)}
                        title="Hapus"
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

      <TorFieldEditModal
        state={editCell}
        busy={cellBusy}
        onClose={() => setEditCell(null)}
        onSave={onSaveCell}
      />

      {edit && (
        <TorKodeEditModal
          state={edit}
          busy={rowBusy}
          onClose={() => setEdit(null)}
          onSave={async (rec) => {
            setRowBusy(true);
            try {
              if (edit.mode === "edit") await updateTorKode(edit.row.id, rec);
              else await createTorKode(rec);
              setEdit(null);
              await load();
            } catch (e) {
              alert((e as Error).message);
            } finally {
              setRowBusy(false);
            }
          }}
        />
      )}

      <Modal
        open={confirmDelAll}
        onClose={() => setConfirmDelAll(false)}
        title="Hapus Semua KODE TOR"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelAll(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={delAllText !== "HAPUS" || delAllBusy}
              onClick={onDeleteAll}
            >
              {delAllBusy && <Loader2 className="size-4 animate-spin" />} Hapus Semua
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Tindakan ini menghapus <strong>seluruh</strong> data KODE TOR. Ketik <strong>HAPUS</strong> untuk konfirmasi.
        </p>
        <Input
          className="mt-3"
          value={delAllText}
          onChange={(e) => setDelAllText(e.target.value)}
          placeholder="HAPUS"
        />
      </Modal>
    </div>
  );
}

/** Sel tabel dengan tombol edit yang muncul saat kursor diarahkan (hover). */
function TorCell({
  value,
  strong,
  onEdit,
}: {
  value: string;
  strong?: boolean;
  onEdit: () => void;
}) {
  return (
    <td className="group/cell px-3 py-2 align-top">
      <div className="flex items-start justify-between gap-1">
        <span className={`min-w-0 ${strong ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          {value || "—"}
        </span>
        <button
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 group-hover/cell:opacity-100"
          title="Edit narasi kolom ini"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    </td>
  );
}

/** Modal edit satu kolom (narasi) — dibuka dari pencil hover per sel. */
function TorFieldEditModal({
  state,
  busy,
  onClose,
  onSave,
}: {
  state: EditCellState;
  busy: boolean;
  onClose: () => void;
  onSave: (val: string) => void;
}) {
  const [val, setVal] = React.useState("");
  React.useEffect(() => {
    if (state) setVal(String(state.row[state.field] ?? ""));
  }, [state]);
  const isKomponen = state?.field === "komponen";
  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={state ? `Edit ${state.label}` : "Edit"}
      className="max-w-xl"
      footer={<>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave(val)} disabled={busy || (isKomponen && !val.trim())}>
          {busy && <Loader2 className="size-4 animate-spin" />} Simpan
        </Button>
      </>}
    >
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Komponen: <strong className="text-foreground">{state?.row.komponen}</strong>
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{state?.label}</span>
          {isKomponen ? (
            <Input value={val} onChange={(e) => setVal(e.target.value)} autoFocus placeholder="Nama komponen" />
          ) : (
            <textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              rows={3}
              autoFocus
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        </label>
      </div>
    </Modal>
  );
}

function TorKodeEditModal({
  state,
  busy,
  onClose,
  onSave,
}: {
  state: Exclude<EditState, null>;
  busy: boolean;
  onClose: () => void;
  onSave: (rec: TorKodeRec) => void;
}) {
  const init = state.mode === "edit" ? state.row : null;
  const [komponen, setKomponen] = React.useState(init?.komponen ?? "");
  const [vals, setVals] = React.useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const f of FIELDS) o[f.key as string] = (init?.[f.key] as string) ?? "";
    return o;
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={state.mode === "edit" ? "Edit KODE TOR" : "Tambah KODE TOR"}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={busy || !komponen.trim()}
            onClick={() => {
              const rec: Record<string, string> = { komponen: komponen.trim() };
              for (const f of FIELDS) rec[f.key as string] = (vals[f.key as string] || "").trim();
              onSave(rec as unknown as TorKodeRec);
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Komponen (nama, harus sama dengan uraian komponen di anggaran)</span>
          <Input value={komponen} onChange={(e) => setKomponen(e.target.value)} placeholder="Basic Safety Training" />
        </label>
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</span>
            <textarea
              value={vals[f.key as string]}
              onChange={(e) => setVals((p) => ({ ...p, [f.key as string]: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        ))}
      </div>
    </Modal>
  );
}
