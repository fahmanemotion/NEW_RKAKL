"use client";
import React from "react";
import { Button, Input, Select } from "@/components/ui";
import { Plus, Trash2, List } from "lucide-react";
import { TOR_SECTIONS, wordTargets } from "@/lib/tor-ai-sections";
import { DEFAULT_TAHAPAN, normSumberDana, type TorIsi, type TorTahapanRow } from "@/lib/tor-isi-api";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

function countWords(s: string): number {
  const t = (s || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Isian TOR per komponen: sumber dana, narasi tiap bagian, dan matriks tahapan.
 * Dipakai bersama oleh editor per-usulan (Laporan → TOR) dan pengelola template
 * (Referensi → NARASI TOR) agar bentuk isiannya selalu sama.
 */
export function TorIsiFields({
  isi,
  setIsi,
}: {
  isi: TorIsi;
  setIsi: React.Dispatch<React.SetStateAction<TorIsi>>;
}) {
  const taRef = React.useRef<Record<string, HTMLTextAreaElement | null>>({});

  function setNarasi(id: string, v: string) {
    setIsi((s) => ({ ...s, narasi: { ...s.narasi, [id]: v } }));
  }

  /** Sisipkan baris butir baru di bawah kursor; huruf (a, b, c…) diberi otomatis
   *  saat dokumen dibuat, jadi pengguna cukup mengetik isinya. */
  function tambahButir(id: string) {
    const ta = taRef.current[id];
    const cur = isi.narasi[id] ?? "";
    const pos = ta ? ta.selectionStart : cur.length;
    const sebelum = cur.slice(0, pos);
    const sesudah = cur.slice(pos);
    const awalan = !sebelum || sebelum.endsWith("\n") ? "" : "\n";
    const sisip = `${awalan}- `;
    setNarasi(id, sebelum + sisip + sesudah);
    // Taruh kursor tepat setelah "- " agar bisa langsung mengetik.
    const kursor = sebelum.length + sisip.length;
    requestAnimationFrame(() => {
      const el = taRef.current[id];
      if (!el) return;
      el.focus();
      el.setSelectionRange(kursor, kursor);
    });
  }

  /** Enter di baris butir → otomatis buat butir berikutnya (Enter di butir kosong = keluar). */
  function onKeyDownNarasi(id: string, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    const el = e.currentTarget;
    const pos = el.selectionStart;
    if (pos !== el.selectionEnd) return;
    const cur = isi.narasi[id] ?? "";
    const barisIni = cur.slice(0, pos).split("\n").pop() ?? "";
    if (!/^\s*-\s?/.test(barisIni)) return; // bukan baris butir → biarkan Enter biasa
    e.preventDefault();
    if (!barisIni.replace(/^\s*-\s?/, "").trim()) {
      // Butir kosong → hapus penandanya, keluar dari mode daftar.
      const awal = pos - barisIni.length;
      setNarasi(id, cur.slice(0, awal) + cur.slice(pos));
      requestAnimationFrame(() => taRef.current[id]?.setSelectionRange(awal, awal));
      return;
    }
    const sisip = "\n- ";
    setNarasi(id, cur.slice(0, pos) + sisip + cur.slice(pos));
    const kursor = pos + sisip.length;
    requestAnimationFrame(() => taRef.current[id]?.setSelectionRange(kursor, kursor));
  }
  function setTahapan(i: number, patch: Partial<TorTahapanRow>) {
    setIsi((s) => ({ ...s, tahapan: s.tahapan.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  }
  function addTahapan() {
    setIsi((s) => ({ ...s, tahapan: [...s.tahapan, { nama: "", bulan_mulai: 1, bulan_selesai: 1 }] }));
  }
  function delTahapan(i: number) {
    setIsi((s) => ({ ...s, tahapan: s.tahapan.filter((_, j) => j !== i) }));
  }

  return (
    <>
      {/* Sumber dana */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Sumber dana (Bagian Biaya):</label>
        <Select
          value={isi.sumberDana}
          onChange={(e) => setIsi((s) => ({ ...s, sumberDana: normSumberDana(e.target.value) }))}
          className="w-56"
        >
          <option value="RM">RM — Rupiah Murni</option>
          <option value="BLU">BLU — PNBP/BLU</option>
          <option value="RM_BLU">RM &amp; BLU — dua sumber DIPA</option>
        </Select>
      </div>
      {isi.sumberDana === "RM_BLU" && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Narasi Bagian E akan menyebut total biaya beserta rinciannya: berapa dari DIPA RM dan
          berapa dari DIPA BLU. Nilainya dihitung otomatis dari sumber dana tiap akun di kertas kerja.
        </p>
      )}

      {/* Narasi per bagian */}
      {TOR_SECTIONS.map((s) => {
        const w = wordTargets(s.pages);
        const n = countWords(isi.narasi[s.id] ?? "");
        const kurang = n > 0 && n < w.min;
        return (
          <div key={s.id} className="rounded-lg border p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                {s.no}. {s.title}
              </span>
              <span className={`text-xs ${kurang ? "text-amber-600" : "text-muted-foreground"}`}>
                {n} kata · target {w.min}–{w.max} (± {s.pages} hlm)
              </span>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{s.guidance}</p>
            <div className="mb-1.5 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => tambahButir(s.id)}
                className="h-7 px-2 text-xs"
                title="Sisipkan butir daftar — huruf a, b, c… diberi otomatis"
              >
                <List className="size-3.5" /> Butir
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Baris diawali <code className="rounded bg-muted px-1">-</code> jadi butir; huruf{" "}
                <strong>a, b, c…</strong> diberi otomatis & selalu urut. Enter = butir berikutnya.
              </span>
            </div>
            <textarea
              ref={(el) => {
                taRef.current[s.id] = el;
              }}
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={`Tulis ${s.title.toLowerCase()}…`}
              value={isi.narasi[s.id] ?? ""}
              onChange={(e) => setNarasi(s.id, e.target.value)}
              onKeyDown={(e) => onKeyDownNarasi(s.id, e)}
            />
            {s.verifyRequired && (
              <p className="mt-1 text-xs text-amber-600">
                Perlu diverifikasi manusia (mis. nomor/tahun peraturan).
              </p>
            )}
          </div>
        );
      })}

      {/* Matriks Kurun Waktu */}
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Matriks Kurun Waktu (Bagian D)</span>
          <Button variant="outline" onClick={addTahapan} className="h-8 px-2 text-xs">
            <Plus className="size-3.5" /> Tahapan
          </Button>
        </div>
        {isi.tahapan.length === 0 && (
          <p className="mb-2 text-xs text-muted-foreground">
            Belum ada tahapan.{" "}
            <button
              className="underline"
              onClick={() => setIsi((s) => ({ ...s, tahapan: DEFAULT_TAHAPAN.map((x) => ({ ...x })) }))}
            >
              Pakai default
            </button>
            .
          </p>
        )}
        <div className="space-y-2">
          {isi.tahapan.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-40 flex-1"
                placeholder="Nama tahapan"
                value={t.nama}
                onChange={(e) => setTahapan(i, { nama: e.target.value })}
              />
              <span className="text-xs text-muted-foreground">bulan</span>
              <Select
                className="w-20"
                value={String(t.bulan_mulai)}
                onChange={(e) => setTahapan(i, { bulan_mulai: Number(e.target.value) })}
              >
                {BULAN.map((b, m) => (
                  <option key={m} value={m + 1}>{b}</option>
                ))}
              </Select>
              <span className="text-xs text-muted-foreground">s/d</span>
              <Select
                className="w-20"
                value={String(t.bulan_selesai)}
                onChange={(e) => setTahapan(i, { bulan_selesai: Number(e.target.value) })}
              >
                {BULAN.map((b, m) => (
                  <option key={m} value={m + 1}>{b}</option>
                ))}
              </Select>
              {/* mini pratinjau bulan */}
              <div className="flex gap-0.5">
                {Array.from({ length: 12 }, (_, m) => {
                  const on = m + 1 >= t.bulan_mulai && m + 1 <= t.bulan_selesai;
                  return <span key={m} className={`h-4 w-2.5 rounded-sm ${on ? "bg-primary" : "bg-muted"}`} title={BULAN[m]} />;
                })}
              </div>
              <button
                className="rounded p-1 text-destructive hover:bg-destructive/10"
                onClick={() => delTahapan(i)}
                aria-label="Hapus"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
