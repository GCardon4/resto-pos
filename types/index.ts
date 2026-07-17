export const ROLES = {
  ADMIN: 1,
  CAJA: 2,
  COCINA: 3,
} as const

export type RoleId = typeof ROLES[keyof typeof ROLES]

export interface UserProfile {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  roleId: number
}

export interface Role {
  id: number
  name: string
  createdAt: string
}

export interface AuthState {
  error: string | null
}
