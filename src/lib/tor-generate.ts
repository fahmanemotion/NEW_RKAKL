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
}

/**
 * Bangun blob .docx TOR dari token + logo (data URL PNG opsional).
 * Mengganti token teks di word/document.xml & menukar word/media/image1.png.
 */
export function generateTorDocx(tokens: Partial<TorTokens>, logoDataUrl?: string | null): Blob {
  const zip = new PizZip(b64ToU8(TOR_TEMPLATE_B64));
  let xml = zip.file("word/document.xml")!.asText();
  for (const [k, v] of Object.entries(tokens)) {
    xml = xml.split(`{{${k}}}`).join(escapeXml(String(v ?? "")));
  }
  zip.file("word/document.xml", xml);

  // Tukar logo bila ada (data URL gambar). Ukuran/posisi mengikuti template.
  if (logoDataUrl && logoDataUrl.startsWith("data:image")) {
    const comma = logoDataUrl.indexOf(",");
    const b64 = comma >= 0 ? logoDataUrl.slice(comma + 1) : "";
    if (b64) {
      try {
        zip.file("word/media/image1.png", b64ToU8(b64), { binary: true });
      } catch {
        /* abaikan bila gagal decode logo */
      }
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
