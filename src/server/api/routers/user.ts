import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { type AuthSessionPayload } from '~/server/auth/cookie'
import { users } from '~/server/db/schema'

export const userRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
  }),

  me: publicProcedure.query(({ ctx }): AuthSessionPayload | null => {
    return ctx.user
  }),
})
