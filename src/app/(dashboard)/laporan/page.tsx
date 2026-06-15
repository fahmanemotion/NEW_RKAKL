import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui';

export default async function LaporanPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Laporan</h1>
        <p className="text-sm text-muted-foreground">Cetak dan unduh laporan anggaran.</p>
      </div>
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Modul Laporan sedang disiapkan. Segera hadir.</p>
      </Card>
    </div>
  );
}
