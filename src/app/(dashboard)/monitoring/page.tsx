import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui';

export default async function MonitoringPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Monitoring</h1>
        <p className="text-sm text-muted-foreground">Pantau realisasi dan progres anggaran.</p>
      </div>
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Modul Monitoring sedang disiapkan. Segera hadir.</p>
      </Card>
    </div>
  );
}
