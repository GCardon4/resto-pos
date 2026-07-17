import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yosjokjkwodsvmfxaswb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Headers necesarios para PWA — el servidor standalone de Coolify los aplica directamente
  async headers() {
    return [
      {
        // Service Worker: sin caché para que actualizaciones lleguen inmediatamente
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Manifest: sin caché para reflejar cambios de config al instante
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

export default nextConfig;
