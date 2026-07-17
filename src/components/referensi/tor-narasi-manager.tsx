"use client";
import * as React from "react";
import { Search, Loader2, Plus, Pencil, Trash2, Inbox, AlertTriangle, Save, FileText } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { ComboBox } from "@/components/ui/combobox";
import { TorIsiFields } from "@/components/tor/tor-isi-fields";
import { TOR_SECTIONS } from "@/lib/tor-ai-sections";
import {
  listTorTemplates,
  saveTorTemplate,
  deleteTorTemplate,
  DEFAULT_TAHAPAN,
  type TorTemplateRow,
  type TorIsi,
} from "@/lib/tor-isi-api";
import { listKodePaths } from "@/lib/referensi-api";

type EditState = { mode: "add" } | { mode: "edit"; row: TorTemplateRow } | null;

const EMPTY_ISI: TorIsi = { narasi: {}, tahapan: [], sumberDana: "RM" };

/** Berapa bagian narasi yang sudah terisi (dari total bagian TOR). */
function filledCount(isi: TorIsi): number {
  return TOR_SECTIONS.filter((s) => (isi.narasi[s.id] ?? "").trim().length > 0).length;
}

function fmtTgl(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function TorNarasiManager() {
  const [rows, setRows] = React.useState<TorTemplateRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState<EditState>(null);
  const [busy, setBusy] = React.useState(false);
  // Saran nama komponen dari master KODE KK — template dicocokkan lewat nama,
  // jadi mengetik nama yang persis sangat menentukan.
  const [namaKomponen, setNamaKomponen] = React.useState<string[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await listTorTemplates());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    listKodePaths()
      .then((p) => setNamaKomponen([...new Set(p.map((r) => r.komponenNama).filter(Boolean))].sort()))
      .catch(() => setNamaKomponen([]));
  }, []);

  async function onDelete(r: TorTemplateRow) {
    if (!confirm(`Hapus template narasi TOR untuk komponen "${r.komponen_nama}"?\n\nNarasi yang sudah tersimpan pada usulan tidak ikut terhapus.`)) return;
    try {
      await deleteTorTemplate(r.komponen_key);
      await load();
    } catch (e) {
      alert("Gagal menghapus: " + (e as Error).message);
    }
  }

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.komponen_nama.toLowerCase().includes(s) ||
        TOR_SECTIONS.some((sec) => (r.isi.narasi[sec.id] ?? "").toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Pustaka Narasi TOR</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Narasi TOR yang dapat <strong>dipakai ulang lintas tahun</strong>, disimpan per{" "}
                <strong>nama komponen</strong>. Saat menyusun TOR di modul Laporan, komponen dengan nama
                sama akan <strong>otomatis memuat</strong> narasi dari sini — tinggal disesuaikan
                seperlunya lalu disimpan pada usulan tahun berjalan.
              </p>
            </div>
          </div>
        </div>
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
            placeholder="Cari komponen / isi narasi…"
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => setEdit({ mode: "add" })}>
          <Plus className="size-4" /> Tambah Manual
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-muted-foreground">
              <th className="px-3 py-2.5 font-semibold">Komponen</th>
              <th className="px-3 py-2.5 font-semibold">Bagian Terisi</th>
              <th className="px-3 py-2.5 font-semibold">Sumber Dana</th>
              <th className="px-3 py-2.5 font-semibold">Tahapan</th>
              <th className="px-3 py-2.5 font-semibold">Diperbarui</th>
              <th className="px-3 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2 size-6" />
                  {rows.length === 0 ? (
                    <>
                      Belum ada narasi tersimpan. Klik <strong>Tambah Manual</strong> untuk menulis narasi
                      pertama, atau simpan dari modul Laporan → TOR.
                    </>
                  ) : (
                    "Tidak ada yang cocok dengan pencarian."
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const n = filledCount(r.isi);
                return (
                  <tr key={r.komponen_key} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-medium">{r.komponen_nama}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          n === 0
                            ? "text-muted-foreground"
                            : n < TOR_SECTIONS.length
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }
                      >
                        {n} / {TOR_SECTIONS.length}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.isi.sumberDana}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.isi.tahapan.length}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtTgl(r.updated_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setEdit({ mode: "edit", row: r })}
                          title="Edit narasi"
                        >
                          <Pencil className="size-4" />
                        </button>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {!loading && rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} dari {rows.length} komponen bernarasi
        </p>
      )}

      {edit && (
        <TorNarasiEditModal
          state={edit}
          busy={busy}
          namaKomponen={namaKomponen}
          onClose={() => setEdit(null)}
          onSave={async (nama, isi) => {
            setBusy(true);
            try {
              await saveTorTemplate(nama, isi);
              setEdit(null);
              await load();
            } catch (e) {
              alert((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

function TorNarasiEditModal({
  state,
  busy,
  namaKomponen,
  onClose,
  onSave,
}: {
  state: Exclude<EditState, null>;
  busy: boolean;
  namaKomponen: string[];
  onClose: () => void;
  onSave: (nama: string, isi: TorIsi) => void;
}) {
  const init = state.mode === "edit" ? state.row : null;
  const [nama, setNama] = React.useState(init?.komponen_nama ?? "");
  const [isi, setIsi] = React.useState<TorIsi>(
    init ? init.isi : { ...EMPTY_ISI, tahapan: DEFAULT_TAHAPAN.map((x) => ({ ...x })) },
  );
  const isEdit = state.mode === "edit";

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-3xl"
      title={
        isEdit ? (
          <span>
            Edit Narasi TOR — <span className="font-normal text-muted-foreground">{init?.komponen_nama}</span>
          </span>
        ) : (
          "Tambah Narasi TOR"
        )
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={() => onSave(nama, isi)} disabled={busy || !nama.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
          </Button>
        </>
      }
    >
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Nama Komponen (harus sama persis dengan uraian komponen di anggaran)
          </label>
          {isEdit ? (
            <Input value={nama} disabled className="text-muted-foreground" />
          ) : (
            <>
              <ComboBox
                options={namaKomponen}
                value={nama}
                onChange={setNama}
                placeholder="Pilih komponen…"
                searchPlaceholder="Ketik untuk mencari komponen…"
                emptyText="Komponen tidak ditemukan di master KODE KK."
                allowCustom
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih dari daftar komponen yang ada agar narasi ini otomatis termuat saat menyusun TOR.
              </p>
            </>
          )}
          {isEdit && (
            <p className="mt-1 text-xs text-muted-foreground">
              Nama dikunci karena menjadi kunci pencocokan. Untuk mengganti nama, hapus lalu buat baru.
            </p>
          )}
        </div>

        <TorIsiFields isi={isi} setIsi={setIsi} />
      </div>
    </Modal>
  );
}
