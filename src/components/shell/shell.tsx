'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { ThemeToggle } from '@/components/theme';
import { navForRole, type NavItem } from './nav';
import { PresenceProvider, PresencePanel } from './presence';
import { RouteProgress, LinkPendingIcon } from '@/components/ui/loading';
import type { CurrentUser } from '@/lib/auth';
import { STATUS_COLOR } from '@/lib/constants';

export function Shell({ user, satkerLogo, children }: { user: CurrentUser; satkerLogo?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const items = navForRole(user.role);

  async function logout() {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <PresenceProvider user={user}>
      <RouteProgress />
      <div className="flex min-h-screen bg-background">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col app-sidebar bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0',
            open && 'translate-x-0',
          )}
        >
          {/* Logo + identitas satker */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sidebar-accent to-primary text-white shadow-lg shadow-black/25 ring-1 ring-white/15">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold leading-tight tracking-wide text-white">SIRANGGA</div>
              <div className="truncate text-[11px] leading-tight text-sidebar-foreground/55">
                {user.satker_nama ?? 'Satuan Kerja'}
              </div>
            </div>
            <button
              className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigasi */}
          <nav className="shrink-0 space-y-0.5 px-3 pb-2 pt-3">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
              Menu
            </p>
            {items.map((it: NavItem) => {
              const active = pathname.startsWith(it.href);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'nav-active'
                      : 'text-sidebar-foreground/75 hover:bg-white/[0.07] hover:text-white',
                  )}
                >
                  <LinkPendingIcon
                    Icon={Icon}
                    className={cn(
                      'size-[18px] shrink-0 transition-colors',
                      active ? 'text-sidebar-accent' : 'text-sidebar-foreground/55 group-hover:text-white',
                    )}
                  />
                  {it.label}
                </Link>
              );
            })}
          </nav>

          {/* Panel kolaborasi (hanya di halaman input anggaran). Saat tidak
              aktif → null; ruang sidebar dibiarkan lapang. */}
          <PresencePanel />
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* ── Konten ──────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/70 px-4 shadow-sm backdrop-blur-md">
            <button
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </button>

            {satkerLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={satkerLogo}
                alt="Logo satker"
                className="h-9 w-auto max-w-[150px] object-contain"
              />
            )}

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ThemeToggle />

              <div className="hidden items-center gap-2 sm:flex">
                <div className="text-right leading-tight">
                  <div className="text-sm font-medium">{user.nama}</div>
                  <div className="text-xs text-muted-foreground">{user.jabatan ?? user.email}</div>
                </div>
                {user.role && <Badge className={STATUS_COLOR.Draft}>{user.role}</Badge>}
              </div>

              <div className="hidden h-6 w-px bg-border sm:block" />

              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                title="Keluar dari aplikasi"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </PresenceProvider>
  );
}
