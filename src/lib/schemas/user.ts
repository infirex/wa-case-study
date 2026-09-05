import { z } from 'zod'

export const USER_ROLES = ['admin', 'creator'] as const
export const userRoleEnum = z.enum(USER_ROLES)
export type UserRole = z.infer<typeof userRoleEnum>
