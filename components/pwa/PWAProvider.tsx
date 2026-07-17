"use client";

import { useEffect } from "react";

// Registrar el service worker al montar la app para habilitar funcionalidades PWA
export default function PWAProvider() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.log("[pwa] Error al registrar SW:", err));
    }
  }, []);

  return null;
}