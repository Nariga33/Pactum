"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { publishCallSignal } from "@/lib/pusher-server";
import type { CallSignal } from "@/lib/pusher-shared";

export async function sendCallSignal(channelId: string, signal: CallSignal): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autenticado." };
  }

  if (signal.from.id !== session.user.id) {
    return { error: "Assinante inválido." };
  }

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    include: { channel: true },
  });

  if (!membership || membership.channel.organizationId !== session.user.organizationId) {
    return { error: "Você não faz parte desta conversa." };
  }
  // Calling UI only ever renders for DIRECT (1:1) channels — reject
  // signals aimed at a group channel even if sent directly to this
  // action, since nobody there would have a CallPanel listening.
  if (membership.channel.type !== "DIRECT") {
    return { error: "Chamada só é suportada em mensagens diretas." };
  }

  await publishCallSignal(channelId, signal);
  return {};
}
