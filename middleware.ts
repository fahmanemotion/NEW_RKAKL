// SIPPT — middleware: refresh sesi Supabase pada tiap request & lindungi rute.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC = ["/login", "/auth"];

export async function middleware(req: NextRequest) {
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
  // (menulis cookie baru via setAll) bila perlu — ini pola SSR resmi Supabase
  // dan satu-satunya titik yang BISA menulis cookie refresh. Lebih andal dari
  // getClaims() (verifikasi lokal): menghindari logout acak akibat gagal ambil
  // JWKS atau balapan refresh-token antar-klien pada halaman dengan fetch paralel.
  const { data } = await supabase.auth.getUser();
  const isAuthed = !!data?.user;
  const isPublic = PUBLIC.some((p) => req.nextUrl.pathname.startsWith(p));

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
