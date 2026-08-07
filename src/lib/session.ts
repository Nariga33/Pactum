import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Ensures the current session belongs to the tenant being requested,
// redirecting to that tenant's login page otherwise. Used by every page
// under /t/[tenant]/dashboard.
export async function requireTenantSession(tenant: string) {
  const session = await auth();
  if (!session?.user || session.user.organizationSlug !== tenant) {
    redirect("/login");
  }
  return session;
}
