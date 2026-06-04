import { getCurrentUser } from "@/modules/core/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight current-user lookup for client components (the account menu). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null }, { status: 401 });
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      aiAssistantTester: user.aiAssistantTester,
    },
  });
}
