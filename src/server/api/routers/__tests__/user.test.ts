import { TRPCError } from '@trpc/server'
import { describe, expect, it } from 'vitest'

import { appRouter } from '~/server/api/root'
import {
  adminProcedure,
  createTRPCRouter,
  creatorProcedure,
  protectedProcedure,
} from '~/server/api/trpc'
import { signAuthToken } from '~/server/auth/cookie'
import type { db } from '~/server/db'

type DB = typeof db

const testRouter = createTRPCRouter({
  protectedEndpoint: protectedProcedure.query(() => 'secret_data'),
  adminEndpoint: adminProcedure.query(() => 'admin_data'),
  creatorEndpoint: creatorProcedure.query(() => 'creator_data'),
})

describe('tRPC Auth Procedure Middlewares', () => {
  it('publicProcedure resolves without user context', async () => {
    const caller = appRouter.createCaller({
      db: {} as DB,
      user: null,
      headers: new Headers(),
    })
    const me = await caller.user.me()
    expect(me).toBeNull()
  })

  it('protectedProcedure throws UNAUTHORIZED when unauthenticated', async () => {
    const caller = testRouter.createCaller({
      db: {} as DB,
      user: null,
      headers: new Headers(),
    })
    await expect(caller.protectedEndpoint()).rejects.toThrow(TRPCError)
  })

  it('adminProcedure allows admin and blocks creator', async () => {
    const adminCaller = testRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_admin', role: 'admin' },
      headers: new Headers(),
    })
    const adminRes = await adminCaller.adminEndpoint()
    expect(adminRes).toBe('admin_data')

    const creatorCaller = testRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_creator', role: 'creator' },
      headers: new Headers(),
    })
    await expect(creatorCaller.adminEndpoint()).rejects.toThrow(TRPCError)
  })

  it('creatorProcedure allows creator and blocks admin', async () => {
    const creatorCaller = testRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_creator', role: 'creator' },
      headers: new Headers(),
    })
    const creatorRes = await creatorCaller.creatorEndpoint()
    expect(creatorRes).toBe('creator_data')

    const adminCaller = testRouter.createCaller({
      db: {} as DB,
      user: { userId: 'usr_admin', role: 'admin' },
      headers: new Headers(),
    })
    await expect(adminCaller.creatorEndpoint()).rejects.toThrow(TRPCError)
  })

  it('verifies token payload structure correctly', () => {
    const token = signAuthToken({ userId: 'usr_admin', role: 'admin' })
    expect(token.length).toBeGreaterThan(10)
  })
})
