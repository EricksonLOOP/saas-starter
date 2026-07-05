import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { NewTeamMember, teamMembers, users } from '@/lib/db/schema';

export async function findMembershipByUserId(userId: number) {
  const result = await db
    .select({
      teamId: teamMembers.teamId
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function findMemberByEmailInTeam(email: string, teamId: number) {
  const result = await db
    .select()
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(and(eq(users.email, email), eq(teamMembers.teamId, teamId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function insertTeamMember(newTeamMember: NewTeamMember) {
  await db.insert(teamMembers).values(newTeamMember);
}

export async function deleteTeamMember(memberId: number, teamId: number) {
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)));
}

export async function deleteMembershipForUserInTeam(
  userId: number,
  teamId: number
) {
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)));
}
