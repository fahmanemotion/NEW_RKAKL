// SIPPT — dataset target penulisan narasi TOR per bagian + pembangun prompt AI.
// Setiap bagian membawa "jatah halaman" yang diubah menjadi target kata, lalu
// dirangkai jadi instruksi untuk AI agar narasi mengisi halaman sesuai aturan TOR.
// Modul murni (tanpa dependensi) sehingga mudah diuji dan dipakai di server/klien.

/** Perkiraan kepadatan: A4, Arial 12pt, spasi 1,5. Dipakai menurunkan target kata. */
export const WORDS_PER_PAGE = 350;

export type SectionFormat = "paragraf" | "daftar" | "campuran";

export interface TorSectionSpec {
  /** Kunci token di template (mis. {{DASAR_HUKUM}}). */
  id: string;
  /** Penomoran tampil, mis. "A.1", "B", "C.2". */
  no: string;
  /** Judul bagian. */
  title: string;
  /** Kelompok induk untuk pengelompokan di UI. */
  group: string;
  /** Jatah halaman target (mis. 2, 1.5, 0.5, 0.33). */
  pages: number;
  /** Bentuk keluaran yang diharapkan. */
  format: SectionFormat;
  /** Panduan isi (dipakai dalam prompt AI & sebagai petunjuk pengisian manual). */
  guidance: string;
  /** Wajib diverifikasi manusia (mis. Dasar Hukum: nomor peraturan rawan keliru). */
  verifyRequired?: boolean;
}

/** Rentang kata (min/target/maks) yang diturunkan dari jatah halaman. */
export function wordTargets(pages: number) {
  const target = Math.round(pages * WORDS_PER_PAGE);
  return {
    min: Math.round(target * 0.9),
    target,
    max: Math.round(target * 1.2),
  };
}

/**
 * DATASET: aturan halaman → target penulisan tiap bagian narasi TOR.
 * Urutan mengikuti struktur dokumen.
 */
export const TOR_SECTIONS: TorSectionSpec[] = [
  {
    id: "DASAR_HUKUM",
    no: "A.1",
    title: "Dasar Hukum",
    group: "A. Latar Belakang",
    pages: 2,
    format: "daftar",
    verifyRequired: true,
    guidance:
      "Susun daftar peraturan perundang-undangan yang menjadi landasan kegiatan (mis. UU Pelayaran, PP Kepelautan/Perkapalan, konvensi internasional seperti STCW/SOLAS bila relevan, Peraturan/Keputusan Menteri terkait diklat, standar biaya, serta DIPA satker tahun berkenaan). Awali dengan kalimat pengantar, tulis 12–15 butir berhuruf (a, b, c, …), lalu tutup dengan satu paragraf ringkas. Sesuaikan jenis peraturan dengan bidang komponen.",
  },
  {
    id: "GAMBARAN_UMUM",
    no: "A.2",
    title: "Gambaran Umum",
    group: "A. Latar Belakang",
    pages: 1.5,
    format: "paragraf",
    guidance:
      "Uraikan konteks strategis dan urgensi kegiatan: latar sektor/bidang, definisi dan cakupan komponen, kebutuhan yang melatarbelakangi, sasaran volume, serta peran satker. Tulis 4–6 paragraf yang mengalir, mengaitkan data komponen (volume, sasaran) dengan tujuan besar program.",
  },
  {
    id: "MAKSUD_TUJUAN",
    no: "A.3",
    title: "Maksud dan Tujuan",
    group: "A. Latar Belakang",
    pages: 0.5,
    format: "campuran",
    guidance:
      "Tulis sub-judul 'Maksud Kegiatan' (satu paragraf) dan 'Tujuan Kegiatan' (3–5 butir berhuruf). Maksud menjelaskan alasan utama; tujuan bersifat spesifik dan terukur.",
  },
  {
    id: "OUTPUT_OUTCOME",
    no: "A.4",
    title: "Output dan Outcome",
    group: "A. Latar Belakang",
    pages: 0.5,
    format: "campuran",
    guidance:
      "Tulis sub-judul 'Output' (3–4 butir keluaran langsung yang terukur, sertakan angka volume bila ada) dan 'Outcome' (3–4 butir dampak/manfaat jangka menengah).",
  },
  {
    id: "LINGKUP",
    no: "A.5",
    title: "Lingkup Kegiatan, Jenis Kegiatan dan Lokasi",
    group: "A. Latar Belakang",
    pages: 0.5,
    format: "campuran",
    guidance:
      "Tulis tiga sub-judul: 'Lingkup Kegiatan' (tahapan pekerjaan yang tercakup), 'Jenis Kegiatan' (bentuk kegiatan, mis. pelatihan/pengadaan/pembangunan), dan 'Lokasi' (tempat pelaksanaan). Masing-masing satu paragraf ringkas.",
  },
  {
    id: "PENERIMA_MANFAAT",
    no: "B",
    title: "Penerima Manfaat",
    group: "B. Penerima Manfaat",
    pages: 0.33,
    format: "paragraf",
    guidance:
      "Jelaskan penerima manfaat langsung dan tidak langsung dari kegiatan dalam 1–2 paragraf ringkas.",
  },
  {
    id: "METODE",
    no: "C.1",
    title: "Metode Pelaksanaan",
    group: "C. Strategi Pencapaian Keluaran",
    pages: 0.34,
    format: "paragraf",
    guidance:
      "Uraikan cara/metode pelaksanaan kegiatan (mis. klasikal, praktik, swakelola/kontraktual) dalam 1–2 paragraf, mengacu standar yang berlaku.",
  },
  {
    id: "TAHAPAN",
    no: "C.2",
    title: "Tahapan dan Waktu Pelaksanaan",
    group: "C. Strategi Pencapaian Keluaran",
    pages: 0.33,
    format: "paragraf",
    guidance:
      "Uraikan tahapan kegiatan (mis. Persiapan, Pelaksanaan, Evaluasi dan Pelaporan) beserta gambaran waktunya dalam satu paragraf, dan nyatakan bahwa jadwal rinci disajikan pada matriks Kurun Waktu (Bagian D).",
  },
  {
    id: "PELAKSANA",
    no: "C.3",
    title: "Pelaksana dan Penanggung Jawab",
    group: "C. Strategi Pencapaian Keluaran",
    pages: 0.33,
    format: "paragraf",
    guidance:
      "Sebutkan unit pelaksana kegiatan dan penanggung jawab (mis. Kuasa Pengguna Anggaran) beserta peran masing-masing dalam 1–2 paragraf.",
  },
];

