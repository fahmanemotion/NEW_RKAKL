import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui';

export default async function ReviewPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Review Usulan</h1>
        <p className="text-sm text-muted-foreground">Tinjau dan setujui usulan anggaran satker.</p>
      </div>
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Modul Review sedang disiapkan. Segera hadir.</p>
      </Card>
    </div>
  );
}
