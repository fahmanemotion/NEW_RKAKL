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

// Gelombang berulang mulus pada x=1440 (digambar dua periode).
const WAVE_PATH =
  'M0,40 C240,10 480,10 720,40 C960,70 1200,70 1440,40 C1680,10 1920,10 2160,40 C2400,70 2640,70 2880,40 L2880,150 L0,150 Z';
// Garis buih (kurva atas saja, tanpa isi).
const WAVE_LINE =
  'M0,40 C240,10 480,10 720,40 C960,70 1200,70 1440,40 C1680,10 1920,10 2160,40 C2400,70 2640,70 2880,40';

// Animasi laut (murni CSS/SVG). Hormati prefers-reduced-motion.
const STYLES = `
@keyframes sirWave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes sirBob { 0%,100% { transform: translateY(0) rotate(-2.5deg); } 50% { transform: translateY(-10px) rotate(2.5deg); } }
@keyframes sirDrift { 0% { transform: translateX(-10px); } 100% { transform: translateX(70px); } }
@keyframes sirCloud { from { transform: translateX(-18rem); } to { transform: translateX(115vw); } }
@keyframes sirTwinkle { 0%,100% { opacity: .12; transform: scale(.8); } 50% { opacity: .95; transform: scale(1); } }
@keyframes sirSpin { to { transform: rotate(360deg); } }
@keyframes sirRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes sirFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sirGull { 0% { transform: translate(-6rem,8px); } 45% { transform: translate(22vw,-9px); } 100% { transform: translate(56vw,3px); } }
@keyframes sirFlap { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(.5); } }
@keyframes sirBeam { to { transform: rotate(360deg); } }
@keyframes sirGlow { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
@keyframes sirMoon { 0%,100% { opacity: .8; } 50% { opacity: 1; } }
.sir-ocean { position:absolute; left:0; right:0; bottom:0; height:44%; overflow:hidden; }
.sir-wave { position:absolute; bottom:0; left:0; width:200%; height:100%; will-change:transform; }
.sir-wave path { fill:currentColor; }
.sir-w1 { color:rgba(103,232,249,.14); animation:sirWave 19s linear infinite; }
.sir-w2 { color:rgba(45,212,191,.22); height:86%; animation:sirWave 13s linear infinite; }
.sir-w3 { color:rgba(6,131,157,.55); height:70%; animation:sirWave 8.5s linear infinite; }
.sir-foam { position:absolute; bottom:0; left:0; width:200%; height:70%; animation:sirWave 8.5s linear infinite; }
.sir-foam path { fill:none; stroke:rgba(224,255,255,.4); stroke-width:2; }
.sir-ship-drift { position:absolute; left:15%; bottom:31%; animation:sirDrift 9s ease-in-out infinite alternate; }
.sir-ship-bob { animation:sirBob 4.6s ease-in-out infinite; }
.sir-ship { width:3.5rem; height:3.5rem; color:#fff; filter:drop-shadow(0 6px 8px rgba(0,0,0,.35)); }
.sir-cloud { position:absolute; border-radius:9999px; background:rgba(255,255,255,.14); filter:blur(10px); animation:sirCloud linear infinite; }
.sir-star { position:absolute; width:3px; height:3px; border-radius:9999px; background:#fff; animation:sirTwinkle ease-in-out infinite; }
.sir-compass { position:absolute; color:rgba(255,255,255,.09); animation:sirSpin 70s linear infinite; }
.sir-gull { position:absolute; left:0; animation:sirGull linear infinite; }
.sir-gull svg { display:block; animation:sirFlap .55s ease-in-out infinite; transform-origin:center; }
.sir-house { position:absolute; right:8%; bottom:34%; filter:drop-shadow(0 8px 12px rgba(0,0,0,.35)); }
.sir-house svg { overflow:visible; }
.sir-beam { transform-origin:32px 34px; animation:sirBeam 11s linear infinite; }
.sir-lamp { animation:sirGlow 2.2s ease-in-out infinite; transform-origin:center; }
.sir-moon { position:absolute; border-radius:9999px; background:radial-gradient(circle at 38% 38%, #f8fbff, #cfe6ff 55%, rgba(207,230,255,0) 72%); box-shadow:0 0 60px 20px rgba(186,224,255,.28); animation:sirMoon 6s ease-in-out infinite; }
.sir-horizon { position:absolute; left:0; right:0; bottom:40%; height:130px; background:radial-gradient(60% 100% at 62% 100%, rgba(45,212,191,.28), transparent 72%); filter:blur(10px); }
.sir-rise { animation:sirRise .7s cubic-bezier(.16,1,.3,1) both; }
.sir-fade { animation:sirFade 1s ease both; }
@keyframes sirFloat { 0%,100% { transform:translate(0,0); } 50% { transform:translate(0,-22px); } }
.sir-orb { position:absolute; border-radius:9999px; filter:blur(44px); animation:sirFloat ease-in-out infinite; will-change:transform; }
.sir-formwave { position:absolute; left:0; right:0; bottom:0; height:92px; overflow:hidden; pointer-events:none; }
.sir-formwave svg { position:absolute; bottom:0; left:0; width:200%; height:100%; }
.sir-formwave svg path { fill:currentColor; }
.sir-fwback { color:rgba(45,212,191,.20); animation:sirWave 17s linear infinite; }
.sir-fwfront { color:rgba(56,189,248,.30); height:80%; animation:sirWave 11s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .sir-scene *, .sir-formwave svg, .sir-orb, .sir-rise { animation-duration:.001ms !important; animation-iteration-count:1 !important; }
}
`;

