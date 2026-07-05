import { getTeamForCurrentUser } from '@/lib/teams/team-service';

export async function GET() {
  const team = await getTeamForCurrentUser();
  return Response.json(team);
}
