import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { NewTeam, teamMembers, teams } from '@/lib/db/schema';

export async function findTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function findTeamById(teamId: number) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function insertTeam(newTeam: NewTeam) {
  const [createdTeam] = await db.insert(teams).values(newTeam).returning();
  return createdTeam ?? null;
}

export async function findTeamForUser(userId: number) {
  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team ?? null;
}
