'use server';

import { User } from '@/lib/db/schema';
import { redirect } from 'next/navigation';
import {
  authenticateUser,
  changeAccountInfo,
  changePassword,
  deactivateAccount,
  getCurrentUser,
  registerUser,
  signOutCurrentUser
} from '@/lib/auth/auth-service';
import { inviteMember, removeMember } from '@/lib/teams/team-service';
import { createCheckoutSession } from '@/lib/payments/stripe';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import {
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
  deleteAccountSchema,
  updateAccountSchema
} from '@/lib/schemas/auth-schemas';
import {
  removeTeamMemberSchema,
  inviteTeamMemberSchema
} from '@/lib/schemas/team-schemas';

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const result = await authenticateUser(data.email, data.password);
  if ('error' in result) {
    return { ...result, email: data.email, password: data.password };
  }

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: result.team, priceId });
  }

  redirect('/dashboard');
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const result = await registerUser(data);
  if ('error' in result) {
    return { ...result, email: data.email, password: data.password };
  }

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: result.team, priceId });
  }

  redirect('/dashboard');
});

export async function signOut() {
  const user = (await getCurrentUser()) as User;
  await signOutCurrentUser(user);
}

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    if (data.confirmPassword !== data.newPassword) {
      return { error: 'New password and confirmation password do not match.' };
    }

    return changePassword(user, data);
  }
);

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const result = await deactivateAccount(user, data.password);
    if ('error' in result) {
      return result;
    }

    redirect('/sign-in');
  }
);

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const result = await changeAccountInfo(user, data);
    return { name: data.name, ...result };
  }
);

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => removeMember(user, data.memberId)
);

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => inviteMember(user, data)
);
