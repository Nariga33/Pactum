import { prisma } from "@/lib/prisma";
import type { PusherMessagePayload } from "@/lib/pusher-shared";

export async function getInitialMessages(channelId: string): Promise<PusherMessagePayload[]> {
  const messages = await prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return messages.map((message) => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    channelId,
    user: message.user,
  }));
}
