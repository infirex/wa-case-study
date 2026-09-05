import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { submissionMetrics, submissions } from '../db/schema'

export function getStartOfDay(date = new Date()): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function runIngestion(targetDate = new Date()) {
  const capturedAt = getStartOfDay(targetDate)
  console.log(
    `🚀 Starting daily metrics ingestion for date: ${capturedAt.toISOString()}`,
  )

  // Fetch all approved submissions only
  const approvedSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, 'approved'))

  console.log(
    `Found ${approvedSubmissions.length} approved submissions to process.`,
  )

  let successCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const sub of approvedSubmissions) {
    try {
      // Find latest metric for this submission
      const [latestMetric] = await db
        .select()
        .from(submissionMetrics)
        .where(eq(submissionMetrics.submissionId, sub.id))
        .orderBy(desc(submissionMetrics.capturedAt))
        .limit(1)

      const prevViews = latestMetric ? latestMetric.views : 0
      const prevLikes = latestMetric ? latestMetric.likes : 0
      const prevComments = latestMetric ? latestMetric.comments : 0

      // Fake daily sync logic (views only go up)
      const addedViews = Math.floor(Math.random() * 500) + 100
      const addedLikes = Math.floor(Math.random() * 50) + 5
      const addedComments = Math.floor(Math.random() * 10) + 1

      const newViews = prevViews + addedViews
      const newLikes = prevLikes + addedLikes
      const newComments = prevComments + addedComments

      const result = await db
        .insert(submissionMetrics)
        .values({
          submissionId: sub.id,
          capturedAt,
          views: newViews,
          likes: newLikes,
          comments: newComments,
        })
        .onConflictDoNothing({
          target: [
            submissionMetrics.submissionId,
            submissionMetrics.capturedAt,
          ],
        })
        .returning()

      if (result.length > 0) {
        console.log(
          `  [Submission ${sub.id}] Views updated: ${prevViews} -> ${newViews} (+${addedViews})`,
        )
        successCount++
      } else {
        console.log(
          `  [Submission ${sub.id}] Already ingested today. Current views: ${prevViews}`,
        )
        skippedCount++
      }
    } catch (err) {
      console.error(`❌ Ingestion failed for submission ID ${sub.id}:`, err)
      errorCount++
    }
  }

  console.log(
    `✅ Daily metrics ingestion complete!\n   - Inserted: ${successCount}\n   - Skipped (Already existed): ${skippedCount}\n   - Errors: ${errorCount}`,
  )

  return {
    successCount,
    skippedCount,
    errorCount,
    total: approvedSubmissions.length,
  }
}

runIngestion()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Critical failure in ingestion script:', err)
    process.exit(1)
  })
