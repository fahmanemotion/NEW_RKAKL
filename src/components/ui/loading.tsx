"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { useLinkStatus } from "next/link";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinner sederhana berbasis ikon Loader2 (berputar). */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-primary", className)} />;
}

/**
 * Layar "sedang memuat" untuk file loading.tsx (segment loading UI). Mengisi
 * area konten sehingga pengguna langsung tahu halaman sedang dimuat.
 */
export function LoadingScreen({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="relative grid size-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <Spinner className="size-7" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

/**
 * Ikon menu yang otomatis berganti menjadi spinner saat tautan induknya sedang
 * memuat halaman (memakai useLinkStatus milik next/link). Harus dirender DI
 * DALAM komponen <Link>. Memberi umpan balik langsung pada item yang diklik
 * sehingga pengguna tidak menekannya berulang.
 */
export function LinkPendingIcon({
  Icon,
  className,
}: {
  Icon: LucideIcon;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className={cn(className, "animate-spin")} aria-label="Memuat" />
  ) : (
    <Icon className={className} />
  );
}

/**
 * Progress bar tipis di paling atas layar yang berjalan saat berpindah halaman.
 * Dimulai ketika pengguna mengklik tautan internal, dan selesai saat rute
 * (pathname) berubah. Memberi sinyal global bahwa aplikasi sedang memuat data.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const activeRef = React.useRef(false);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const start = React.useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    if (doneRef.current) clearTimeout(doneRef.current);
    setVisible(true);
    setWidth(8);
    stopTick();
    // Naik cepat lalu melambat mendekati 90% (menunggu navigasi selesai).
    tickRef.current = setInterval(() => {
      setWidth((w) => (w < 90 ? w + Math.max(0.6, (90 - w) * 0.08) : w));
    }, 180);
  }, []);

  const finish = React.useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    stopTick();
    setWidth(100);
    doneRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 280);
  }, []);

  // Mulai bar saat klik tautan internal (anchor same-origin ke URL berbeda).
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      const target = a.getAttribute("target");
      if (!href || href.startsWith("#") || (target && target !== "_self")) return;
      if (a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // Selesaikan bar ketika rute benar-benar berpindah.
  React.useEffect(() => {
    finish();
    // hanya saat pathname berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Bersihkan timer saat unmount.
  React.useEffect(() => {
    return () => {
      stopTick();
      if (doneRef.current) clearTimeout(doneRef.current);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
