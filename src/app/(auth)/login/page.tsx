'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, Loader2, Mail, Lock, Eye, EyeOff, ArrowRight,
  ShieldCheck, BarChart3, FileSpreadsheet, Waves,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { ThemeToggle } from '@/components/theme';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = React.useState<string | null>(null);
  const [timedOut, setTimedOut] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  React.useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('timeout') === '1') {
      setTimedOut(true);
    }
  }, []);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) { setErr(error.message); return; }
    try { localStorage.setItem('sippt:last_active', String(Date.now())); } catch { /* abaikan */ }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Panel hero (desktop) ───────────────────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          backgroundImage:
            'linear-gradient(145deg, hsl(218 60% 16%) 0%, hsl(213 78% 26%) 45%, hsl(199 88% 38%) 100%)',
        }}
      >
        {/* dekorasi: cahaya, grid, gelombang */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-300/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          {/* lingkaran konsentris ala kompas */}
          <div className="absolute right-[-6rem] top-1/3 size-[28rem] rounded-full border border-white/10" />
          <div className="absolute right-[-3rem] top-[38%] size-80 rounded-full border border-white/10" />
        </div>

        {/* logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Building2 className="size-6" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide">SIPPT</div>
            <div className="text-[11px] text-white/70">Politeknik Ilmu Pelayaran Makassar</div>
          </div>
        </div>

        {/* judul + sorot fitur */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-[2rem] font-bold leading-tight">
            Perencanaan &amp; Penganggaran Terintegrasi
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            Susun usulan anggaran hierarkis ala SAKTI, pantau realisasi, dan hasilkan RAB &amp; Kertas Kerja dalam satu sistem.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              { icon: BarChart3, t: 'Penyusunan RKA-KL hierarkis' },
              { icon: FileSpreadsheet, t: 'RAB & Kertas Kerja siap unduh' },
              { icon: ShieldCheck, t: 'Akses aman berbasis peran' },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm text-white/85">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* footer */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/60">
          <Waves className="size-4" />
          Sistem Informasi Perencanaan dan Penganggaran Terintegrasi
        </div>
      </div>

      {/* ── Panel form ─────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center bg-background px-6 py-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* header brand (mobile) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-sidebar-accent to-primary text-white shadow-md shadow-primary/20">
              <Building2 className="size-6" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">SIPPT</div>
              <p className="text-xs text-muted-foreground">Perencanaan &amp; Penganggaran</p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" autoComplete="email" placeholder="operator@satker.go.id" className="pl-9" {...register('email')} />
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
                  className="pl-9 pr-10"
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

            <Button type="submit" className="group w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Masuk
              {!isSubmitting && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Politeknik Ilmu Pelayaran Makassar
          </p>
        </div>
      </div>
    </div>
  );
}
