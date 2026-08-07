"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { publishNewMessage, publishReadReceipt } from "@/lib/pusher-server";
import type { PusherMessagePayload } from "@/lib/pusher-shared";

export type SendMessageResult = { error: string } | { message: PusherMessagePayload };

export async function sendMessage(channelId: string, content: string): Promise<SendMessageResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autenticado." };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Mensagem vazia." };
  }
  if (trimmed.length > 4000) {
    return { error: "Mensagem muito longa." };
  }

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    include: { channel: true },
  });

  if (!membership || membership.channel.organizationId !== session.user.organizationId) {
    return { error: "Você não faz parte desta conversa." };
  }

  const created = await prisma.message.create({
    data: { channelId, userId: session.user.id, content: trimmed },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  const payload: PusherMessagePayload = {
    id: created.id,
    content: created.content,
    createdAt: created.createdAt.toISOString(),
    channelId,
    user: created.user,
  };

  await publishNewMessage(payload);

  return { message: payload };
}

export async function markChannelRead(channelId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    include: { channel: true },
  });
  if (!membership || membership.channel.organizationId !== session.user.organizationId) return;

  const readAt = new Date();
  await prisma.channelMember.update({
    where: { id: membership.id },
    data: { lastReadAt: readAt },
  });

  await publishReadReceipt({ channelId, userId: session.user.id, readAt: readAt.toISOString() });
}
