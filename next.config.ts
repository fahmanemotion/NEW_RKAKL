import type { NextConfig } from "next";

// ── Header keamanan ──────────────────────────────────────────────────────────
// Menutup temuan pemindaian: Content-Security-Policy, X-Frame-Options,
// X-Content-Type-Options, Referrer-Policy, Permissions-Policy, dan HSTS.
//
// Catatan CSP: Next.js (App Router) menyuntikkan skrip/inline-style untuk
// hidrasi, jadi 'unsafe-inline' pada script/style WAJIB agar aplikasi tetap
// jalan tanpa nonce. `connect-src` mengizinkan Supabase (REST + Realtime WSS).
// Bila kelak dipindah ke domain sendiri atau memanggil origin lain dari sisi
// klien, tambahkan origin itu ke `connect-src`/`img-src` seperlunya.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // Cegah situs disematkan dalam <iframe> (anti clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Cegah MIME-sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Jangan bocorkan URL lengkap ke situs lain.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Matikan fitur browser sensitif yang tak dipakai aplikasi.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Paksa HTTPS (efektif setelah pakai domain sendiri; di *.vercel.app sudah
  // ditangani Vercel). Tanpa `preload` agar aman untuk subdomain.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    staleTimes: { dynamic: 30, static: 180 },
    dynamicOnHover: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
