'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { CurrentUser } from '@/lib/auth';

export interface PresenceKro { kode: string; uraian: string }
export interface PresenceUser {
  userId: string;
  name: string;
  kros: PresenceKro[];
  self: boolean;
}

type SetMyKros = (kros: PresenceKro[]) => void;

// Dua context terpisah: setter STABIL (dipakai grid yang berat, agar grid tidak
// ikut re-render saat daftar presence berubah) dan daftar users (dipakai panel).
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

type Meta = { name: string; kros: PresenceKro[] };

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

  const meId = user.id;
  const meName = user.nama ?? user.email ?? 'Pengguna';
  const meNameRef = React.useRef(meName);
  meNameRef.current = meName;

  React.useEffect(() => {
    if (!usulanId) {
      setUsers([]);
      return;
    }
    const supabase = createClient();
    const channel = supabase.channel(`pengang-presence:${usulanId}`, {
      config: { presence: { key: meId } },
    });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState<Meta>();
      const list: PresenceUser[] = Object.entries(state).map(([userId, metas]) => {
        const meta = metas[metas.length - 1] as (Meta & { presence_ref: string }) | undefined;
        return {
          userId,
          name: meta?.name ?? 'Pengguna',
          kros: meta?.kros ?? [],
          self: userId === meId,
        };
      });
      list.sort((a, b) =>
        a.self === b.self ? a.name.localeCompare(b.name, 'id') : a.self ? -1 : 1,
      );
      setUsers(list);
    };

    channel.on('presence', { event: 'sync' }, sync);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ name: meNameRef.current, kros: myKrosRef.current } satisfies Meta);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setUsers([]);
    };
  }, [usulanId, meId]);

  // Stabil: identitasnya tidak berubah → grid tak re-render saat presence berubah.
  const setMyKros = React.useCallback<SetMyKros>((kros) => {
    myKrosRef.current = kros;
    const ch = channelRef.current;
    if (ch) void ch.track({ name: meNameRef.current, kros } satisfies Meta).catch(() => {});
  }, []);

  const usersValue = React.useMemo(
    () => ({ users, active: !!usulanId }),
    [users, usulanId],
  );

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

/** Panel sidebar: daftar pengguna yang sedang mengakses + KRO mereka. */
export function PresencePanel() {
  const { users, active } = usePresenceUsers();
  if (!active) return null;

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
        {users.length === 0 ? (
          <p className="px-1 text-xs text-sidebar-foreground/50">Menyambungkan…</p>
        ) : (
          users.map((u) => (
            <div key={u.userId} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <span className="truncate">{u.name}</span>
                {u.self && (
                  <span className="shrink-0 rounded bg-emerald-400/15 px-1 text-[10px] font-normal text-emerald-300">
                    Anda
                  </span>
                )}
              </div>
              {u.kros.length === 0 ? (
                <p className="mt-1 text-[11px] italic text-sidebar-foreground/45">
                  belum memilih KRO
                </p>
              ) : (
                <ol className="mt-1 space-y-0.5">
                  {u.kros.map((k, i) => (
                    <li key={`${k.kode}-${i}`} className="flex gap-1.5 text-[11px] text-sidebar-foreground/75">
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
