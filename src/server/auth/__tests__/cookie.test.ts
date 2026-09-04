import { describe, expect, it } from 'vitest'
import { signAuthToken, verifyAuthToken } from '../cookie'

describe('Auth Cookie Utilities', () => {
  it('signs and verifies valid payload correctly', () => {
    const payload = {
      userId: 'usr_admin',
      role: 'admin' as const,
      email: 'admin@example.com',
    }
    const token = signAuthToken(payload)
    expect(typeof token).toBe('string')

    const verified = verifyAuthToken(token)
    expect(verified).not.toBeNull()
    expect(verified?.userId).toBe('usr_admin')
    expect(verified?.role).toBe('admin')
    expect(verified?.email).toBe('admin@example.com')
  })

  it('rejects tampered token signature', () => {
    const payload = { userId: 'usr_creator', role: 'creator' as const }
    const token = signAuthToken(payload)
    const [dataStr] = token.split('.')
    const tamperedToken = `${dataStr}.invalid_signature`

    const verified = verifyAuthToken(tamperedToken)
    expect(verified).toBeNull()
  })

  it('rejects invalid or malformed tokens', () => {
    expect(verifyAuthToken('')).toBeNull()
    expect(verifyAuthToken('no-dot-token')).toBeNull()
    expect(verifyAuthToken('abc.def.ghi')).toBeNull()
  })
})
