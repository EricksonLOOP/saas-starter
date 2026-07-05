import { getCurrentUser } from '@/lib/auth/auth-service';

export async function GET() {
  const user = await getCurrentUser();
  return Response.json(user);
}
