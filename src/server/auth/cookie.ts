import { createHmac, timingSafeEqual } from 'crypto'

export interface AuthSessionPayload {
  userId: string
  role: 'admin' | 'creator'
  email?: string
}

export const AUTH_COOKIE_NAME = 'auth_session'
const DEFAULT_SECRET = 'dev-secret-key-32-chars-long-12345'
const AUTH_SECRET = process.env.AUTH_SECRET ?? DEFAULT_SECRET

export function signAuthToken(payload: AuthSessionPayload): string {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', AUTH_SECRET)
    .update(dataStr)
    .digest('base64url')
  return `${dataStr}.${signature}`
}

export function verifyAuthToken(token: string): AuthSessionPayload | null {
  if (!token?.includes('.')) return null
  const [dataStr, signature] = token.split('.')
  if (!dataStr || !signature) return null

  const expectedSignature = createHmac('sha256', AUTH_SECRET)
    .update(dataStr)
    .digest('base64url')

  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expectedSignature)

  if (sigBuf.length !== expBuf.length) return null
  if (!timingSafeEqual(sigBuf, expBuf)) return null

  try {
    const jsonStr = Buffer.from(dataStr, 'base64url').toString('utf-8')
    const payload = JSON.parse(jsonStr) as AuthSessionPayload
    if (!payload.userId || !payload.role) return null
    return payload
  } catch {
    return null
  }
}
