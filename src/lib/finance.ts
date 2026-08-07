import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { requireTenantSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function checkFinanceAccess(
  userId: string,
  organizationId: string,
  role: string,
): Promise<boolean> {
  if (role === "OWNER") return true;

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { financeAccess: true },
  });
  return membership?.financeAccess ?? false;
}

// Guards a Financeiro page: redirects to the login/dashboard if the
// session doesn't belong to this tenant or lacks finance access.
export async function requireFinanceAccess(tenant: string): Promise<Session> {
  const session = await requireTenantSession(tenant);
  const allowed = await checkFinanceAccess(session.user.id, session.user.organizationId, session.user.role);
  if (!allowed) redirect("/dashboard");
  return session;
}

// Guards a finance server action: returns the session only if it has
// finance access, null otherwise (caller returns a friendly error).
export async function requireFinanceSession(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user) return null;

  const allowed = await checkFinanceAccess(session.user.id, session.user.organizationId, session.user.role);
  return allowed ? session : null;
}
