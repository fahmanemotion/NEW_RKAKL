"use client";
import * as React from "react";
import {
  Pencil,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Unlock,
  Save,
  Loader2,
  Copy,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button, Card, Select } from "@/components/ui";
import { flattenForGrid, type GridRow } from "@/lib/tree";
import { toolbarActions, type ToolbarAction } from "@/lib/toolbar";
import { fmtN, type Level } from "@/lib/constants";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import { usePenganggaran } from "@/store/penganggaran";
import {
  addNode,
  upsertDetail,
  deleteNode,
  fetchStruktur,
  refQueryFor,
  getAkunMeta,
  setUsulanStatus,
} from "@/lib/penganggaran-api";
import type { UsulanStruktur } from "@/types/database";
import { reopenUsulanAction } from "@/app/(dashboard)/penganggaran/actions";
import {
  listCopySourcesAction,
  copyAnggaranAction,
  type CopySource,
} from "@/app/(dashboard)/penganggaran/actions";
import { TreeGrid } from "./tree-grid";
import { ReferencePicker } from "./reference-picker";
import { SubKomponenForm } from "./subkomponen-form";
import { DetailForm, type DetailValues } from "./detail-form";
import type { RefRow, RefQuery } from "@/lib/penganggaran-api";

export interface UsulanHeader {
  id: string;
  tahun_anggaran: number;
  status: string;
  tahap_pagu?: string;
  ba: string;
  kementerian: string;
  unit: string;
  satker: string;
  program_kode: string;
  program_nama: string;
  kegiatan_id: string | null;
  kegiatan_kode: string;
  kegiatan_nama: string;
  kppn: string;
  lokus: string;
}

type PickerState = {
  level: Level;
  query: RefQuery;
  parentStrukturId: string | null;
  parentKode: string;
  okGreen?: boolean;
  extraHead?: string;
} | null;
type DetailState = {
  parentId: string;
  inheritedSumberDana: string;
  akunInfo?: {
    kode: string;
    uraian: string;
    sumberDana: string;
    kategori?: string;
  };
  initial?: Partial<DetailValues>;
} | null;

