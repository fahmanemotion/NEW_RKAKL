'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2, Mail, Lock, Eye, EyeOff, ArrowRight,
  ShieldCheck, BarChart3, FileSpreadsheet, Waves, Sailboat, Compass, Anchor,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { registerActiveSession } from '@/lib/session';
import { Button, Input } from '@/components/ui';
import { ThemeToggle } from '@/components/theme';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
});
type FormValues = z.infer<typeof schema>;

const FEATURES = [
  { icon: BarChart3, t: 'Penyusunan RKA-KL hierarkis', d: 'Struktur Program → KRO → Detail ala SAKTI.' },
  { icon: FileSpreadsheet, t: 'RAB & Kertas Kerja', d: 'Hasilkan dokumen siap unduh secara otomatis.' },
  { icon: ShieldCheck, t: 'Kolaborasi berbasis peran', d: 'Kerja bersama yang aman antar operator & reviewer.' },
];

// Satu periode gelombang berulang mulus pada x=1440 (dua periode digambar).
const WAVE_PATH =
  'M0,40 C240,10 480,10 720,40 C960,70 1200,70 1440,40 C1680,10 1920,10 2160,40 C2400,70 2640,70 2880,40 L2880,150 L0,150 Z';

// Animasi laut (murni CSS/SVG). Hormati prefers-reduced-motion.
const STYLES = `
@keyframes sirWave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes sirBob { 0%,100% { transform: translateY(0) rotate(-2.5deg); } 50% { transform: translateY(-10px) rotate(2.5deg); } }
@keyframes sirDrift { 0% { transform: translateX(-10px); } 100% { transform: translateX(70px); } }
@keyframes sirCloud { from { transform: translateX(-18rem); } to { transform: translateX(115vw); } }
@keyframes sirTwinkle { 0%,100% { opacity: .12; transform: scale(.8); } 50% { opacity: .9; transform: scale(1); } }
@keyframes sirSpin { to { transform: rotate(360deg); } }
@keyframes sirRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes sirFade { from { opacity: 0; } to { opacity: 1; } }
.sir-ocean { position:absolute; left:0; right:0; bottom:0; height:44%; overflow:hidden; }
.sir-wave { position:absolute; bottom:0; left:0; width:200%; height:100%; will-change:transform; }
.sir-wave path { fill:currentColor; }
.sir-w1 { color:rgba(125,211,252,.16); animation:sirWave 19s linear infinite; }
.sir-w2 { color:rgba(56,189,248,.24); height:86%; animation:sirWave 13s linear infinite; }
.sir-w3 { color:rgba(3,105,161,.55); height:70%; animation:sirWave 8.5s linear infinite; }
.sir-ship-drift { position:absolute; left:16%; bottom:31%; animation:sirDrift 9s ease-in-out infinite alternate; }
.sir-ship-bob { animation:sirBob 4.6s ease-in-out infinite; }
.sir-ship { width:3.5rem; height:3.5rem; color:#fff; filter:drop-shadow(0 6px 8px rgba(0,0,0,.35)); }
.sir-cloud { position:absolute; border-radius:9999px; background:rgba(255,255,255,.14); filter:blur(10px); animation:sirCloud linear infinite; }
.sir-star { position:absolute; width:3px; height:3px; border-radius:9999px; background:#fff; animation:sirTwinkle ease-in-out infinite; }
.sir-compass { position:absolute; color:rgba(255,255,255,.10); animation:sirSpin 64s linear infinite; }
.sir-rise { animation:sirRise .7s cubic-bezier(.16,1,.3,1) both; }
.sir-fade { animation:sirFade 1s ease both; }
.sir-formwave { position:absolute; left:0; right:0; bottom:0; height:70px; overflow:hidden; pointer-events:none; opacity:.5; }
.sir-formwave svg { position:absolute; bottom:0; left:0; width:200%; height:100%; color:hsl(var(--primary)); opacity:.22; animation:sirWave 15s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .sir-scene *, .sir-formwave svg, .sir-rise { animation-duration:.001ms !important; animation-iteration-count:1 !important; }
}
`;

const STARS = [
  { top: '10%', left: '14%', d: '0s', dur: '3.2s' },
  { top: '18%', left: '32%', d: '.8s', dur: '2.6s' },
  { top: '8%', left: '52%', d: '1.4s', dur: '3.6s' },
  { top: '22%', left: '68%', d: '.4s', dur: '2.9s' },
  { top: '14%', left: '84%', d: '1.1s', dur: '3.3s' },
  { top: '30%', left: '22%', d: '1.9s', dur: '2.4s' },
  { top: '28%', left: '46%', d: '.2s', dur: '3.8s' },
  { top: '34%', left: '76%', d: '1.6s', dur: '2.7s' },
];

