import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { NewInvitation, invitations } from '@/lib/db/schema';

export async function findPendingInvitationById(
  invitationId: number,
  email: string
) {
  const result = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.email, email),
        eq(invitations.status, 'pending')
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function findPendingInvitationByEmailInTeam(
  email: string,
  teamId: number
) {
  const result = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.teamId, teamId),
        eq(invitations.status, 'pending')
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function insertInvitation(newInvitation: NewInvitation) {
  await db.insert(invitations).values(newInvitation);
}

export async function markInvitationAccepted(invitationId: number) {
  await db
    .update(invitations)
    .set({ status: 'accepted' })
    .where(eq(invitations.id, invitationId));
}
