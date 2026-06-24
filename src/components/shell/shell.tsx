'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button, Badge } from '@/components/ui';
import { ThemeToggle } from '@/components/theme';
import { navForRole, type NavItem } from './nav';
import type { CurrentUser } from '@/lib/auth';
import { STATUS_COLOR } from '@/lib/constants';

export function Shell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 -translate-x-full app-sidebar bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0',
          open && 'translate-x-0',
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-sidebar-accent to-primary text-white shadow-md shadow-black/20">
            <Building2 className="size-5" />
          </div>
          <span className="text-base font-bold tracking-wide">SIPPT</span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}><X className="size-5" /></button>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((it: NavItem) => {
            const active = pathname.startsWith(it.href);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'nav-active' : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="size-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-3">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-white/10">
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Konten */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/70 px-4 shadow-sm backdrop-blur-md">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="size-5" /></button>
          <div className="hidden text-sm text-muted-foreground sm:block">
            {user.satker_nama ?? 'Satker'}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                <div className="text-sm font-medium">{user.nama}</div>
                <div className="text-xs text-muted-foreground">{user.jabatan ?? user.email}</div>
              </div>
              {user.role && <Badge className={STATUS_COLOR.Draft}>{user.role}</Badge>}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
