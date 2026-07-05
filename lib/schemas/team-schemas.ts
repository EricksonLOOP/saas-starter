import { z } from 'zod';

export const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});
