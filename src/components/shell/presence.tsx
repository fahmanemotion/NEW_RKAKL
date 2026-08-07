'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { CurrentUser } from '@/lib/auth';

export interface PresenceKro { id: string; kode: string; uraian: string }
export interface PresenceUser {
  userId: string;
  name: string;
  kros: PresenceKro[];
  self: boolean;
}

type SetMyKros = (kros: PresenceKro[]) => void;

const SetterCtx = React.createContext<SetMyKros>(() => {});
const UsersCtx = React.createContext<{ users: PresenceUser[]; active: boolean }>({
  users: [],
  active: false,
});

/** Ambil usulanId dari path /penganggaran/{id} (daftar /penganggaran → null). */
function usulanIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/penganggaran\/([^/]+)/);
  return m ? m[1] : null;
}

type Ping = { id: string; name: string; kros: PresenceKro[] };

const PRESENCE_CHANNEL = 'app-presence';
const PING_MS = 4000;    // umumkan kehadiran tiap 4 detik
const STALE_MS = 12000;  // anggap offline jika tak terdengar selama 12 detik

export function PresenceProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const usulanId = usulanIdFromPath(pathname);
  const [users, setUsers] = React.useState<PresenceUser[]>([]);
  const myKrosRef = React.useRef<PresenceKro[]>([]);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const pingRef = React.useRef<() => void>(() => {});

  const meId = user.id;
  const meName = user.nama ?? user.email ?? 'Pengguna';
  const meNameRef = React.useRef(meName);
  meNameRef.current = meName;

  // Saat keluar dari halaman usulan, reset KRO lalu umumkan perubahannya.
  React.useEffect(() => {
    if (!usulanId) {
      myKrosRef.current = [];
      pingRef.current();
    }
  }, [usulanId]);

  React.useEffect(() => {
    const supabase = createClient();
    // Pendekatan BROADCAST (bukan presence-state) supaya simetris & andal:
    // tiap klien mengumumkan dirinya berkala; klien lain menyimpan "last seen".
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const seen = new Map<string, { name: string; kros: PresenceKro[]; lastSeen: number }>();

    const rebuild = () => {
      const now = Date.now();
      const list: PresenceUser[] = [
        { userId: meId, name: meNameRef.current, kros: myKrosRef.current, self: true },
      ];
      for (const [id, v] of Array.from(seen.entries())) {
        if (id === meId) continue;
        if (now - v.lastSeen > STALE_MS) {
          seen.delete(id);
          continue;
        }
        list.push({ userId: id, name: v.name, kros: v.kros, self: false });
      }
      list.sort((a, b) =>
        a.self === b.self ? a.name.localeCompare(b.name, 'id') : a.self ? -1 : 1,
      );
      setUsers(list);
    };

    const ping = () => {
      void channel
        .send({
          type: 'broadcast',
          event: 'ping',
          payload: { id: meId, name: meNameRef.current, kros: myKrosRef.current } satisfies Ping,
        })
        .catch(() => {});
    };
    pingRef.current = ping;

    channel.on('broadcast', { event: 'ping' }, ({ payload }) => {
      const p = payload as Ping;
      if (!p?.id || p.id === meId) return;
      const isNew = !seen.has(p.id);
      seen.set(p.id, { name: p.name ?? 'Pengguna', kros: p.kros ?? [], lastSeen: Date.now() });
      rebuild();
      // Balas agar pendatang (dan yang lain) langsung menemukan kita — dua arah.
      if (isNew) ping();
    });
    channel.on('broadcast', { event: 'bye' }, ({ payload }) => {
      const p = payload as { id?: string };
      if (p?.id && seen.delete(p.id)) rebuild();
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ping();
        rebuild();
      }
    });

    const pingInterval = setInterval(ping, PING_MS);
    const pruneInterval = setInterval(rebuild, PING_MS);

    const bye = () => {
      void channel
        .send({ type: 'broadcast', event: 'bye', payload: { id: meId } })
        .catch(() => {});
    };
    window.addEventListener('pagehide', bye);

    return () => {
      clearInterval(pingInterval);
      clearInterval(pruneInterval);
      window.removeEventListener('pagehide', bye);
      bye();
      void supabase.removeChannel(channel);
      channelRef.current = null;
      pingRef.current = () => {};
      setUsers([]);
    };
  }, [meId]);

  // Stabil: identitasnya tidak berubah → grid tak re-render saat presence berubah.
  const setMyKros = React.useCallback<SetMyKros>((kros) => {
    myKrosRef.current = kros;
    pingRef.current();
  }, []);

  const usersValue = React.useMemo(() => ({ users, active: true }), [users]);

  return (
    <SetterCtx.Provider value={setMyKros}>
      <UsersCtx.Provider value={usersValue}>{children}</UsersCtx.Provider>
    </SetterCtx.Provider>
  );
}

/** Untuk grid: hanya setter KRO (stabil). */
export function usePresenceSetter(): SetMyKros {
  return React.useContext(SetterCtx);
}
/** Untuk panel: daftar pengguna + status aktif. */
export function usePresenceUsers() {
  return React.useContext(UsersCtx);
}

/** Panel sidebar: daftar pengguna LAIN yang sedang mengakses + KRO mereka. */
export function PresencePanel() {
  const { users, active } = usePresenceUsers();
  if (!active) return null;
  const others = users.filter((u) => !u.self);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-white/10">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        Sedang mengakses
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {others.length === 0 ? (
          <p className="px-1 text-xs text-sidebar-foreground/45">
            Belum ada pengguna lain yang mengakses.
          </p>
        ) : (
          others.map((u) => (
            <div key={u.userId} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-sm font-semibold text-white">
                <span className="block truncate">{u.name}</span>
              </div>
              {u.kros.length === 0 ? (
                <p className="mt-1 text-[11px] italic text-sidebar-foreground/45">
                  belum memilih KRO
                </p>
              ) : (
                <ol className="mt-1 space-y-0.5">
                  {u.kros.map((k, i) => (
                    <li key={`${k.id}-${i}`} className="flex gap-1.5 text-[11px] text-sidebar-foreground/75">
                      <span className="text-sidebar-foreground/40">{i + 1}.</span>
                      <span className="truncate font-mono" title={k.uraian || k.kode}>{k.kode}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
