// SIPPT — middleware: refresh sesi Supabase, lindungi rute, tegakkan single-
// session (READ-ONLY), dan CATAT setiap keputusan sesi untuk penelusuran logout.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkActiveSessionDetailed } from "@/lib/session";
import { logSession, moduleFromPath } from "@/lib/session-log";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC = ["/login", "/auth"];

// Throttle cek sesi-tunggal: penanda "cek terakhir lolos" beserta jendelanya.
// BUKAN kontrol akses data (itu RLS) — hanya membatasi frekuensi query
// user_sessions agar navigasi beruntun tidak menambah round-trip DB tiap langkah.
const SS_COOKIE = "ss_ck";
const SS_CHECK_TTL_MS = 15_000;

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const mod = moduleFromPath(path);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip") ?? null;
  const ua = req.headers.get("user-agent");
  const method = req.method;

  // Prefetch: teruskan tanpa menyentuh sesi (browser membuang Set-Cookie
  // prefetch → rotasi token pada prefetch = logout palsu). Tidak di-log karena
  // bukan navigasi nyata.
  const isPrefetch =
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    (req.headers.get("sec-purpose") ?? "").includes("prefetch");
  if (isPrefetch) {
    return NextResponse.next({ request: req });
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 1) AUTH dulu: getUser() memvalidasi + me-refresh token (satu-satunya tempat
  //    cookie refresh ditulis). Validasi session_id dilakukan SETELAH ini.
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  const isAuthed = !!user;
  const isPublic = PUBLIC.some((p) => path.startsWith(p));

  // Kegagalan verifikasi sementara (jaringan/Auth 5xx) JANGAN diperlakukan
  // sebagai logout.
  const transient =
    !!error &&
    (error.name === "AuthRetryableFetchError" ||
      (typeof error.status === "number" && error.status >= 500));

  if (!isAuthed) {
    if (isPublic) return res;
    if (transient) {
      logSession({ decision: "allow", reason: "transient", module: mod, route: path,
        method, ip, userAgent: ua, sessionLimit: "on", found: false });
      return res;
    }
    logSession({ decision: "deny", reason: "no_session", module: mod, route: path,
      method, ip, userAgent: ua, sessionLimit: "on", found: false });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2) Single-session (READ-ONLY, best-effort) — hanya rute terlindungi. Tidak
  //    pernah menulis/menghapus/meregenerasi sesi di sini.
  //    Query user_sessions di-THROTTLE: dijalankan paling sering tiap
  //    SS_CHECK_TTL_MS agar navigasi beruntun tidak menambah round-trip DB tiap
  //    langkah. Konsisten dg sifat fitur ini yang fail-OPEN (lihat session.ts);
  //    deteksi "tertendang" tertunda ≤TTL detik — akses DATA tetap dijaga RLS.
  if (!isPublic) {
    const lastOk = Number(req.cookies.get(SS_COOKIE)?.value);
    const now = Date.now();
    if (Number.isFinite(lastOk) && now - lastOk < SS_CHECK_TTL_MS) {
      // Masih dalam jendela → lewati query DB (throttled). Log ringan saja.
      logSession({ decision: "allow", reason: "throttled", userId: user!.id,
        username: user!.email, module: mod, route: path, method, ip,
        userAgent: ua, sessionLimit: "on", found: true });
      return res;
    }

    const { data: sess } = await supabase.auth.getSession();
    const chk = await checkActiveSessionDetailed(supabase, {
      userId: user!.id,
      accessToken: sess.session?.access_token ?? null,
    });

    if (chk.verdict === "superseded") {
      logSession({ decision: "deny", reason: "superseded", userId: user!.id,
        username: user!.email, sessionId: chk.sidReq, activeSessionId: chk.dbSessionId,
        module: mod, route: path, method, ip, userAgent: ua, sessionLimit: "on",
        found: chk.found, destroyed: false, regenerated: false });
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?reason=superseded";
      return NextResponse.redirect(url);
    }

    // Stempel waktu HANYA saat sesi terkonfirmasi terdaftar & tidak superseded
    // (found + ok). Sesi belum-terdaftar / verdikt "unknown" TIDAK di-throttle
    // agar tetap dicek tiap langkah sampai benar-benar terkonfirmasi.
    if (chk.found && chk.verdict === "ok") {
      res.cookies.set(SS_COOKIE, String(now), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60,
      });
    }

    logSession({ decision: "allow",
      reason: chk.verdict === "unknown" ? "unknown" : (chk.found ? "ok" : "not_registered"),
      userId: user!.id, username: user!.email, sessionId: chk.sidReq,
      activeSessionId: chk.dbSessionId, module: mod, route: path, method, ip,
      userAgent: ua, sessionLimit: "on", found: chk.found, destroyed: false, regenerated: false });
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