export function PenganggaranClient({
  header,
  initialRows,
}: {
  header: UsulanHeader;
  initialRows: UsulanStruktur[];
}) {
  const [rows, setRows] = React.useState<UsulanStruktur[]>(initialRows);
  const [status, setStatus] = React.useState<string>(header.status);
  const [finalizing, setFinalizing] = React.useState(false);
  const [reopening, setReopening] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const { selectedId, selectedRow, select } = usePenganggaran();
  const [picker, setPicker] = React.useState<PickerState>(null);
  const [subkompParent, setSubkompParent] = React.useState<{
    id: string;
  } | null>(null);
  const [detail, setDetail] = React.useState<DetailState>(null);

  // Salin Anggaran (mulai cepat saat usulan masih Draft & kosong).
  const [copySources, setCopySources] = React.useState<CopySource[]>([]);
  const [copySourceId, setCopySourceId] = React.useState<string>("");
  const [copying, setCopying] = React.useState(false);

  // Setiap penyegaran = data sudah tersinkron dengan database → tandai waktu tersimpan.
  const refresh = React.useCallback(async () => {
    const data = await fetchStruktur(header.id);
    setRows(data);
    setLastSavedAt(new Date());
  }, [header.id]);

  // Simpan manual: paksa sinkron dari database & perbarui indikator "tersimpan".
  async function onSave() {
    setSaving(true);
    try {
      await refresh();
    } catch (e) {
      alert("Gagal menyinkronkan: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Realtime: segarkan grid saat struktur usulan ini berubah.
  React.useEffect(() => {
    const ch = createClient()
      .channel("struktur:" + header.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "usulan_struktur",
          filter: `usulan_id=eq.${header.id}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      createClient().removeChannel(ch);
    };
  }, [header.id, refresh]);

  const { gridRows, total } = React.useMemo(
    () => flattenForGrid(rows, { kppn: header.kppn, lokus: header.lokus }),
    [rows, header.kppn, header.lokus],
  );

  // Muat kandidat sumber salinan saat usulan masih Draft & belum berisi rincian.
  const isEmptyDraft = header.status !== "Final" && rows.length === 0;
  React.useEffect(() => {
    if (!isEmptyDraft) {
      setCopySources([]);
      return;
    }
    let alive = true;
    listCopySourcesAction(header.id).then((res) => {
      if (!alive) return;
      if (res.ok) setCopySources(res.sources);
    });
    return () => {
      alive = false;
    };
  }, [header.id, isEmptyDraft]);

  async function onCopyAnggaran() {
    if (!copySourceId) return;
    const src = copySources.find((s) => s.id === copySourceId);
    if (
      !confirm(
        `Salin seluruh kegiatan & rincian dari ${src ? labelSource(src) : "usulan terpilih"} ` +
          `ke usulan ini sebagai Draft?\n\nSeluruh struktur dan nilainya akan disalin sehingga Anda tinggal menyesuaikan.`,
      )
    )
      return;
    setCopying(true);
    try {
      const res = await copyAnggaranAction(header.id, copySourceId);
      if (!res.ok) {
        alert("Gagal menyalin: " + res.error);
        return;
      }
      await refresh();
    } catch (e) {
      alert("Gagal menyalin: " + (e as Error).message);
    } finally {
      setCopying(false);
    }
  }

  // Program & Kegiatan kini node nyata di pohon. Untuk usulan LAMA (belum punya
  // node PROGRAM), tampilkan baris Program/Kegiatan dari header sebagai fallback.
  const hasProgramNode = gridRows.some((r) => r.type === "PROGRAM");
  const display: GridRow[] = React.useMemo(() => {
    if (hasProgramNode) return gridRows;
    if (!header.program_kode) return gridRows;
    return [
      {
        id: "prog",
        type: "PROGRAM",
        depth: 0,
        kode: header.program_kode,
        uraian: header.program_nama,
        jumlah: total,
        selectable: false,
      },
      {
        id: "keg",
        type: "KEGIATAN",
        depth: 1,
        kode: header.kegiatan_kode,
        uraian: header.kegiatan_nama,
        jumlah: total,
        selectable: false,
      },
      ...gridRows,
    ];
  }, [gridRows, header, total, hasProgramNode]);

  const selType = selectedRow?.type ?? null;
  const actions = toolbarActions(selType);

  function handleAction(a: ToolbarAction) {
    if (a.kind === "delete") return onDelete();
    if (a.kind === "edit") return onEditDetail();
    if (a.kind !== "add" || !a.addLevel) return;
    openAdd(a.addLevel);
  }

  // Peta level anak → tipe parent yang harus dipilih + judul modal.
  const PARENT_OF: Record<string, GridRow["type"]> = {
    KEGIATAN: "PROGRAM",
    KRO: "KEGIATAN",
    RO: "KRO",
    KOMPONEN: "RO",
    SUB_KOMPONEN: "KOMPONEN",
    AKUN: "SUB_KOMPONEN",
    DETAIL: "AKUN",
  };

  async function openAdd(level: Level) {
    // PROGRAM = akar (tanpa induk).
    if (level === "PROGRAM") {
      const q = refQueryFor("PROGRAM", null);
      if (!q) return;
      return setPicker({
        level,
        query: q,
        parentStrukturId: null,
        parentKode: "022",
      });
    }
    // Level lain butuh baris induk terpilih.
    const needType = PARENT_OF[level];
    if (selectedRow?.type !== needType || !selectedRow.ref) {
      return alert(`Pilih baris ${needType} dulu untuk menambahkan ${level}.`);
    }
    const parentId = selectedRow.ref.id;
    const parentRef = selectedRow.ref.referensi_id ?? null;
    const parentKode = selectedRow.kode;

    if (level === "SUB_KOMPONEN") return setSubkompParent({ id: parentId });
    if (level === "DETAIL") {
      // Sumber dana & kategori detail otomatis ikut akun (parent).
      const akunSumber = selectedRow.sumber_dana ?? "RM";
      let kategori: string | undefined;
      if (parentRef) {
        const meta = await getAkunMeta(parentRef);
        if (meta) kategori = meta.kategori_belanja;
      }
      return setDetail({
        parentId,
        inheritedSumberDana: akunSumber,
        akunInfo: {
          kode: selectedRow.kode,
          uraian: selectedRow.uraian,
          sumberDana: akunSumber,
          kategori,
        },
      });
    }

    const q = refQueryFor(level, parentRef);
    if (!q) return;
    setPicker({
      level,
      query: q,
      parentStrukturId: parentId,
      parentKode,
      okGreen: level === "KRO",
      extraHead:
        level === "KOMPONEN"
          ? "Jenis"
          : level === "AKUN"
            ? "Kategori"
            : undefined,
    });
  }

  async function onPickRef(row: RefRow) {
    if (!picker) return;
    const { level, parentStrukturId, parentKode } = picker;
    let kode = row.kode;
    if (level === "PROGRAM")
      kode = `${parentKode}.${row.kode}`; // 022.12.DL
    else if (level === "KRO" || level === "RO")
      kode = `${parentKode}.${row.kode}`; // 3996.SAB / 3996.SAB.005
    let sumber_dana: string | null = null;
    if (level === "AKUN") {
      const meta = await getAkunMeta(row.id);
      sumber_dana =
        meta?.sumber_dana ?? (row.kode.startsWith("525") ? "BLU" : "RM");
    }
    try {
      await addNode({
        usulan_id: header.id,
        parent_id: parentStrukturId,
        level,
        referensi_id: row.id,
        kode,
        uraian: row.nama,
        sumber_dana,
      });
    } catch (e) {
      // Mis. duplikat — beri tahu & biarkan picker tetap terbuka.
      alert((e as Error).message);
      return;
    }
    setPicker(null);
    await refresh();
  }

  async function onSubmitSubkomp(v: { kode: string; uraian: string }) {
    if (!subkompParent) return;
    await addNode({
      usulan_id: header.id,
      parent_id: subkompParent.id,
      level: "SUB_KOMPONEN",
      kode: v.kode === "-" ? "-" : v.kode,
      uraian: v.uraian,
    });
    setSubkompParent(null);
    await refresh();
  }

  async function onSubmitDetail(v: DetailValues) {
    if (!detail) return;
    await upsertDetail({
      id: v.id,
      usulan_id: header.id,
      parent_id: detail.parentId,
      uraian: v.uraian,
      volume: v.volume,
      satuan: v.satuan,
      harga: v.harga,
      sumber_dana: detail.inheritedSumberDana, // ikut akun
      jenis_belanja: v.jenis_belanja,
    });
    setDetail(null);
    await refresh();
  }

  function onEditDetail() {
    if (selectedRow?.type !== "DETAIL" || !selectedRow.ref) return;
    const r = selectedRow.ref;
    // Cari node AKUN induk untuk mewarisi sumber dana & info.
    const akun = rows.find((x) => x.id === r.parent_id);
    const akunSumber = akun?.sumber_dana ?? r.sumber_dana ?? "RM";
    setDetail({
      parentId: r.parent_id!,
      inheritedSumberDana: akunSumber,
      akunInfo: akun
        ? {
            kode: akun.kode ?? "",
            uraian: akun.uraian ?? "",
            sumberDana: akunSumber,
          }
        : undefined,
      initial: {
        id: r.id,
        uraian: r.uraian ?? "",
        volume: r.volume ?? 0,
        satuan: r.satuan ?? "",
        harga: r.harga ?? 0,
        jenis_belanja:
          (r.jenis_belanja as DetailValues["jenis_belanja"]) ?? "OPS",
      },
    });
  }

  async function onDelete() {
    if (!selectedRow?.ref) return;
    const t = selectedRow.type;
    const hasChildren = t !== "DETAIL";
    const msg = hasChildren
      ? `Hapus ${t} "${selectedRow.uraian}" beserta SELURUH turunannya (sampai detail)?`
      : `Hapus detail "${selectedRow.uraian}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteNode(selectedRow.ref.id);
      select(null);
      await refresh();
    } catch (e) {
      alert("Gagal menghapus: " + (e as Error).message);
    }
  }

  const isFinal = status === "Final";

  async function onFinalize() {
    if (isFinal) return;
    if (total <= 0) {
      alert(
        "Tidak bisa difinalkan: pagu masih 0. Lengkapi rincian terlebih dahulu.",
      );
      return;
    }
    if (
      !confirm(
        "Finalkan tahap ini?\n\nSetelah Final, tahap dianggap SELESAI dan tahap pagu berikutnya bisa dibuat. " +
          "Pastikan seluruh rincian sudah benar.",
      )
    )
      return;
    setFinalizing(true);
    try {
      await setUsulanStatus(header.id, "Final");
      setStatus("Final");
    } catch (e) {
      alert("Gagal memfinalkan: " + (e as Error).message);
    } finally {
      setFinalizing(false);
    }
  }

  // Buka kembali finalisasi: Final → Draft agar rincian bisa diubah lagi.
  async function onReopen() {
    if (!isFinal) return;
    if (
      !confirm(
        "Buka kembali finalisasi tahap ini?\n\n" +
          "Status akan kembali menjadi Draft sehingga seluruh rincian dapat diubah lagi. " +
          "Lakukan ini hanya bila memang ada perubahan yang diperlukan.",
      )
    )
      return;
    setReopening(true);
    try {
      await reopenUsulanAction(header.id);
      setStatus("Draft");
    } catch (e) {
      alert("Gagal membuka finalisasi: " + (e as Error).message);
    } finally {
      setReopening(false);
    }
  }

  const iconFor = (a: ToolbarAction) =>
    a.kind === "edit" ? (
      <Pencil className="size-4" />
    ) : a.kind === "delete" ? (
      <Trash2 className="size-4" />
    ) : (
      <Plus className="size-4" />
    );

  return (
    <div className="space-y-4">
      {/* Header penganggaran */}
      <Card className="p-4">
        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tahun Anggaran" value={String(header.tahun_anggaran)} />
          <Field
            label="Tahap Pagu"
            value={
              header.tahap_pagu
                ? (TAHAP_LABEL[header.tahap_pagu as TahapPagu] ??
                  header.tahap_pagu)
                : "—"
            }
          />
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <div
              className={
                "font-medium " +
                (isFinal ? "text-emerald-600 dark:text-emerald-400" : "")
              }
            >
              {isFinal ? "Final (Selesai)" : status}
            </div>
          </div>
          <Field label="BA" value={`${header.ba}`} />
          <Field label="Kementerian" value={header.kementerian} />
          <Field label="Unit Eselon I" value={header.unit} />
          <Field label="Satker" value={header.satker} />
        </div>
      </Card>

      {/* Mulai cepat: Salin Anggaran dari usulan lain (Draft & kosong) */}
      {isEmptyDraft && copySources.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-primary/15 p-2 text-primary">
              <Copy className="size-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Mulai cepat — Salin Anggaran</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Usulan ini masih kosong. Salin seluruh kegiatan & rincian dari
                tahap/tahun sebelumnya agar Anda tinggal menyesuaikan, tanpa
                input ulang dari nol.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Sumber salinan
                  </label>
                  <Select
                    value={copySourceId}
                    onChange={(e) => setCopySourceId(e.target.value)}
                    disabled={copying}
                    className="min-w-[280px]"
                  >
                    <option value="">— Pilih usulan sumber —</option>
                    {copySources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {labelSource(s)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  onClick={onCopyAnggaran}
                  disabled={!copySourceId || copying}
                  size="sm"
                >
                  {copying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Menyalin…
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" /> Salin ke Draft ini
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Toolbar dinamis + pagu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <Button
              key={a.key}
              variant={
                a.kind === "delete"
                  ? "destructive"
                  : a.kind === "edit"
                    ? "secondary"
                    : "default"
              }
              size="sm"
              disabled={isFinal}
              onClick={() => handleAction(a)}
            >
              {iconFor(a)} {a.kind === "add" ? `${i + 1}. ` : ""}
              {a.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Pagu : {fmtN(total)}
          </div>
          {isFinal ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Lock className="size-4" /> Tahap Final
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={reopening}
                onClick={onReopen}
                title="Kembalikan ke Draft agar rincian dapat diubah lagi"
              >
                <Unlock className="size-4" />{" "}
                {reopening ? "Memproses…" : "Buka Finalisasi"}
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={finalizing}
              onClick={onFinalize}
            >
              <CheckCircle2 className="size-4" />{" "}
              {finalizing ? "Memproses…" : "Finalkan Tahap"}
            </Button>
          )}
        </div>
      </div>

      {isFinal && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          Tahap ini sudah <strong>Final</strong> dan terkunci dari perubahan.
          Tahap pagu berikutnya kini dapat dibuat dari halaman Penganggaran. Bila
          masih perlu mengubah rincian, gunakan tombol{" "}
          <strong>Buka Finalisasi</strong> di atas.
        </p>
      )}

      {/* Bar status simpan: setiap perubahan tersimpan otomatis; tombol Simpan untuk memastikan/sinkron. */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Menyimpan…
            </>
          ) : lastSavedAt ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Tersimpan
              otomatis · pukul{" "}
              {lastSavedAt.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Setiap
              perubahan tersimpan otomatis
            </>
          )}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          disabled={saving}
        >
          <Save className="size-4" /> Simpan
        </Button>
      </div>

      <TreeGrid rows={display} selectedId={selectedId} onSelect={select} />

      <p className="text-xs text-muted-foreground">
        Klik baris untuk memilih — tombol menyesuaikan level (Program → Kegiatan
        → KRO → RO → Komponen → Sub Komponen → Akun → Detail). Jumlah & pagu
        dihitung otomatis oleh database.
      </p>

      {/* Modals */}
      {picker && (
        <ReferencePicker
          open
          title={
            picker.level === "PROGRAM"
              ? "Pilih Program"
              : picker.level === "KEGIATAN"
                ? "Pilih Kegiatan"
                : picker.level === "KRO"
                  ? "Pilih KRO"
                  : picker.level === "RO"
                    ? "Pilih RO"
                    : picker.level === "KOMPONEN"
                      ? "Form Pencarian Komponen"
                      : "Form Pencarian Akun"
          }
          query={picker.query}
          extraHead={picker.extraHead}
          okGreen={picker.okGreen}
          onPick={onPickRef}
          onClose={() => setPicker(null)}
        />
      )}
      <SubKomponenForm
        open={!!subkompParent}
        onSubmit={onSubmitSubkomp}
        onClose={() => setSubkompParent(null)}
      />
      <DetailForm
        open={!!detail}
        initial={detail?.initial}
        akunInfo={detail?.akunInfo}
        onSubmit={onSubmitDetail}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function labelSource(s: CopySource): string {
  const tahap = TAHAP_LABEL[s.tahap as TahapPagu] ?? s.tahap;
  return `TA ${s.tahun} · ${tahap} · ${s.status} — Pagu ${fmtN(s.total)}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
