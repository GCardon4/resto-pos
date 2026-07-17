import type { MetadataRoute } from "next";

// Manifiesto de la PWA — cumple criterios de instalación de Chrome/Edge/Android
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Queen POS — Queen Broaster",
    short_name: "QueenPOS",
    description: "Sistema de Punto de Venta - Queen Broaster",
    start_url: "/caja",
    id: "/caja",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#001623",
    theme_color: "#001623",
    categories: ["business", "productivity"],
    lang: "es",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}