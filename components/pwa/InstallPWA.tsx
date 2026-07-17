"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Detectar si es un dispositivo iOS (iPhone, iPad, iPadOS en Mac con touch)
function detectarIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Detectar si la app ya está corriendo en modo instalado (standalone)
function detectarInstalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Record<string, unknown>).standalone === true)
  );
}

// Variante controla dónde y cómo se muestra el botón: "navbar" (solo desktop) o "footer" (solo mobile)
export default function InstallPWA({ variante = "navbar" }: { variante?: "navbar" | "footer" }) {
  const [eventoInstalacion, setEventoInstalacion] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [modalIOS, setModalIOS] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    if (detectarInstalada()) {
      setInstalada(true);
      return;
    }

    const esDispositivoIOS = detectarIOS();
    setEsIOS(esDispositivoIOS);

    if (esDispositivoIOS) {
      setVisible(true);
      return;
    }

    // Leer evento capturado antes de que React montara (script inline en layout)
    const eventoTemprano = (window as any).__pwaInstallEvent as BeforeInstallPromptEvent | null;
    if (eventoTemprano) {
      setEventoInstalacion(eventoTemprano);
      setVisible(true);
      return;
    }

    // Escuchar evento personalizado si llega después del montaje
    const alLlegar = () => {
      const ev = (window as any).__pwaInstallEvent as BeforeInstallPromptEvent | null;
      if (ev) { setEventoInstalacion(ev); setVisible(true); }
    };
    window.addEventListener("pwaInstallReady", alLlegar);

    // Fallback: escuchar beforeinstallprompt directamente
    const manejarEvento = (e: Event) => {
      e.preventDefault();
      setEventoInstalacion(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", manejarEvento);

    return () => {
      window.removeEventListener("beforeinstallprompt", manejarEvento);
      window.removeEventListener("pwaInstallReady", alLlegar);
    };
  }, []);

  if (instalada || !visible) return null;

  // Manejar clic en el botón de instalación
  const handleInstalar = async () => {
    if (esIOS) {
      setModalIOS(true);
      return;
    }
    if (!eventoInstalacion) return;

    await eventoInstalacion.prompt();
    const { outcome } = await eventoInstalacion.userChoice;

    if (outcome === "accepted") {
      setInstalada(true);
      setVisible(false);
    }
    setEventoInstalacion(null);
  };

  return (
    <>
      {/* Botón — estilos distintos según variante */}
      <button
        onClick={handleInstalar}
        type="button"
        className={
          variante === "footer"
            // Móvil: igual que los otros ítems del nav inferior
            ? "flex md:hidden flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
            // Desktop sidebar: botón pill con color primario
            : "hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-sans text-xs font-bold bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-sm"
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={variante === "footer" ? 22 : 13}
          height={variante === "footer" ? 22 : 13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {variante === "footer" ? "Instalar" : "Instalar App"}
      </button>

      {/* Modal de instrucciones para iOS */}
      {modalIOS && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setModalIOS(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div
              className="px-6 py-5 flex items-center gap-4"
              style={{
                background: "linear-gradient(135deg, #001623 0%, #112b3b 100%)",
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <p className="font-display font-bold text-white text-base" style={{ letterSpacing: "-0.01em" }}>
                  Instalar en iPhone / iPad
                </p>
                <p className="font-sans text-xs text-white/50 mt-0.5">
                  Sigue estos 3 pasos en Safari
                </p>
              </div>
            </div>

            {/* Pasos */}
            <div className="px-6 py-5 flex flex-col gap-4">
              {[
                {
                  paso: "1",
                  texto: (
                    <>
                      Toca el ícono{" "}
                      <strong className="font-semibold text-on-surface">Compartir</strong>{" "}
                      <span className="inline-block">(</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="inline align-middle mx-0.5"
                        style={{ color: "#007AFF" }}
                      >
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      <span className="inline-block">)</span> en la barra de Safari
                    </>
                  ),
                },
                {
                  paso: "2",
                  texto: (
                    <>
                      Selecciona{" "}
                      <strong className="font-semibold text-on-surface">
                        &ldquo;Añadir a pantalla de inicio&rdquo;
                      </strong>
                    </>
                  ),
                },
                {
                  paso: "3",
                  texto: (
                    <>
                      Confirma tocando{" "}
                      <strong className="font-semibold text-on-surface">
                        &ldquo;Añadir&rdquo;
                      </strong>{" "}
                      en la esquina superior derecha
                    </>
                  ),
                },
              ].map(({ paso, texto }) => (
                <div key={paso} className="flex items-start gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-sans text-xs font-bold text-white mt-0.5"
                    style={{ background: "linear-gradient(135deg, #001623 0%, #112b3b 100%)" }}
                  >
                    {paso}
                  </span>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
                    {texto}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setModalIOS(false)}
                className="w-full py-3 rounded-xl font-sans text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #001623 0%, #112b3b 100%)",
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}