import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { NewActivityLog, activityLogs, users } from '@/lib/db/schema';

export async function insertActivityLog(newActivity: NewActivityLog) {
  await db.insert(activityLogs).values(newActivity);
}

export async function findRecentActivityLogsForUser(userId: number, limit = 10) {
  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
}
