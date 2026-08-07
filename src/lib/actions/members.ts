"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/generated/prisma/enums";

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

export type MemberActionResult = { error?: string };

export async function updateMemberRole(
  membershipId: string,
  role: MembershipRole,
): Promise<MemberActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { error: "Só o OWNER pode alterar papéis." };
  }

  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.organizationId !== session.user.organizationId) {
    return { error: "Membro não encontrado." };
  }

  if (membership.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { organizationId: session.user.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { error: "O workspace precisa de pelo menos um OWNER." };
    }
  }

  await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath(`/t/${session.user.organizationSlug}/dashboard/directory`);
  return {};
}

export async function removeMember(membershipId: string): Promise<MemberActionResult> {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.has(session.user.role)) {
    return { error: "Sem permissão." };
  }

  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.organizationId !== session.user.organizationId) {
    return { error: "Membro não encontrado." };
  }
  if (membership.userId === session.user.id) {
    return { error: "Você não pode remover a si mesmo." };
  }
  if (membership.role !== "MEMBER" && session.user.role !== "OWNER") {
    return { error: "Só o OWNER pode remover administradores." };
  }
  if (membership.role === "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { organizationId: session.user.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { error: "O workspace precisa de pelo menos um OWNER." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.channelMember.deleteMany({
      where: { userId: membership.userId, channel: { organizationId: session.user.organizationId } },
    });
    await tx.membership.delete({ where: { id: membershipId } });
  });

  revalidatePath(`/t/${session.user.organizationSlug}/dashboard/directory`);
  return {};
}
