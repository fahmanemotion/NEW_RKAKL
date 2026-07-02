import { LoadingScreen } from "@/components/ui/loading";

// Loader khusus halaman editor anggaran (tree grid) yang datanya cukup berat.
// Tampil seketika saat membuka sebuah usulan sehingga pengguna tahu data sedang
// dimuat dan tidak menekan tombol berulang.
export default function LoadingUsulan() {
  return <LoadingScreen label="Memuat data anggaran…" />;
}
