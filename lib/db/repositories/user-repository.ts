import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { NewUser, users } from '@/lib/db/schema';

export async function findUserById(userId: number) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function findActiveUserById(userId: number) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function insertUser(newUser: NewUser) {
  const [createdUser] = await db.insert(users).values(newUser).returning();
  return createdUser ?? null;
}

export async function updateUser(
  userId: number,
  data: Partial<Pick<NewUser, 'name' | 'email' | 'passwordHash'>>
) {
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function softDeleteUser(userId: number, anonymizedEmail: string) {
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      email: anonymizedEmail
    })
    .where(eq(users.id, userId));
}
