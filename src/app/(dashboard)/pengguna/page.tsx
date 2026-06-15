import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui';

export default async function PenggunaPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Manajemen Pengguna</h1>
        <p className="text-sm text-muted-foreground">Kelola akun, peran, dan satker pengguna.</p>
      </div>
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Modul Pengguna sedang disiapkan. Segera hadir.</p>
      </Card>
    </div>
  );
}