const STARS = [
  { top: '9%', left: '14%', d: '0s', dur: '3.2s' },
  { top: '17%', left: '30%', d: '.8s', dur: '2.6s' },
  { top: '7%', left: '50%', d: '1.4s', dur: '3.6s' },
  { top: '21%', left: '66%', d: '.4s', dur: '2.9s' },
  { top: '13%', left: '82%', d: '1.1s', dur: '3.3s' },
  { top: '29%', left: '20%', d: '1.9s', dur: '2.4s' },
  { top: '27%', left: '44%', d: '.2s', dur: '3.8s' },
  { top: '33%', left: '74%', d: '1.6s', dur: '2.7s' },
];

// Camar (siluet "m") — dua sayap yang mengepak.
function Gull({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.45} viewBox="0 0 24 11" fill="none"
      stroke="#f4fbff" strokeWidth="1.6" strokeLinecap="round">
      <path d="M1,7 Q6,1 12,7 Q18,1 23,7" opacity="0.9" />
    </svg>
  );
}

// Mercusuar bergaris merah-putih dengan sorot cahaya berputar & lampu berkedip.
function Lighthouse() {
  return (
    <svg width="66" height="150" viewBox="0 0 64 150">
      <defs>
        <clipPath id="sirTower"><path d="M22,138 L26,44 L38,44 L42,138 Z" /></clipPath>
        <linearGradient id="sirBeamGrad">
          <stop offset="0" stopColor="#fef3c7" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* sorot cahaya (di belakang menara) */}
      <g className="sir-beam">
        <polygon points="32,34 126,8 126,60" fill="url(#sirBeamGrad)" />
      </g>
      {/* karang */}
      <ellipse cx="32" cy="146" rx="27" ry="7" fill="rgba(2,26,44,.75)" />
      {/* menara + garis merah (di-clip mengikuti bentuk menara) */}
      <g clipPath="url(#sirTower)">
        <rect x="0" y="40" width="64" height="110" fill="#f4f7fb" />
        <rect x="0" y="54" width="64" height="13" fill="#e5484d" />
        <rect x="0" y="82" width="64" height="13" fill="#e5484d" />
        <rect x="0" y="110" width="64" height="13" fill="#e5484d" />
      </g>
      {/* galeri, rumah lampu, atap */}
      <rect x="20" y="39" width="24" height="5" rx="1.5" fill="#2b3a52" />
      <rect x="25" y="26" width="14" height="15" fill="#1f2a3d" />
      <rect className="sir-lamp" x="27" y="28" width="10" height="11" fill="#fde68a" />
      <circle className="sir-lamp" cx="32" cy="33" r="9" fill="#fde68a" opacity="0.55" />
      <path d="M22,26 L42,26 L32,13 Z" fill="#e5484d" />
      <circle cx="32" cy="12" r="2" fill="#2b3a52" />
    </svg>
  );
}

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
            'linear-gradient(165deg, hsl(224 74% 9%) 0%, hsl(216 78% 17%) 28%, hsl(202 82% 27%) 60%, hsl(188 78% 37%) 100%)',
        }}
      >
        {/* dekorasi & scene (di belakang konten) */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-teal-300/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '46px 46px',
            }}
          />
          {/* bulan + kompas berputar */}
          <div className="sir-moon" style={{ top: '8%', right: '18%', width: '68px', height: '68px' }} />
          <div className="absolute right-[-7rem] top-[30%] size-[30rem] rounded-full border border-white/10" />
          <div className="absolute right-[-4rem] top-[36%] size-[22rem] rounded-full border border-white/[0.06]" />
          <Compass className="sir-compass right-[-1rem] top-[38%] size-72" strokeWidth={0.6} />

          {/* bintang berkelip */}
          {STARS.map((s, i) => (
            <span key={i} className="sir-star"
              style={{ top: s.top, left: s.left, animationDelay: s.d, animationDuration: s.dur }} />
          ))}

          {/* camar terbang */}
          <div className="sir-gull" style={{ top: '15%', animationDuration: '17s', animationDelay: '0s' }}><Gull size={24} /></div>
          <div className="sir-gull" style={{ top: '22%', animationDuration: '23s', animationDelay: '-9s' }}><Gull size={17} /></div>
          <div className="sir-gull" style={{ top: '11%', animationDuration: '20s', animationDelay: '-15s' }}><Gull size={20} /></div>

          {/* awan hanyut */}
          <div className="sir-cloud" style={{ top: '13%', height: '30px', width: '150px', animationDuration: '48s', animationDelay: '-6s' }} />
          <div className="sir-cloud" style={{ top: '25%', height: '22px', width: '110px', animationDuration: '64s', animationDelay: '-30s' }} />

          {/* kilau ufuk */}
          <div className="sir-horizon" />

          {/* laut: gelombang berlapis + buih + kapal */}
          <div className="sir-ocean">
            <svg className="sir-wave sir-w1" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
            <svg className="sir-wave sir-w2" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
            <div className="sir-ship-drift">
              <div className="sir-ship-bob"><Sailboat className="sir-ship" strokeWidth={1.6} /></div>
            </div>
            <svg className="sir-wave sir-w3" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
            <svg className="sir-foam" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_LINE} /></svg>
          </div>

          {/* mercusuar (di depan laut, di karang) */}
          <div className="sir-house"><Lighthouse /></div>
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
          <h2 className="mt-5 text-[2.1rem] font-bold leading-[1.15] [text-shadow:0_2px_14px_rgba(0,0,0,.3)]">
            Nahkodai seluruh siklus anggaran satker
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,.25)]">
            Susun usulan anggaran hierarkis ala SAKTI, pantau realisasi, dan hasilkan RAB &amp; Kertas Kerja dalam satu alur kerja yang rapi.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, t, d }, i) => (
              <li
                key={t}
                className="sir-rise flex items-start gap-3 rounded-xl bg-white/[0.08] p-3 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/[0.13]"
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
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/60 [text-shadow:0_1px_6px_rgba(0,0,0,.45)]">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
          Sistem Informasi Perencanaan dan Penganggaran Terintegrasi
        </div>
      </div>

      {/* ── Panel form ─────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center overflow-hidden px-6 py-10 bg-gradient-to-br from-sky-50 via-white to-cyan-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-[hsl(200_45%_9%)]">
        {/* orb warna mengambang + pola titik */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="sir-orb" style={{ top: '-3rem', left: '-3rem', width: '18rem', height: '18rem', background: 'rgba(56,189,248,.38)', animationDuration: '11s' }} />
          <div className="sir-orb" style={{ bottom: '2rem', right: '-4rem', width: '21rem', height: '21rem', background: 'rgba(45,212,191,.34)', animationDuration: '14s', animationDelay: '-4s' }} />
          <div className="sir-orb" style={{ top: '24%', right: '16%', width: '12rem', height: '12rem', background: 'rgba(129,140,248,.26)', animationDuration: '16s', animationDelay: '-8s' }} />
          <div
            className="absolute inset-0 opacity-60 dark:opacity-25"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(100,116,139,.16) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />
        </div>

        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <div className="sir-rise relative z-10 w-full max-w-md">
          {/* Kartu form — glassy dengan bingkai gradasi + kilau */}
          <div className="rounded-[1.15rem] bg-gradient-to-br from-primary/50 via-cyan-400/40 to-teal-400/50 p-px shadow-[0_30px_80px_-24px_rgba(8,145,178,.45)] dark:shadow-[0_30px_80px_-20px_rgba(6,182,212,.3)]">
          <div className="rounded-2xl border border-white/60 bg-card/90 p-7 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-card/80">
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

              <Button type="submit" className="group h-11 w-full bg-gradient-to-r from-sky-600 to-cyan-500 text-[15px] shadow-lg shadow-cyan-500/25 transition hover:brightness-110" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Masuk
                {!isSubmitting && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
              </Button>
            </form>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" /> Koneksi aman &amp; terenkripsi
            </p>
          </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Politeknik Ilmu Pelayaran Makassar
          </p>
        </div>

        {/* gelombang dua-warna di dasar panel form (terlihat juga di mobile) */}
        <div className="sir-formwave">
          <svg className="sir-fwback" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
          <svg className="sir-fwfront" viewBox="0 0 2880 150" preserveAspectRatio="none"><path d={WAVE_PATH} /></svg>
        </div>
      </div>
    </div>
  );
}
