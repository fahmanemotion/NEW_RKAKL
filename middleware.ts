// SIPPT — middleware: refresh sesi Supabase pada tiap request, lindungi rute,
// dan tegakkan SATU-SESI-AKTIF (single-session) di lapisan aplikasi.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkActiveSession } from "@/lib/session";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC = ["/login", "/auth"];

export async function middleware(req: NextRequest) {
  // PENTING: jangan menyentuh sesi pada request PREFETCH (Next.js mem-prefetch
  // semua <Link> di sidebar). Prefetch yang memanggil getUser() bisa MEROTASI
  // refresh-token (RT0→RT1) dan menulis cookie baru pada respons prefetch —
  // namun browser TIDAK menerapkan Set-Cookie dari prefetch, sehingga browser
  // tetap memegang RT0 yang kini invalid. Saat user benar-benar mengklik link,
  // request asli mengirim RT0 → "Already Used" → refresh gagal → logout.
  // Untuk prefetch cukup teruskan tanpa refresh; auth tetap dipaksakan pada
  // navigasi asli (middleware + requireUser di halaman).
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

  // getUser() memvalidasi sesi ke server Auth Supabase DAN me-refresh token
  // (menulis cookie baru via setAll) bila perlu — pola SSR resmi Supabase dan
  // satu-satunya titik yang BISA menulis cookie refresh.
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  const isAuthed = !!user;
  const isPublic = PUBLIC.some((p) => req.nextUrl.pathname.startsWith(p));

  // Kegagalan VERIFIKASI yang bersifat sementara (jaringan/Auth server) JANGAN
  // diperlakukan sebagai logout. Hanya "benar-benar tidak ada sesi" yang ditendang.
  // requireUser() di halaman menjadi gerbang kedua bila ini lolos keliru.
  const transient =
    !!error &&
    (error.name === "AuthRetryableFetchError" ||
      (typeof error.status === "number" && error.status >= 500));

  if (!isAuthed) {
    if (isPublic || transient) return res; // jangan redirect saat publik / error sesaat
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── Single-session (READ-ONLY) — hanya pada rute terlindungi ──────────────
  if (!isPublic) {
    // access-token (lokal, tanpa network) → klaim session_id stabil.
    const { data: sess } = await supabase.auth.getSession();
    const verdict = await checkActiveSession(supabase, {
      userId: user!.id,
      accessToken: sess.session?.access_token ?? null,
    });
    if (verdict === "superseded") {
      // Sesi ini sudah digantikan login di perangkat lain → akhiri sesi ini.
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?reason=superseded";
      return NextResponse.redirect(url);
    }
    // 'ok' atau 'unknown' (fail-open) → lanjut.
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