export default function LoginPage() {
  const [err, setErr] = React.useState<string | null>(null);
  const [timedOut, setTimedOut] = React.useState(false);
  const [superseded, setSuperseded] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('timeout') === '1') setTimedOut(true);
    if (params.get('reason') === 'superseded') {
      setSuperseded(true);
      // Bersihkan sesi basi perangkat ini agar login berikutnya bersih.
      createClient().auth.signOut().catch(() => { /* abaikan */ });
    }
  }, []);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error) { setErr(error.message); return; }
    // Daftarkan sesi ini sebagai SATU-SATUNYA sesi aktif (menendang sesi device
    // lama). Kegagalan pendaftaran tidak boleh memblokir login.
    try {
      await registerActiveSession(supabase, {
        userId: data.user!.id,
        accessToken: data.session?.access_token ?? null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
    } catch { /* abaikan */ }
    try { localStorage.setItem('sippt:last_active', String(Date.now())); } catch { /* abaikan */ }
    // Navigasi KERAS (full reload), bukan router.replace + router.refresh.
    // Ini menjamin permintaan /dashboard berikutnya membawa cookie sesi yang
    // SUDAH tertulis, sehingga requireUser() di server tidak salah mengira belum
    // login dan tidak melakukan redirect('/login') tepat setelah masuk (akar
    // logout "saat pindah modul cepat setelah login").
    window.location.assign('/dashboard');
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Panel hero (desktop) — scene laut beranimasi ─────────────────── */}
      <div
        className="sir-scene relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          backgroundImage:
            'linear-gradient(160deg, hsl(220 65% 12%) 0%, hsl(214 78% 22%) 42%, hsl(199 88% 34%) 100%)',
        }}
      >
        {/* dekorasi statis: cahaya, grid, kompas berputar */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-sky-300/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '46px 46px',
            }}
          />
          <div className="absolute right-[-7rem] top-[26%] size-[30rem] rounded-full border border-white/10" />
          <div className="absolute right-[-4rem] top-[32%] size-[22rem] rounded-full border border-white/[0.07]" />
          <Compass className="sir-compass right-[-1rem] top-[34%] size-72" strokeWidth={0.6} />

          {/* bintang berkelip */}
          {STARS.map((s, i) => (
            <span
              key={i}
              className="sir-star"
              style={{ top: s.top, left: s.left, animationDelay: s.d, animationDuration: s.dur }}
            />
          ))}

          {/* awan hanyut */}
          <div className="sir-cloud" style={{ top: '13%', height: '30px', width: '150px', animationDuration: '46s', animationDelay: '-6s' }} />
          <div className="sir-cloud" style={{ top: '24%', height: '22px', width: '110px', animationDuration: '62s', animationDelay: '-28s' }} />

          {/* laut: gelombang berlapis + kapal */}
          <div className="sir-ocean">
            <svg className="sir-wave sir-w1" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
            <svg className="sir-wave sir-w2" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
            <div className="sir-ship-drift">
              <div className="sir-ship-bob"><Sailboat className="sir-ship" strokeWidth={1.6} /></div>
            </div>
            <svg className="sir-wave sir-w3" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
          </div>
        </div>

        {/* logo */}
        <div className="sir-fade relative z-10 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Anchor className="size-6" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide">SIRANGGA</div>
            <div className="text-[11px] text-white/70">Politeknik Ilmu Pelayaran Makassar</div>
          </div>
        </div>

        {/* judul + sorot fitur (kartu kaca) */}
        <div className="relative z-10 max-w-md">
          <span className="sir-fade inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80 ring-1 ring-white/15">
            <Waves className="size-3.5" /> Perencanaan &amp; Penganggaran
          </span>
          <h2 className="mt-5 text-[2.1rem] font-bold leading-[1.15] [text-shadow:0_2px_12px_rgba(0,0,0,.25)]">
            Nahkodai seluruh siklus anggaran satker
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            Susun usulan anggaran hierarkis ala SAKTI, pantau realisasi, dan hasilkan RAB &amp; Kertas Kerja dalam satu alur kerja yang rapi.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, t, d }, i) => (
              <li
                key={t}
                className="sir-rise flex items-start gap-3 rounded-xl bg-white/[0.07] p-3 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/10"
                style={{ animationDelay: `${0.15 + i * 0.12}s` }}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{t}</div>
                  <div className="text-[12px] leading-snug text-white/65">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* footer */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/60 [text-shadow:0_1px_6px_rgba(0,0,0,.4)]">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
          Sistem Informasi Perencanaan dan Penganggaran Terintegrasi
        </div>
      </div>

      {/* ── Panel form ─────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center overflow-hidden bg-muted/40 px-6 py-10">
        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <div className="sir-rise w-full max-w-md">
          {/* Kartu form */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.02] sm:p-8 dark:shadow-black/40">
            {/* header brand (mobile) */}
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-sidebar-accent to-primary text-white shadow-md shadow-primary/20">
                <Anchor className="size-6" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">SIRANGGA</div>
                <p className="text-xs text-muted-foreground">Politeknik Ilmu Pelayaran Makassar</p>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">Selamat datang kembali</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Masuk ke akun Anda untuk melanjutkan.
            </p>

            {timedOut && (
              <p className="mt-5 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                Sesi berakhir karena tidak ada aktivitas selama 5 menit. Silakan masuk kembali untuk keamanan.
              </p>
            )}

            {superseded && (
              <p className="mt-5 rounded-lg border border-sky-400/50 bg-sky-50 px-3 py-2.5 text-xs text-sky-800 dark:bg-sky-950/20 dark:text-sky-300">
                Sesi Anda diakhiri karena akun ini masuk di perangkat atau peramban lain. Satu akun hanya dapat aktif pada satu sesi. Silakan masuk kembali untuk melanjutkan di perangkat ini.
              </p>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" autoComplete="email" placeholder="operator@satker.go.id" className="h-11 pl-9" {...register('email')} />
                </div>
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Kata Sandi</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pl-9 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {err && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-xs text-destructive">{err}</p>
              )}

              <Button type="submit" className="group h-11 w-full text-[15px]" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Masuk
                {!isSubmitting && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
              </Button>
            </form>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Koneksi aman &amp; terenkripsi
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Politeknik Ilmu Pelayaran Makassar
          </p>
        </div>

        {/* gelombang tipis di dasar panel form (terlihat juga di mobile) */}
        <div className="sir-formwave">
          <svg viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
        </div>
      </div>
    </div>
  );
}