/** Konteks komponen yang disuntikkan ke prompt (dari kertas kerja/KODE TOR). */
export interface TorPromptContext {
  kl?: string;
  satker?: string;
  program?: string;
  kegiatan?: string;
  kro?: string;
  ro?: string;
  komponen?: string;
  volume?: string;
  satuan?: string;
  anggaran?: string;
  tahun?: string;
  sumberDana?: "RM" | "BLU" | "RM_BLU";
}

function fmtPages(p: number): string {
  if (p >= 1) return p % 1 === 0 ? `${p} halaman` : `${Math.floor(p)}½ halaman`;
  if (Math.abs(p - 0.5) < 0.02) return "½ halaman";
  if (Math.abs(p - 0.34) < 0.03 || Math.abs(p - 0.33) < 0.03) return "⅓ halaman";
  return `${p} halaman`;
}

/** Instruksi sistem umum untuk seluruh pembuatan narasi TOR. */
export const TOR_SYSTEM_PROMPT =
  "Anda adalah penyusun dokumen Kerangka Acuan Kerja (KAK/TOR) pemerintah Indonesia. " +
  "Tulis dalam Bahasa Indonesia baku, lugas, dan resmi. Keluarkan HANYA isi narasi bagian yang diminta " +
  "tanpa mengulang judul bagian dan tanpa basa-basi pembuka/penutup. Patuhi panjang yang diminta.";

/**
 * Bangun prompt pengguna untuk satu bagian: menggabungkan konteks komponen,
 * target halaman → kisaran kata, bentuk, dan panduan isi.
 */
export function buildSectionPrompt(spec: TorSectionSpec, ctx: TorPromptContext): string {
  const w = wordTargets(spec.pages);
  const konteks = [
    ctx.kl && `Kementerian/Lembaga: ${ctx.kl}`,
    ctx.satker && `Satker: ${ctx.satker}`,
    ctx.program && `Program: ${ctx.program}`,
    ctx.kegiatan && `Kegiatan: ${ctx.kegiatan}`,
    ctx.kro && `KRO: ${ctx.kro}`,
    ctx.ro && `RO: ${ctx.ro}`,
    ctx.komponen && `Komponen: ${ctx.komponen}`,
    ctx.volume && `Volume: ${ctx.volume}${ctx.satuan ? " " + ctx.satuan : ""}`,
    ctx.anggaran && `Anggaran: Rp ${ctx.anggaran}`,
    ctx.tahun && `Tahun Anggaran: ${ctx.tahun}`,
    ctx.sumberDana && `Sumber dana: ${ctx.sumberDana}`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    `Tulis bagian "${spec.title}" untuk TOR komponen berikut.`,
    "",
    "KONTEKS KOMPONEN:",
    konteks,
    "",
    `PANJANG WAJIB: ± ${fmtPages(spec.pages)} (${w.min}–${w.max} kata). Jangan kurang dari ${w.min} kata; ` +
      `tulis cukup rinci hingga memenuhi jatah halaman, tanpa mengulang-ulang kalimat.`,
    `BENTUK: ${spec.format}.`,
    `PANDUAN ISI: ${spec.guidance}`,
  ];
  if (spec.verifyRequired) {
    lines.push(
      "PENTING: bagian ini akan diverifikasi manusia. Jangan mengarang nomor/tahun peraturan yang tidak pasti; " +
        "gunakan rujukan umum yang lazim dan beri tanda bila perlu diperiksa.",
    );
  }
  return lines.join("\n");
}

/** Cari spesifikasi bagian berdasarkan id token. */
export function getSectionSpec(id: string): TorSectionSpec | undefined {
  return TOR_SECTIONS.find((s) => s.id === id);
}
