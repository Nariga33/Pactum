import { prisma } from "@/lib/prisma";

// Finds the 1:1 DIRECT channel between two members of an organization,
// creating it (with both as members) if it doesn't exist yet.
export async function getOrCreateDirectChannel(
  organizationId: string,
  userAId: string,
  userBId: string,
): Promise<string> {
  const existing = await prisma.channel.findFirst({
    where: {
      organizationId,
      type: "DIRECT",
      members: { some: { userId: userAId } },
      AND: { members: { some: { userId: userBId } } },
    },
    select: { id: true, _count: { select: { members: true } } },
  });

  if (existing && existing._count.members === 2) {
    return existing.id;
  }

  const created = await prisma.channel.create({
    data: {
      organizationId,
      type: "DIRECT",
      members: { create: [{ userId: userAId }, { userId: userBId }] },
    },
    select: { id: true },
  });

  return created.id;
}
