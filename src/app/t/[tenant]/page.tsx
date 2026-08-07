import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function TenantRootPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await auth();

  if (session?.user?.organizationSlug === tenant) {
    redirect(`/dashboard`);
  }

  redirect(`/login`);
}
