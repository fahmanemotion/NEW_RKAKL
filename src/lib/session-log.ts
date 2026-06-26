// SIPPT — Logging sesi terstruktur (JSON ke stdout). Aman di Edge & Node.
//
// Tujuan: melacak setiap keputusan izinkan/tolak sesi pada middleware agar
// penyebab logout dapat ditelusuri akurat. TIDAK menulis ke DB dan TIDAK
// pernah melempar error (logging tak boleh mengganggu request).
//
// Catatan privasi: session_id TIDAK ditulis mentah — hanya hash pendek 8-hex
// (FNV-1a, bukan kriptografis; cukup untuk korelasi antar-baris log).

export type SessionDecision = 'allow' | 'deny';

export interface SessionLogEvent {
  decision: SessionDecision;
  reason: string;                 // no_session | transient | superseded | ok | not_registered | unknown
  userId?: string | null;
  username?: string | null;
  sessionId?: string | null;      // session_id pada REQUEST (di-hash)
  activeSessionId?: string | null;// session_id AKTIF di DB / penindih (di-hash) ≈ "previous"
  route: string;
  module: string;
  method?: string | null;
  middleware?: string | null;     // middleware yang dijalankan
  ip?: string | null;
  userAgent?: string | null;
  sessionLimit?: 'on' | 'off';    // status Session Limit
  found?: boolean;                // sesi ditemukan di DB?
  destroyed?: boolean;            // apakah sesi dihapus (hot-path harus selalu false)
  regenerated?: boolean;          // apakah session_id diregenerasi (hot-path harus selalu false)
}

/** Hash pendek non-kriptografis (FNV-1a) untuk menyamarkan id pada log. */
function shortHash(v?: string | null): string | null {
  if (!v) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < v.length; i++) {
    h ^= v.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Ambil nama modul dari path: '/penganggaran/123' → 'penganggaran'. */
export function moduleFromPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg ?? 'root';
}

/** Tulis satu baris log JSON. Tidak pernah melempar. */
export function logSession(e: SessionLogEvent): void {
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      evt: 'session',
      decision: e.decision,
      reason: e.reason,
      module: e.module,
      route: e.route,
      method: e.method ?? null,
      middleware: e.middleware ?? 'middleware',
      userId: e.userId ?? null,
      username: e.username ?? null,
      sessionId: shortHash(e.sessionId),
      activeSessionId: shortHash(e.activeSessionId),
      ip: e.ip ?? null,
      userAgent: e.userAgent ?? null,
      sessionLimit: e.sessionLimit ?? 'on',
      found: e.found ?? false,
      destroyed: e.destroyed ?? false,
      regenerated: e.regenerated ?? false,
    }));
  } catch {
    /* logging tidak boleh pernah mengganggu request */
  }
}
