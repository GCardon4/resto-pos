'use client'

import { createContext, useContext } from 'react'

export interface Empresa {
  name: string | null
  nit: string | null
  address: string | null
  phone: string | null
}

const CompanyContext = createContext<Empresa | null>(null)

// Proveer la información de la empresa a todos los módulos (caja y admin)
export function CompanyProvider({ empresa, children }: { empresa: Empresa | null; children: React.ReactNode }) {
  return <CompanyContext.Provider value={empresa}>{children}</CompanyContext.Provider>
}

// Obtener la información de la empresa desde cualquier componente cliente
export function useCompany(): Empresa | null {
  return useContext(CompanyContext)
}
