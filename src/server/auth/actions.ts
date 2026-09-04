'use server'

import { cookies } from 'next/headers'

import { AUTH_COOKIE_NAME, signAuthToken } from '~/server/auth/cookie'

export async function switchUserAction(input: {
  userId: string
  role: 'admin' | 'creator'
  email?: string
}): Promise<void> {
  const token = signAuthToken(input)
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}
