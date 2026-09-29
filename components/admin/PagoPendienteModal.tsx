'use client'

const TELEFONO_ADMIN = '314 603 4091'
const TELEFONO_WHATSAPP = '573146034091'

// Modal bloqueante que recuerda el pago pendiente del servicio
export function PagoPendienteModal() {
  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-surface-variant flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-error-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-error text-[22px]">warning</span>
          </div>
          <h3 className="font-display font-bold text-lg text-on-surface">Pago Pendiente</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Por favor realizar el pago adecuado para seguir disfrutando los servicios, comunicarse con el admin{' '}
            <span className="font-semibold text-on-surface">{TELEFONO_ADMIN}</span>
          </p>
        </div>
        <div className="px-6 pb-6">
          <a
            href={`https://wa.me/${TELEFONO_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold px-4 py-3 rounded-lg text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
