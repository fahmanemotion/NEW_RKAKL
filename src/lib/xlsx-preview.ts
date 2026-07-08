// SIPPT — render worksheet xlsx-js-style menjadi HTML yang setia:
// membaca gaya sel (fill, font, border, alignment, numFmt) + merge, dan
// memformat angka gaya Indonesia (ribuan '.', desimal ','). Dipakai oleh
// pratinjau RAB & Kertas Kerja agar tampilan preview = file .xlsx yang diunduh.
import type XLSXTypes from "xlsx-js-style";
type XLSXModule = typeof import("xlsx-js-style");
/* eslint-disable @typescript-eslint/no-explicit-any */

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** ARGB/RGB xlsx → #RRGGBB. */
function toHex(rgb?: string): string | undefined {
  if (!rgb) return undefined;
  const hex = rgb.length === 8 ? rgb.slice(2) : rgb; // buang alpha
  return "#" + hex;
}

/** Tukar pemisah angka ke gaya Indonesia: 1,234.5 → 1.234,5. */
function toID(s: string): string {
  return s.replace(/,/g, "\u0000").replace(/\./g, ",").replace(/\u0000/g, ".");
}

/** Teks tampil sel: angka diformat sesuai numFmt (via .z / .s.numFmt / .w). */
function cellText(XLSX: XLSXModule, cell: any): string {
  if (cell == null) return "";
  if (cell.t === "n" && cell.v != null) {
    const z = cell.z || (cell.s && cell.s.numFmt);
    let out: string;
    if (z) {
      try {
        out = XLSX.utils.format_cell({ t: "n", v: cell.v, z } as any);
      } catch {
        out = cell.w != null ? cell.w : String(cell.v);
      }
    } else {
      out = cell.w != null ? cell.w : String(cell.v);
    }
    return toID(out);
  }
  if (cell.w != null) return cell.w;
  return cell.v != null ? String(cell.v) : "";
}

/** CSS inline dari gaya sel. */
function cellCss(cell: any): string {
  const css: string[] = [];
  const s = cell && cell.s;
  if (s) {
    const fg = s.fill && s.fill.fgColor && toHex(s.fill.fgColor.rgb);
    if (fg && fg.toUpperCase() !== "#FFFFFF") css.push(`background:${fg}`);
    if (s.font) {
      if (s.font.bold) css.push("font-weight:700");
      if (s.font.italic) css.push("font-style:italic");
      if (s.font.sz) css.push(`font-size:${s.font.sz}pt`);
      const fc = s.font.color && toHex(s.font.color.rgb);
      if (fc) css.push(`color:${fc}`);
    }
    if (s.alignment) {
      if (s.alignment.horizontal) css.push(`text-align:${s.alignment.horizontal}`);
      if (s.alignment.vertical)
        css.push(`vertical-align:${s.alignment.vertical === "center" ? "middle" : s.alignment.vertical}`);
      if (s.alignment.wrapText) css.push("white-space:normal");
    }
  }
  // Angka tanpa perataan eksplisit → rata kanan (seperti Excel).
  if (cell && cell.t === "n" && !(s && s.alignment && s.alignment.horizontal)) css.push("text-align:right");
  return css.join(";");
}

/** Render satu worksheet menjadi HTML lengkap (siap untuk iframe srcDoc). */
export function sheetToStyledHtml(XLSX: XLSXModule, ws: XLSXTypes.WorkSheet): string {
  const ref = ws["!ref"];
  if (!ref) return "<!doctype html><html><body><p>(kosong)</p></body></html>";
  const range = XLSX.utils.decode_range(ref);
  const merges = (ws["!merges"] as XLSXTypes.Range[]) || [];

  const covered = new Set<string>();
  const span = new Map<string, { cs: number; rs: number }>();
  for (const m of merges) {
    span.set(`${m.s.r},${m.s.c}`, { cs: m.e.c - m.s.c + 1, rs: m.e.r - m.s.r + 1 });
    for (let r = m.s.r; r <= m.e.r; r++)
      for (let c = m.s.c; c <= m.e.c; c++)
        if (!(r === m.s.r && c === m.s.c)) covered.add(`${r},${c}`);
  }

  let rows = "";
  for (let r = range.s.r; r <= range.e.r; r++) {
    let tds = "";
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (covered.has(`${r},${c}`)) continue;
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as any;
      const sp = span.get(`${r},${c}`);
      const cs = sp && sp.cs > 1 ? ` colspan="${sp.cs}"` : "";
      const rs = sp && sp.rs > 1 ? ` rowspan="${sp.rs}"` : "";
      const css = cellCss(cell);
      tds += `<td${cs}${rs}${css ? ` style="${css}"` : ""}>${esc(cellText(XLSX, cell))}</td>`;
    }
    rows += `<tr>${tds}</tr>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:14px;font-family:Arial,Helvetica,sans-serif;color:#111}
    table{border-collapse:collapse}
    td{border:1px solid #c9ced6;padding:2px 6px;font-size:9pt;vertical-align:middle;white-space:nowrap}
  </style></head><body><table>${rows}</table></body></html>`;
}
