import { requireUser } from '@/lib/auth';
import { getSatkerLogo } from '@/lib/satker-logo';
import { Shell } from '@/components/shell/shell';
import { IdleLogout } from '@/components/shell/idle-logout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Logo diambil terpisah & di-cache (tidak lagi ikut di query profil tiap navigasi).
  const satkerLogo = await getSatkerLogo(user.satker_id);
  return (
    <Shell user={user} satkerLogo={satkerLogo}>
      <IdleLogout />
      {children}
    </Shell>
  );
}
