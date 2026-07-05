import { ActivityType } from '@/lib/db/schema';
import { insertActivityLog } from '@/lib/db/repositories/activity-repository';

export async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }

  await insertActivityLog({
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  });
}
