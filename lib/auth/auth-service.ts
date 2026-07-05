import { cookies } from 'next/headers';
import { ActivityType, NewUser, Team, User } from '@/lib/db/schema';
import {
  comparePasswords,
  hashPassword,
  setSession,
  verifyToken
} from '@/lib/auth/session';
import { logActivity } from '@/lib/activity/activity-service';
import { findRecentActivityLogsForUser } from '@/lib/db/repositories/activity-repository';
import {
  findActiveUserById,
  findUserByEmail,
  insertUser,
  softDeleteUser,
  updateUser
} from '@/lib/db/repositories/user-repository';
import {
  findMembershipByUserId,
  insertTeamMember,
  deleteMembershipForUserInTeam
} from '@/lib/db/repositories/team-member-repository';
import { findTeamById, insertTeam } from '@/lib/db/repositories/team-repository';
import {
  findPendingInvitationById,
  markInvitationAccepted
} from '@/lib/db/repositories/invitation-repository';

export async function getCurrentUser(): Promise<User | null> {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  return findActiveUserById(sessionData.user.id);
}

export async function getActivityLogsForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return findRecentActivityLogsForUser(user.id);
}

type AuthResult<T> = T | { error: string };

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult<{ user: User; team: Team | null }>> {
  const user = await findUserByEmail(email);
  if (!user) {
    return { error: 'Invalid email or password. Please try again.' };
  }

  const isPasswordValid = await comparePasswords(password, user.passwordHash);
  if (!isPasswordValid) {
    return { error: 'Invalid email or password. Please try again.' };
  }

  const membership = await findMembershipByUserId(user.id);
  const team = membership ? await findTeamById(membership.teamId) : null;

  await Promise.all([
    setSession(user),
    logActivity(team?.id, user.id, ActivityType.SIGN_IN)
  ]);

  return { user, team };
}

export async function registerUser({
  email,
  password,
  inviteId
}: {
  email: string;
  password: string;
  inviteId?: string;
}): Promise<AuthResult<{ user: User; team: Team }>> {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return { error: 'Failed to create user. Please try again.' };
  }

  const passwordHash = await hashPassword(password);
  const newUser: NewUser = {
    email,
    passwordHash,
    role: 'owner' // Default role, will be overridden if there's an invitation
  };

  const createdUser = await insertUser(newUser);
  if (!createdUser) {
    return { error: 'Failed to create user. Please try again.' };
  }

  let teamId: number;
  let userRole: string;
  let team: Team | null;

  if (inviteId) {
    const invitation = await findPendingInvitationById(
      parseInt(inviteId),
      email
    );

    if (!invitation) {
      return { error: 'Invalid or expired invitation.' };
    }

    teamId = invitation.teamId;
    userRole = invitation.role;

    await markInvitationAccepted(invitation.id);
    await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

    team = await findTeamById(teamId);
  } else {
    team = await insertTeam({ name: `${email}'s Team` });
    if (!team) {
      return { error: 'Failed to create team. Please try again.' };
    }

    teamId = team.id;
    userRole = 'owner';

    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  await Promise.all([
    insertTeamMember({ userId: createdUser.id, teamId, role: userRole }),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
    setSession(createdUser)
  ]);

  return { user: createdUser, team: team! };
}

export async function signOutCurrentUser(user: User) {
  const membership = await findMembershipByUserId(user.id);
  await logActivity(membership?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

export async function changePassword(
  user: User,
  { currentPassword, newPassword }: { currentPassword: string; newPassword: string }
): Promise<AuthResult<{ success: string }>> {
  const isPasswordValid = await comparePasswords(
    currentPassword,
    user.passwordHash
  );
  if (!isPasswordValid) {
    return { error: 'Current password is incorrect.' };
  }

  if (currentPassword === newPassword) {
    return {
      error: 'New password must be different from the current password.'
    };
  }

  const newPasswordHash = await hashPassword(newPassword);
  const membership = await findMembershipByUserId(user.id);

  await Promise.all([
    updateUser(user.id, { passwordHash: newPasswordHash }),
    logActivity(membership?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
  ]);

  return { success: 'Password updated successfully.' };
}

export async function deactivateAccount(
  user: User,
  password: string
): Promise<AuthResult<{ success: true }>> {
  const isPasswordValid = await comparePasswords(password, user.passwordHash);
  if (!isPasswordValid) {
    return { error: 'Incorrect password. Account deletion failed.' };
  }

  const membership = await findMembershipByUserId(user.id);

  await logActivity(membership?.teamId, user.id, ActivityType.DELETE_ACCOUNT);

  await softDeleteUser(user.id, `${user.email}-${user.id}-deleted`);

  if (membership?.teamId) {
    await deleteMembershipForUserInTeam(user.id, membership.teamId);
  }

  (await cookies()).delete('session');
  return { success: true };
}

export async function changeAccountInfo(
  user: User,
  { name, email }: { name: string; email: string }
): Promise<{ success: string }> {
  const membership = await findMembershipByUserId(user.id);

  await Promise.all([
    updateUser(user.id, { name, email }),
    logActivity(membership?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
  ]);

  return { success: 'Account updated successfully.' };
}
