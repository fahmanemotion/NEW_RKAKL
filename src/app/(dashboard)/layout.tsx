import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/shell/shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <Shell user={user}>{children}</Shell>;
}
