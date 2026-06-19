import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export default async function ReferensiPage() {
  await requireUser();
  // Modul Referensi kini 3 menu; KODE sebagai halaman utama.
  redirect('/referensi/kode');
}
