import { requireUser } from '@/lib/auth';
import { Shell } from '@/components/shell/shell';
import { IdleLogout } from '@/components/shell/idle-logout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <Shell user={user}>
      <IdleLogout />
      {children}
    </Shell>
  );
}
