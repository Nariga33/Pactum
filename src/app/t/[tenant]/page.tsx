import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { tenantPath } from "@/lib/tenant";

export default async function TenantRootPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await auth();

  if (session?.user?.organizationSlug === tenant) {
    redirect(tenantPath(tenant, "/dashboard"));
  }

  redirect(tenantPath(tenant, "/login"));
}
