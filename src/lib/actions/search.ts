"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SearchResults = {
  channels: { id: string; name: string; isPrivate: boolean }[];
  people: { userId: string; name: string; email: string; image: string | null }[];
  messages: {
    id: string;
    channelId: string;
    dmUserId: string | null;
    channelLabel: string;
    snippet: string;
    senderName: string;
    createdAt: string;
  }[];
};

const EMPTY_RESULTS: SearchResults = { channels: [], people: [], messages: [] };

function snippetAround(content: string, query: string, radius = 60): string {
  const lower = content.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) return content.slice(0, radius * 2);

  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + query.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return `${prefix}${content.slice(start, end)}${suffix}`;
}

export async function searchWorkspace(rawQuery: string): Promise<SearchResults> {
  const session = await auth();
  if (!session?.user) return EMPTY_RESULTS;

  const query = rawQuery.trim();
  if (query.length < 2) return EMPTY_RESULTS;

  const { organizationId, id: userId } = session.user;

  const [channels, memberships, myChannelMemberships] = await Promise.all([
    prisma.channel.findMany({
      where: {
        organizationId,
        type: "CHANNEL",
        name: { contains: query, mode: "insensitive" },
        OR: [{ isPrivate: false }, { members: { some: { userId } } }],
      },
      select: { id: true, name: true, isPrivate: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.membership.findMany({
      where: {
        organizationId,
        userId: { not: userId },
        user: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      select: { user: { select: { id: true, name: true, email: true, image: true } } },
      take: 5,
      orderBy: { user: { name: "asc" } },
    }),
    prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true },
    }),
  ]);

  const myChannelIds = myChannelMemberships.map((m) => m.channelId);

  const rawMessages =
    myChannelIds.length === 0
      ? []
      : await prisma.message.findMany({
          where: {
            channelId: { in: myChannelIds },
            content: { contains: query, mode: "insensitive" },
          },
          include: {
            user: { select: { name: true } },
            channel: {
              select: {
                id: true,
                name: true,
                type: true,
                members: {
                  where: { userId: { not: userId } },
                  select: { user: { select: { id: true, name: true } } },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        });

  return {
    channels: channels.map((c) => ({ id: c.id, name: c.name ?? "", isPrivate: c.isPrivate })),
    people: memberships.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    })),
    messages: rawMessages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      dmUserId: m.channel.type === "DIRECT" ? (m.channel.members[0]?.user.id ?? null) : null,
      channelLabel:
        m.channel.type === "DIRECT"
          ? (m.channel.members[0]?.user.name ?? "Mensagem direta")
          : `# ${m.channel.name}`,
      snippet: snippetAround(m.content, query),
      senderName: m.user.name,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
