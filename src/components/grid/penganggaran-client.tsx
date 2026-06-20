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
  ClipboardPaste,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button, Card, Select } from "@/components/ui";
import { flattenForGrid, subtreeIds, filterStruktur, programAncestorId, type GridRow } from "@/lib/tree";
import { toolbarActions, type ToolbarAction } from "@/lib/toolbar";
import { fmtN, type Level } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TAHAP_LABEL, type TahapPagu } from "@/lib/tahap-pagu";
import { usePenganggaran } from "@/store/penganggaran";
import {
  addNode,
  upsertDetail,
  deleteNodes,
  pasteNode,
  claimKro,
  releaseKro,
  editNode,
  setChildrenSumber,
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
  editId?: string; // bila mengganti referensi node yang sudah ada (mis. ganti Akun)
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
  me,
}: {
  header: UsulanHeader;
  initialRows: UsulanStruktur[];
  me: { id: string; nama: string | null };
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
    parentId?: string;
    editId?: string;
    initial?: { kode: string; uraian: string };
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

  const { gridRows: allGridRows, total } = React.useMemo(
    () => flattenForGrid(rows, { kppn: header.kppn, lokus: header.lokus }),
    [rows, header.kppn, header.lokus],
  );

  // ── Filter tampilan: Program → KRO (agar tidak semua usulan tampil) ─────────
  const programs = React.useMemo(
    () =>
      rows
        .filter((r) => r.level === "PROGRAM")
        .map((r) => ({ id: r.id, kode: r.kode ?? "", uraian: r.uraian ?? "" })),
    [rows],
  );
  const [filterProgram, setFilterProgram] = React.useState("ALL");
  const [filterKro, setFilterKro] = React.useState("ALL");
  React.useEffect(() => setFilterKro("ALL"), [filterProgram]);
  const kros = React.useMemo(() => {
    if (filterProgram === "ALL") return [];
    return rows
      .filter((r) => r.level === "KRO" && programAncestorId(rows, r.id) === filterProgram)
      .map((r) => ({ id: r.id, kode: r.kode ?? "", uraian: r.uraian ?? "" }));
  }, [rows, filterProgram]);

  const gridRows = React.useMemo(() => {
    if (filterProgram === "ALL") return allGridRows;
    const sub = filterStruktur(
      rows,
      filterProgram,
      filterKro === "ALL" ? null : filterKro,
    );
    return flattenForGrid(sub, { kppn: header.kppn, lokus: header.lokus }).gridRows;
  }, [filterProgram, filterKro, rows, allGridRows, header.kppn, header.lokus]);

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
  const [clip, setClip] = React.useState<{ id: string; level: Level; label: string } | null>(null);
  const [pasting, setPasting] = React.useState(false);
  const actions = toolbarActions(selType, clip?.level ?? null);

  // ── Kunci KRO (input paralel) ──────────────────────────────────────────────
  const byId = React.useMemo(
    () => new Map(rows.map((r) => [r.id, r])),
    [rows],
  );
  function kroAncestor(id: string | null | undefined): UsulanStruktur | null {
    let cur = id ? byId.get(id) ?? null : null;
    while (cur) {
      if (cur.level === "KRO") return cur;
      cur = cur.parent_id ? byId.get(cur.parent_id) ?? null : null;
    }
    return null;
  }
  const selKro = kroAncestor(selectedRow?.ref?.id ?? null);
  const kroOwnerId = selKro?.dikerjakan_oleh ?? null;
  const kroOwnerNama = selKro?.dikerjakan_oleh_nama ?? null;
  const lockedByOther = !!kroOwnerId && kroOwnerId !== me.id;
  const ownedByMe = !!kroOwnerId && kroOwnerId === me.id;
  const [claimBusy, setClaimBusy] = React.useState(false);

  async function onClaim() {
    if (!selKro) return;
    setClaimBusy(true);
    try {
      await claimKro(selKro.id, me);
      await refresh();
    } catch (e) {
      alert(
        (e as Error).message?.includes("TERKUNCI")
          ? "KRO ini sedang dikerjakan pengguna lain."
          : (e as Error).message,
      );
    } finally {
      setClaimBusy(false);
    }
  }
  async function onRelease() {
    if (!selKro) return;
    setClaimBusy(true);
    try {
      await releaseKro(selKro.id, me);
      await refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setClaimBusy(false);
    }
  }

  async function onPaste() {
    if (!clip || !selectedRow?.ref) return;
    setPasting(true);
    try {
      await pasteNode(header.id, clip.id, selectedRow.ref.id);
      await refresh();
      // Item sudah ditempel → kosongkan clipboard agar tombol Tempel hilang.
      setClip(null);
    } catch (e) {
      alert(
        (e as Error).message?.includes("DUPLIKAT")
          ? "Tidak bisa menempel: sudah ada item dengan kode yang sama pada induk tujuan."
          : (e as Error).message?.includes("TERKUNCI")
            ? "KRO tujuan sedang dikerjakan pengguna lain."
            : `Gagal menempel: ${(e as Error).message}`,
      );
    } finally {
      setPasting(false);
    }
  }

  function handleAction(a: ToolbarAction) {
    // Blokir input bila KRO induk dikerjakan pengguna lain.
    if (lockedByOther && (a.kind === "add" || a.kind === "edit" || a.kind === "delete" || a.kind === "paste")) {
      alert(`KRO ini sedang dikerjakan oleh ${kroOwnerNama || "pengguna lain"}. Anda tidak dapat menginput di sini.`);
      return;
    }
    if (a.kind === "delete") return onDelete();
    if (a.kind === "copy") {
      if (selectedRow?.ref && selType && selType !== "INFO") {
        const label = `${selectedRow.kode ? selectedRow.kode + " — " : ""}${selectedRow.uraian ?? ""}`;
        setClip({ id: selectedRow.ref.id, level: selType as Level, label });
      }
      return;
    }
    if (a.kind === "paste") return onPaste();
    if (a.kind === "edit") {
      if (selType === "DETAIL") return onEditDetail();
      if (selType === "SUB_KOMPONEN") return onEditSubkomp();
      if (selType === "AKUN") return onEditAkun();
      return;
    }
    if (a.kind !== "add" || !a.addLevel) return;
    openAdd(a.addLevel, a.as === "sibling");
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

  async function openAdd(level: Level, asSibling = false) {
    // Tentukan node INDUK tempat node baru dilekatkan.
    let parentId: string | null;
    let parentRef: string | null = null;
    let parentKode: string;
    let parentSumber: string | null = null;

    if (level === "PROGRAM") {
      // Program selalu di akar (Tambah Program = saudara antar program).
      parentId = null;
      parentKode = "022";
    } else if (asSibling) {
      // Tambah saudara: level sama, induk = induk node terpilih.
      const sel = selectedRow?.ref;
      if (selectedRow?.type !== level || !sel) {
        return alert(`Pilih baris ${level} dulu untuk menambah ${level} sejajar.`);
      }
      const p = sel.parent_id ? byId.get(sel.parent_id) ?? null : null;
      if (!p) return alert(`Induk untuk ${level} tidak ditemukan.`);
      parentId = p.id;
      parentRef = p.referensi_id ?? null;
      parentKode = p.kode ?? "";
      parentSumber = p.sumber_dana ?? null;
    } else {
      // Tambah anak: induk = node terpilih (harus level induk yang tepat).
      const needType = PARENT_OF[level];
      if (selectedRow?.type !== needType || !selectedRow.ref) {
        return alert(`Pilih baris ${needType} dulu untuk menambahkan ${level}.`);
      }
      parentId = selectedRow.ref.id;
      parentRef = selectedRow.ref.referensi_id ?? null;
      parentKode = selectedRow.kode;
      parentSumber = selectedRow.sumber_dana ?? null;
    }

    if (level === "SUB_KOMPONEN") return setSubkompParent({ parentId });
    if (level === "DETAIL") {
      // Sumber dana & kategori detail otomatis ikut akun (induk).
      const akunSumber = parentSumber ?? "RM";
      let kategori: string | undefined;
      if (parentRef) {
        const meta = await getAkunMeta(parentRef);
        if (meta) kategori = meta.kategori_belanja;
      }
      const akunNode = parentId ? byId.get(parentId) ?? null : null;
      return setDetail({
        parentId,
        inheritedSumberDana: akunSumber,
        akunInfo: {
          kode: akunNode?.kode ?? "",
          uraian: akunNode?.uraian ?? "",
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

    // Mode GANTI (mis. ganti Akun): ubah node yang ada, jangan tambah baru.
    if (picker.editId) {
      try {
        await editNode(picker.editId, {
          referensi_id: row.id,
          kode,
          uraian: row.nama,
          sumber_dana,
        });
        // Sumber dana detail anak ikut akun yang baru.
        if (level === "AKUN") await setChildrenSumber(picker.editId, sumber_dana);
      } catch (e) {
        alert((e as Error).message);
        return;
      }
      setPicker(null);
      await refresh();
      return;
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
    if (subkompParent.editId) {
      await editNode(subkompParent.editId, {
        kode: v.kode === "-" ? "-" : v.kode,
        uraian: v.uraian,
      });
    } else if (subkompParent.parentId) {
      await addNode({
        usulan_id: header.id,
        parent_id: subkompParent.parentId,
        level: "SUB_KOMPONEN",
        kode: v.kode === "-" ? "-" : v.kode,
        uraian: v.uraian,
      });
    }
    setSubkompParent(null);
    await refresh();
  }

  function onEditSubkomp() {
    if (selectedRow?.type !== "SUB_KOMPONEN" || !selectedRow.ref) return;
    const r = selectedRow.ref;
    setSubkompParent({
      editId: r.id,
      initial: { kode: r.kode ?? "", uraian: r.uraian ?? "" },
    });
  }

  async function onEditAkun() {
    if (selectedRow?.type !== "AKUN" || !selectedRow.ref) return;
    const r = selectedRow.ref;
    const parent = rows.find((x) => x.id === r.parent_id);
    const q = refQueryFor("AKUN", parent?.referensi_id ?? null);
    if (!q) return;
    setPicker({
      level: "AKUN",
      query: q,
      parentStrukturId: r.parent_id,
      parentKode: parent?.kode ?? "",
      extraHead: "Kategori",
      editId: r.id,
    });
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
      segments: v.segments,
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
        segments:
          (r as { volume_rincian?: { qty: number; sat: string }[] | null })
            .volume_rincian ?? null,
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
      // Hapus node ini beserta seluruh turunannya (anak terdalam dulu).
      const ids = subtreeIds(rows, selectedRow.ref.id);
      await deleteNodes(ids.length ? ids : [selectedRow.ref.id]);
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
    ) : a.kind === "copy" ? (
      <Copy className="size-4" />
    ) : a.kind === "paste" ? (
      <ClipboardPaste className="size-4" />
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

      {/* Indikator clipboard salin/tempel */}
      {clip && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm dark:border-sky-900 dark:bg-sky-950/30">
          <span className="flex items-center gap-2">
            <Copy className="size-4 text-sky-600" />
            <span>
              Tersalin{" "}
              <span className="font-medium">
                {clip.level === "SUB_KOMPONEN" ? "Sub Komponen" : clip.level === "AKUN" ? "Akun" : "Detail"}
              </span>
              : {clip.label}.{" "}
              <span className="text-muted-foreground">
                Pilih{" "}
                {clip.level === "SUB_KOMPONEN" ? "Komponen" : clip.level === "AKUN" ? "Sub Komponen" : "Akun"}{" "}
                tujuan lalu klik <strong>Tempel</strong>.
              </span>
            </span>
          </span>
          <button
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
            onClick={() => setClip(null)}
          >
            Batal salin
          </button>
        </div>
      )}

      {/* Status kunci KRO (input paralel) */}
      {selKro && !isFinal && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm",
            lockedByOther
              ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
              : ownedByMe
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-border bg-muted/40",
          )}
        >
          <span className="flex items-center gap-2">
            <Lock className={cn("size-4", lockedByOther ? "text-amber-600" : ownedByMe ? "text-emerald-600" : "text-muted-foreground")} />
            {lockedByOther ? (
              <span>
                KRO <span className="font-medium">{selKro.kode}</span> sedang dikerjakan oleh{" "}
                <span className="font-medium">{kroOwnerNama || "pengguna lain"}</span>. Anda tidak dapat menginput di bawahnya.
              </span>
            ) : ownedByMe ? (
              <span>
                Anda sedang mengerjakan KRO <span className="font-medium">{selKro.kode}</span>. Pengguna lain tidak dapat menginput di sini.
              </span>
            ) : (
              <span>
                KRO <span className="font-medium">{selKro.kode}</span> belum diklaim. Klaim agar tidak bentrok dengan operator lain.
              </span>
            )}
          </span>
          {ownedByMe ? (
            <Button size="sm" variant="outline" onClick={onRelease} disabled={claimBusy}>
              {claimBusy ? "…" : "Lepas KRO"}
            </Button>
          ) : !lockedByOther ? (
            <Button size="sm" onClick={onClaim} disabled={claimBusy}>
              {claimBusy ? "…" : "Kerjakan KRO ini"}
            </Button>
          ) : null}
        </div>
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
                  : a.kind === "paste"
                    ? "default"
                    : a.kind === "edit" || a.kind === "copy"
                      ? "secondary"
                      : "default"
              }
              size="sm"
              disabled={
                isFinal ||
                (a.kind === "paste" && pasting) ||
                (lockedByOther && (a.kind === "add" || a.kind === "edit" || a.kind === "delete" || a.kind === "paste"))
              }
              onClick={() => handleAction(a)}
            >
              {iconFor(a)} {a.kind === "add" ? `${i + 1}. ` : ""}
              {a.kind === "paste" && pasting ? "Menempel…" : a.label}
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

      {/* Filter tampilan: Program → KRO */}
      {programs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
          <span className="font-medium text-muted-foreground">Filter tampilan:</span>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Program</span>
            <Select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="min-w-[200px]"
            >
              <option value="ALL">Semua Program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kode ? `${p.kode} — ` : ""}{p.uraian}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">KRO</span>
            <Select
              value={filterKro}
              onChange={(e) => setFilterKro(e.target.value)}
              disabled={filterProgram === "ALL" || kros.length === 0}
              className="min-w-[240px]"
            >
              <option value="ALL">Semua KRO</option>
              {kros.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kode ? `${k.kode} — ` : ""}{k.uraian}
                </option>
              ))}
            </Select>
          </label>
          {filterProgram !== "ALL" && (
            <button
              className="rounded px-2 py-1 text-muted-foreground hover:bg-accent"
              onClick={() => {
                setFilterProgram("ALL");
                setFilterKro("ALL");
              }}
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-muted-foreground">
            {display.length} baris ditampilkan
          </span>
        </div>
      )}

      <TreeGrid rows={display} selectedId={selectedId} onSelect={select} meId={me.id} />

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
                      : picker.editId
                        ? "Ganti Akun"
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
        initial={subkompParent?.initial}
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
