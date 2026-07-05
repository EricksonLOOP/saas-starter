import { ActivityType, User } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { logActivity } from '@/lib/activity/activity-service';
import { findTeamForUser } from '@/lib/db/repositories/team-repository';
import {
  deleteTeamMember,
  findMemberByEmailInTeam,
  findMembershipByUserId
} from '@/lib/db/repositories/team-member-repository';
import {
  findPendingInvitationByEmailInTeam,
  insertInvitation
} from '@/lib/db/repositories/invitation-repository';

export async function getTeamForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return findTeamForUser(user.id);
}

type TeamActionResult<T> = T | { error: string };

export async function removeMember(
  user: User,
  memberId: number
): Promise<TeamActionResult<{ success: string }>> {
  const membership = await findMembershipByUserId(user.id);
  if (!membership) {
    return { error: 'User is not part of a team' };
  }

  await deleteTeamMember(memberId, membership.teamId);
  await logActivity(membership.teamId, user.id, ActivityType.REMOVE_TEAM_MEMBER);

  return { success: 'Team member removed successfully' };
}

export async function inviteMember(
  user: User,
  { email, role }: { email: string; role: string }
): Promise<TeamActionResult<{ success: string }>> {
  const membership = await findMembershipByUserId(user.id);
  if (!membership) {
    return { error: 'User is not part of a team' };
  }

  const existingMember = await findMemberByEmailInTeam(
    email,
    membership.teamId
  );
  if (existingMember) {
    return { error: 'User is already a member of this team' };
  }

  const existingInvitation = await findPendingInvitationByEmailInTeam(
    email,
    membership.teamId
  );
  if (existingInvitation) {
    return { error: 'An invitation has already been sent to this email' };
  }

  await insertInvitation({
    teamId: membership.teamId,
    email,
    role,
    invitedBy: user.id,
    status: 'pending'
  });

  await logActivity(membership.teamId, user.id, ActivityType.INVITE_TEAM_MEMBER);

  // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
  // await sendInvitationEmail(email, team.name, role)

  return { success: 'Invitation sent successfully' };
}
