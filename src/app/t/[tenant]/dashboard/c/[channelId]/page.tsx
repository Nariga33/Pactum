import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { getInitialMessages } from "@/lib/messages";
import { ChatPane } from "../../_components/chat-pane";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ tenant: string; channelId: string }>;
}) {
  const { tenant, channelId } = await params;
  const session = await requireTenantSession(tenant);

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    include: { channel: true },
  });

  if (!membership || membership.channel.organizationId !== session.user.organizationId) {
    notFound();
  }

  const [initialMessages, channelMembers] = await Promise.all([
    getInitialMessages(channelId),
    prisma.channelMember.findMany({
      where: { channelId },
      select: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <ChatPane
      key={channelId}
      channelId={channelId}
      title={`# ${membership.channel.name}`}
      currentUserId={session.user.id}
      initialMessages={initialMessages}
      members={channelMembers.map((m) => m.user)}
    />
  );
}
