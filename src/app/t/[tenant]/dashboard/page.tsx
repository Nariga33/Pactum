import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";

export default async function DashboardIndexPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await requireTenantSession(tenant);

  const firstMembership = await prisma.channelMember.findFirst({
    where: { userId: session.user.id, channel: { organizationId: session.user.organizationId, type: "CHANNEL" } },
    orderBy: { channel: { createdAt: "asc" } },
    select: { channelId: true },
  });

  if (firstMembership) {
    redirect(`/dashboard/c/${firstMembership.channelId}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-8 py-10 text-neutral-500">
      Nenhum canal disponível ainda.
    </main>
  );
}
