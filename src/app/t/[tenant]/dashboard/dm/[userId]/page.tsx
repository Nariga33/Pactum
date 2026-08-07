import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { getOrCreateDirectChannel } from "@/lib/channels";
import { getInitialMessages } from "@/lib/messages";
import { ChatPane } from "../../_components/chat-pane";

export default async function DirectMessagePage({
  params,
}: {
  params: Promise<{ tenant: string; userId: string }>;
}) {
  const { tenant, userId } = await params;
  const session = await requireTenantSession(tenant);

  if (userId === session.user.id) {
    notFound();
  }

  const otherMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: session.user.organizationId } },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!otherMembership) {
    notFound();
  }

  const channelId = await getOrCreateDirectChannel(
    session.user.organizationId,
    session.user.id,
    userId,
  );
  const initialMessages = await getInitialMessages(channelId);

  return (
    <ChatPane
      key={channelId}
      channelId={channelId}
      title={otherMembership.user.name}
      currentUserId={session.user.id}
      initialMessages={initialMessages}
      members={[otherMembership.user]}
    />
  );
}
