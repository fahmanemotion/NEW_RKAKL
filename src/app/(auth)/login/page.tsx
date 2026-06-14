'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button, Card, Input } from '@/components/ui';
import { ThemeToggle } from '@/components/theme';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) { setErr(error.message); return; }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm p-7">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">SIPPT</h1>
            <p className="text-xs text-muted-foreground">Perencanaan & Penganggaran</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <Input type="email" autoComplete="email" placeholder="operator@satker.go.id" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kata Sandi</label>
          <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>
        {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />} Masuk
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Sistem Informasi Perencanaan dan Penganggaran Terintegrasi
      </p>
    </Card>
  );
}
