import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pengecekan tipe saat build DIAKTIFKAN: seluruh proyek kini lolos `tsc`.
  // Jika suatu saat perlu sementara dilewati, set ke `true`.
  typescript: { ignoreBuildErrors: false },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
