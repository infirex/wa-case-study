import { db } from './index'
import { users } from './schema'

async function seed() {
  console.log('🌱 Seeding database...')

  await db
    .insert(users)
    .values([
      {
        id: 'admin_1',
        email: 'admin@wayv.agency',
        role: 'admin',
      },
      {
        id: 'creator_1',
        email: 'creator1@wayv.agency',
        role: 'creator',
      },
      {
        id: 'creator_2',
        email: 'creator2@wayv.agency',
        role: 'creator',
      },
    ])
    .onConflictDoNothing()

  console.log('✅ Seeding complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
