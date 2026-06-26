// SIPPT — Single-session di LAPISAN APLIKASI.
//
// Kebijakan "satu akun = satu sesi aktif" ditegakkan TANPA bergantung pada
// rotasi refresh-token Supabase (yang dirotasi tiap refresh dan rawan balapan
// pada SSR Next.js → logout palsu). Sebagai identitas sesi dipakai klaim
// `session_id` bawaan access-token Supabase: sebuah UUID yang menandai satu
// sesi (baris auth.sessions) dan STABIL melewati setiap refresh token.
//
// Alur:
//   • Saat LOGIN  → registerActiveSession(): tulis session_id ini sebagai satu-
//                   satunya sesi aktif user (menimpa sesi device lama → tertendang).
//   • Tiap request terlindungi (middleware) → checkActiveSession(): bandingkan
//                   session_id request dengan yang tersimpan (READ-ONLY).
//
// Hot-path hanya membaca (1 lookup primary-key). Semua kegagalan cek = "unknown"
// → fail-OPEN (JANGAN meng-logout karena cek-nya sendiri gagal).

import type { SupabaseClient } from '@supabase/supabase-js';

/** Decode payload JWT (tanpa verifikasi — getUser() sudah memvalidasi sesi)
 *  lalu ambil klaim `session_id`. Aman di Edge, Node, maupun browser. */
export function sessionIdFromAccessToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const b64 = raw.padEnd(Math.ceil(raw.length / 4) * 4, '=');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { session_id?: string };
    return payload.session_id ?? null;
  } catch {
    return null;
  }
}

/** Daftarkan sesi Supabase saat ini sebagai SATU-SATUNYA sesi aktif user.
 *  Dipanggil SEKALI saat login berhasil. Upsert (PK user_id) → menimpa sesi
 *  device lain, sehingga request lama device itu otomatis dianggap superseded. */
export async function registerActiveSession(
  sb: SupabaseClient,
  opts: { userId: string; accessToken?: string | null; userAgent?: string | null },
): Promise<void> {
  const sid = sessionIdFromAccessToken(opts.accessToken);
  if (!sid) return; // tanpa session_id, jangan menulis apa pun (gagal aman)
  await sb.from('user_sessions').upsert(
    {
      user_id: opts.userId,
      session_id: sid,
      user_agent: opts.userAgent ?? null,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export type SessionVerdict = 'ok' | 'superseded' | 'unknown';

/** Bandingkan session_id request vs sesi aktif tersimpan. READ-ONLY.
 *   - 'ok'         → cocok, atau belum ada baris (sesi pra-deploy) → izinkan.
 *   - 'superseded' → ada baris & BERBEDA → sesi ini sudah digantikan login lain.
 *   - 'unknown'    → tak bisa memastikan (token/DB error) → caller fail-OPEN. */
export async function checkActiveSession(
  sb: SupabaseClient,
  opts: { userId: string; accessToken?: string | null },
): Promise<SessionVerdict> {
  const sid = sessionIdFromAccessToken(opts.accessToken);
  if (!sid) return 'unknown';
  const { data, error } = await sb
    .from('user_sessions')
    .select('session_id')
    .eq('user_id', opts.userId)
    .maybeSingle();
  if (error) return 'unknown'; // jangan logout karena query gagal
  if (!data) return 'ok'; // belum terdaftar → biarkan (akan terdaftar saat login berikutnya)
  return (data as { session_id: string }).session_id === sid ? 'ok' : 'superseded';
}

export interface SessionCheck {
  verdict: SessionVerdict;
  found: boolean;                 // sesi ditemukan di DB?
  sidReq: string | null;          // session_id pada request
  dbSessionId: string | null;     // session_id aktif di DB (penindih bila superseded)
}

/** Versi diperkaya dari checkActiveSession untuk keperluan LOGGING. Tetap
 *  READ-ONLY (satu SELECT). Tidak mengubah perilaku checkActiveSession. */
export async function checkActiveSessionDetailed(
  sb: SupabaseClient,
  opts: { userId: string; accessToken?: string | null },
): Promise<SessionCheck> {
  const sid = sessionIdFromAccessToken(opts.accessToken);
  if (!sid) return { verdict: 'unknown', found: false, sidReq: null, dbSessionId: null };
  const { data, error } = await sb
    .from('user_sessions')
    .select('session_id')
    .eq('user_id', opts.userId)
    .maybeSingle();
  if (error) return { verdict: 'unknown', found: false, sidReq: sid, dbSessionId: null };
  if (!data) return { verdict: 'ok', found: false, sidReq: sid, dbSessionId: null };
  const dbSid = (data as { session_id: string }).session_id;
  return { verdict: dbSid === sid ? 'ok' : 'superseded', found: true, sidReq: sid, dbSessionId: dbSid };
}
