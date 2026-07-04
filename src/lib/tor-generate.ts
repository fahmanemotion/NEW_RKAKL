// SIPPT — generator dokumen TOR (hal. 1-2) di sisi klien.
// Mengisi template .docx ber-token dengan data komponen, menukar logo, lalu unduh.
import PizZip from "pizzip";
import { TOR_TEMPLATE_B64 } from "./tor-template";

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function escapeXml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Semua token yang tersedia di template TOR hal. 1-2. */
export interface TorTokens {
  KRO_UP: string; RO_UP: string; KOMP_UP: string; KODE_FULL: string; TAHUN: string;
  SATKER_UP: string; ESELON1_UP: string; KL_UP: string; TEMPAT_TAHUN: string;
  KL: string; UNIT_ESELON: string; PROGRAM: string; SASARAN_PROG: string; IND_PROG: string;
  KEGIATAN: string; SASARAN_KEG: string; IND_KEG: string; KRO_ROW: string; IND_KRO: string;
  RO_ROW: string; IND_RO: string; VOL_RO: string; SATUAN_RO: string; KOMP: string; VOL_KOMP: string;
  // Biaya + tanda tangan
  TOTAL: string; TERBILANG: string; TEMPAT_TGL_TTD: string;
  TTD1_JABATAN: string; TTD1_NAMA: string; TTD1_NIP: string;
  TTD2_JABATAN: string; TTD2_NAMA: string; TTD2_NIP: string;
}

/** Baca dimensi PNG (piksel) dari header IHDR. null bila bukan PNG valid. */
function pngSize(u8: Uint8Array): { w: number; h: number } | null {
  if (u8.length < 24 || u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4e || u8[3] !== 0x47) return null;
  const rd = (o: number) =>
    ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0;
  const w = rd(16);
  const h = rd(20);
  return w > 0 && h > 0 ? { w, h } : null;
}

// Kotak logo pada template (EMU) — nilai extent asli di document.xml.
const LOGO_BOX_W = 873760;
const LOGO_BOX_H = 908050;
const LOGO_POS_H = 2438400; // offset kiri asli (menengahkan logo selebar kotak)
const LOGO_CENTER_X = LOGO_POS_H + LOGO_BOX_W / 2;

/**
 * Bangun blob .docx TOR dari token + logo (data URL PNG opsional).
 * Mengganti token teks di word/document.xml & menukar word/media/image1.png.
 * Ukuran tampil logo disesuaikan dengan RASIO asli (contain, tanpa distorsi)
 * dan diposisikan tetap di tengah.
 */
export function generateTorDocx(tokens: Partial<TorTokens>, logoDataUrl?: string | null): Blob {
  const zip = new PizZip(b64ToU8(TOR_TEMPLATE_B64));
  let xml = zip.file("word/document.xml")!.asText();
  for (const [k, v] of Object.entries(tokens)) {
    xml = xml.split(`{{${k}}}`).join(escapeXml(String(v ?? "")));
  }

  // Siapkan logo bila ada (data URL gambar).
  let logoU8: Uint8Array | null = null;
  if (logoDataUrl && logoDataUrl.startsWith("data:image")) {
    const comma = logoDataUrl.indexOf(",");
    const b64 = comma >= 0 ? logoDataUrl.slice(comma + 1) : "";
    if (b64) {
      try {
        logoU8 = b64ToU8(b64);
      } catch {
        logoU8 = null;
      }
    }
  }

  // Sesuaikan extent (ukuran tampil) & posisi logo agar tidak gepeng.
  if (logoU8) {
    const sz = pngSize(logoU8);
    if (sz) {
      const scale = Math.min(LOGO_BOX_W / sz.w, LOGO_BOX_H / sz.h);
      const cx = Math.round(sz.w * scale);
      const cy = Math.round(sz.h * scale);
      // wp:extent & a:ext logo sama-sama bernilai cx=873760 cy=908050 → ganti keduanya.
      xml = xml.split(`cx="${LOGO_BOX_W}" cy="${LOGO_BOX_H}"`).join(`cx="${cx}" cy="${cy}"`);
      // Jaga logo tetap horizontal center.
      const posH = Math.round(LOGO_CENTER_X - cx / 2);
      xml = xml.split(`<wp:posOffset>${LOGO_POS_H}</wp:posOffset>`).join(`<wp:posOffset>${posH}</wp:posOffset>`);
    }
  }

  zip.file("word/document.xml", xml);
  if (logoU8) {
    try {
      zip.file("word/media/image1.png", logoU8, { binary: true });
    } catch {
      /* abaikan bila gagal */
    }
  }

  const out = zip.generate({ type: "uint8array", compression: "DEFLATE" });
  return new Blob([out as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/** Picu unduhan sebuah Blob dengan nama file. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
