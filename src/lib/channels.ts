import { prisma } from "@/lib/prisma";

// Finds the 1:1 DIRECT channel between two members of an organization,
// creating it (with both as members) if it doesn't exist yet.
//
// Uses an atomic upsert keyed on (organizationId, directKey) instead of
// a find-then-create: two people opening a DM for the first time at
// close to the same moment used to be able to each create their own
// channel (a classic TOCTOU race), silently splitting the conversation
// in two. The directKey unique constraint makes the DB itself the
// single source of truth for "does this pair already have a channel".
export async function getOrCreateDirectChannel(
  organizationId: string,
  userAId: string,
  userBId: string,
): Promise<string> {
  const [a, b] = [userAId, userBId].sort();
  const directKey = `${a}:${b}`;

  const channel = await prisma.channel.upsert({
    where: { organizationId_directKey: { organizationId, directKey } },
    update: {},
    create: {
      organizationId,
      type: "DIRECT",
      directKey,
      members: { create: [{ userId: a }, { userId: b }] },
    },
    select: { id: true },
  });

  return channel.id;
}
