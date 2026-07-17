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
  TOTAL: string; TERBILANG: string; TEMPAT_TGL_TTD: string; SUMBER_DANA: string;
  /** Rincian nominal tiap DIPA saat sumber dana = RM & BLU; "" bila sumber tunggal. */
  RINCIAN_DANA: string;
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

/** Satu baris rincian RAB pada Bagian E. */
export interface RabRow {
  kode: string;
  uraian: string;
  nominal: string; // sudah terformat, mis. "691.195.000,-"
}

const AR = '<w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
function tcell(text: string, w: number, opt: { bold?: boolean; jc?: string } = {}): string {
  const jc = opt.jc ? `<w:jc w:val="${opt.jc}"/>` : "";
  const b = opt.bold ? "<w:b/>" : "";
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>${jc}</w:pPr>` +
    `<w:r><w:rPr>${AR}${b}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`
  );
}
const COLS = [640, 2560, 4160, 2240];
/** Bangun XML tabel rincian RAB (No | Kode | Uraian | Anggaran) + baris Total. */
function buildRabTableXml(rows: RabRow[], total: string): string {
  const bd = (s: string) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
  const borders = `<w:tblBorders>${bd("top")}${bd("left")}${bd("bottom")}${bd("right")}${bd("insideH")}${bd("insideV")}</w:tblBorders>`;
  const grid = COLS.map((w) => `<w:gridCol w:w="${w}"/>`).join("");
  const header =
    "<w:tr>" +
    tcell("No.", COLS[0], { bold: true, jc: "center" }) +
    tcell("Kode", COLS[1], { bold: true, jc: "center" }) +
    tcell("Uraian", COLS[2], { bold: true, jc: "center" }) +
    tcell("Anggaran (Rp)", COLS[3], { bold: true, jc: "center" }) +
    "</w:tr>";
  const body = rows
    .map(
      (r, i) =>
        "<w:tr>" +
        tcell(String(i + 1), COLS[0], { jc: "center" }) +
        tcell(r.kode, COLS[1]) +
        tcell(r.uraian, COLS[2]) +
        tcell(r.nominal, COLS[3], { jc: "right" }) +
        "</w:tr>",
    )
    .join("");
  const totalRow =
    "<w:tr>" +
    tcell("", COLS[0]) +
    tcell("", COLS[1]) +
    tcell("Total Anggaran", COLS[2], { bold: true }) +
    tcell(total, COLS[3], { bold: true, jc: "right" }) +
    "</w:tr>";
  return `<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/>${borders}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${header}${body}${totalRow}</w:tbl>`;
}

/** Ganti paragraf penanda {{TOKEN}} dengan XML pengganti (tabel/paragraf). */
function replaceMarker(xml: string, token: string, content: string): string {
  const re = new RegExp(
    `<w:p\\b[^>]*>(?:(?!</w:p>)[\\s\\S])*?\\{\\{${token}\\}\\}(?:(?!</w:p>)[\\s\\S])*?</w:p>`,
  );
  return xml.replace(re, () => content);
}

/**
 * Penanda butir daftar: "- ", "• ", "* ", atau penomoran manual "a. " / "1) ".
 * Huruf sengaja dibatasi SATU (`[a-z][.)]`, bukan dua): singkatan dua huruf
 * berakhiran titik lazim mengawali kalimat hukum — "No. 5 Tahun 2003", "PP. 21"
 * — dan akan salah dikira butir. Penanda "- " tetap jalan untuk butir ke-27 dst.
 * Penanda tanpa isi ("-" saja) ikut tertangkap agar bisa dilewati, bukan dicetak.
 */
const BUTIR_RE = /^(?:[-•*]|[a-z][.)]|\d+[.)])(?:\s+|$)/i;

/** Nomor butir → huruf: a, b, … z, aa, ab, … (aman bila butir lebih dari 26). */
function hurufButir(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    s = String.fromCharCode(97 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Ubah teks narasi (multi-baris) menjadi paragraf .docx.
 *
 * Baris butir ("- ", atau penomoran manual "a."/"1.") DILETAKKAN ULANG hurufnya
 * secara otomatis (a, b, c, …) mengikuti urutan tampil, sehingga menyisipkan atau
 * memindah butir tak pernah membuat huruf meloncat. Penomoran manual apa pun
 * dibuang lebih dulu agar tidak dobel ("a. a. …").
 *
 * Butir memakai indentasi GANTUNG + tab: huruf di kolom 360, teks di kolom 720,
 * sehingga baris sambungan lurus dengan teks di atasnya (bukan di bawah hurufnya).
 * Deret huruf di-reset oleh paragraf biasa atau sub-judul "## ".
 */
function narasiToXml(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  const baris = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let n = 0; // urutan butir pada deret yang sedang berjalan
  const out: string[] = [];
  for (const line of baris) {
    if (/^##\s+/.test(line)) {
      n = 0;
      const s = line.replace(/^##\s+/, "");
      out.push(
        `<w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr>${AR}<w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(s)}</w:t></w:r></w:p>`,
      );
      continue;
    }
    const m = BUTIR_RE.exec(line);
    if (m) {
      const isi = line.slice(m[0].length).trim();
      if (!isi) continue; // butir kosong (mis. "- " yang belum diisi) → lewati
      const label = `${hurufButir(n++)}.`;
      out.push(
        `<w:p><w:pPr><w:spacing w:after="80" w:line="360" w:lineRule="auto"/>` +
          `<w:ind w:left="720" w:hanging="360"/><w:jc w:val="both"/></w:pPr>` +
          `<w:r><w:rPr>${AR}<w:sz w:val="24"/></w:rPr>` +
          `<w:t xml:space="preserve">${escapeXml(label)}</w:t><w:tab/>` +
          `<w:t xml:space="preserve">${escapeXml(isi)}</w:t></w:r></w:p>`,
      );
      continue;
    }
    n = 0; // paragraf biasa memutus deret butir
    out.push(
      `<w:p><w:pPr><w:spacing w:after="80" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr>${AR}<w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`,
    );
  }
  return out.join("");
}

/** Satu baris tahapan pada matriks Kurun Waktu (bulan 1-12). */
export interface TahapanRow {
  nama: string;
  bulanMulai: number;
  bulanSelesai: number;
}
/** Bangun matriks 12 bulan; sel bulan aktif tiap tahapan diarsir. */
function buildMatriksXml(rows: TahapanRow[]): string {
  const LW = 2400;
  const MW = Math.floor((9600 - LW) / 12);
  const SH = "A6A6A6";
  const bd = (s: string) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
  const borders = `<w:tblBorders>${bd("top")}${bd("left")}${bd("bottom")}${bd("right")}${bd("insideH")}${bd("insideV")}</w:tblBorders>`;
  const grid = `<w:gridCol w:w="${LW}"/>` + Array.from({ length: 12 }, () => `<w:gridCol w:w="${MW}"/>`).join("");
  const mc = (t: string, w: number, o: { b?: boolean; jc?: string; shade?: string } = {}) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ""}<w:vAlign w:val="center"/></w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:after="0" w:line="240"/><w:jc w:val="${o.jc || "center"}"/></w:pPr>` +
    (t ? `<w:r><w:rPr>${AR}${o.b ? "<w:b/>" : ""}<w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(t)}</w:t></w:r>` : "") +
    "</w:p></w:tc>";
  const header =
    "<w:tr>" + mc("Tahap Kegiatan", LW, { b: true }) + Array.from({ length: 12 }, (_, i) => mc(String(i + 1), MW, { b: true })).join("") + "</w:tr>";
  const list =
    rows.length > 0
      ? rows
      : [
          { nama: "Persiapan", bulanMulai: 0, bulanSelesai: 0 },
          { nama: "Pelaksanaan", bulanMulai: 0, bulanSelesai: 0 },
          { nama: "Evaluasi dan Pelaporan", bulanMulai: 0, bulanSelesai: 0 },
        ];
  const body = list
    .map((r) => {
      const cells = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const on = m >= r.bulanMulai && m <= r.bulanSelesai;
        return mc("", MW, { shade: on ? SH : "" });
      }).join("");
      return "<w:tr>" + mc(r.nama, LW, { jc: "left" }) + cells + "</w:tr>";
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/>${borders}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${header}${body}</w:tbl>`;
}

/** Kunci bagian narasi yang punya penanda di template. */
const NARR_SECTIONS = [
  "DASAR_HUKUM", "GAMBARAN_UMUM", "MAKSUD_TUJUAN", "OUTPUT_OUTCOME", "LINGKUP",
  "PENERIMA_MANFAAT", "METODE", "TAHAPAN", "PELAKSANA",
];

/**
 * Bangun blob .docx TOR dari token + logo + rincian RAB + narasi + matriks.
 */
export function generateTorDocx(
  tokens: Partial<TorTokens>,
  logoDataUrl?: string | null,
  rab?: RabRow[],
  narasi?: Record<string, string>,
  tahapan?: TahapanRow[],
): Blob {
  const zip = new PizZip(b64ToU8(TOR_TEMPLATE_B64));
  let xml = zip.file("word/document.xml")!.asText();
  for (const [k, v] of Object.entries(tokens)) {
    xml = xml.split(`{{${k}}}`).join(escapeXml(String(v ?? "")));
  }

  // Narasi tiap bagian: ganti penanda dengan paragraf (kosong bila belum diisi).
  for (const sec of NARR_SECTIONS) {
    xml = replaceMarker(xml, sec, narasiToXml(narasi?.[sec] ?? ""));
  }
  // Matriks Kurun Waktu.
  xml = replaceMarker(xml, "MATRIKS_TABLE", buildMatriksXml(tahapan ?? []));

  // Sisipkan tabel rincian RAB menggantikan paragraf penanda {{RAB_TABLE}}.
  const rabXml = rab && rab.length ? buildRabTableXml(rab, String(tokens.TOTAL ?? "")) : "";
  xml = replaceMarker(xml, "RAB_TABLE", rabXml);

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
