"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

/**
 * Keamanan sesi: bila pengguna meninggalkan situs atau tidak ada aktivitas
 * selama maksimal 5 menit, sesi diakhiri dan pengguna harus login ulang.
 *
 * Cara kerja:
 *  - Waktu aktivitas terakhir disimpan di localStorage (dibagi antar-tab).
 *  - Setiap interaksi (gerak mouse, klik, ketik, scroll, sentuh) memperbarui-nya.
 *  - Dicek berkala + saat tab kembali terlihat. Bila now − last > 5 menit → keluar.
 *  - Saat halaman dibuka kembali (mis. browser ditutup lalu dibuka lagi), cek
 *    awal akan mengeluarkan pengguna bila sudah lewat 5 menit sejak aktivitas
 *    terakhir.
 */
const IDLE_MS = 10 * 60 * 1000; // 10 menit
const KEY = "sippt:last_active";

export function IdleLogout() {
  const router = useRouter();
  const loggingOut = React.useRef(false);

  React.useEffect(() => {
    const now = () => Date.now();
    const read = (): number => {
      try {
        const v = localStorage.getItem(KEY);
        return v ? parseInt(v, 10) : NaN;
      } catch {
        return NaN;
      }
    };
    const mark = () => {
      try {
        localStorage.setItem(KEY, String(now()));
      } catch {
        /* abaikan */
      }
    };

    async function logout() {
      if (loggingOut.current) return;
      loggingOut.current = true;
      try {
        await createClient().auth.signOut();
      } catch {
        /* abaikan */
      }
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* abaikan */
      }
      router.replace("/login?timeout=1");
      router.refresh();
    }

    function check() {
      const last = read();
      if (!Number.isFinite(last)) {
        mark();
        return;
      }
      if (now() - last > IDLE_MS) logout();
    }

    // Cek awal: bila sudah lewat 5 menit sejak aktivitas terakhir → langsung keluar.
    const last = read();
    if (Number.isFinite(last) && now() - last > IDLE_MS) {
      logout();
      return;
    }
    mark();

    // Catat aktivitas (throttle agar tidak menulis localStorage terus-menerus).
    let lastWrite = 0;
    const onActivity = () => {
      const t = now();
      if (t - lastWrite > 10_000) {
        lastWrite = t;
        mark();
      }
    };
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    const iv = window.setInterval(check, 20_000); // cek tiap 20 detik

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(iv);
    };
  }, [router]);

  return null;
}
