"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tenantUrl } from "@/lib/tenant";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

export type CreateInvitationState = {
  error?: string;
  inviteUrl?: string;
};

export async function createInvitation(
  _prevState: CreateInvitationState,
  formData: FormData,
): Promise<CreateInvitationState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autenticado." };
  }
  if (!ADMIN_ROLES.has(session.user.role)) {
    return { error: "Você não tem permissão para convidar membros." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const alreadyMember = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId: existingUser.id, organizationId: session.user.organizationId },
      },
    });
    if (alreadyMember) {
      return { error: "Esse e-mail já faz parte do workspace." };
    }
  }

  const existingInvite = await prisma.invitation.findFirst({
    where: { organizationId: session.user.organizationId, email, status: "PENDING" },
  });
  if (existingInvite) {
    return { inviteUrl: tenantUrl(session.user.organizationSlug, `/join/${existingInvite.token}`) };
  }

  const token = randomBytes(24).toString("hex");
  await prisma.invitation.create({
    data: {
      email,
      organizationId: session.user.organizationId,
      invitedById: session.user.id,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  revalidatePath(`/t/${session.user.organizationSlug}/dashboard/directory`);

  return { inviteUrl: tenantUrl(session.user.organizationSlug, `/join/${token}`) };
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.has(session.user.role)) return;

  await prisma.invitation.updateMany({
    where: { id: invitationId, organizationId: session.user.organizationId, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  revalidatePath(`/t/${session.user.organizationSlug}/dashboard/directory`);
}

export type AcceptInvitationState = {
  error?: string;
  success?: boolean;
};

export async function acceptInvitation(
  token: string,
  name: string,
  password: string,
): Promise<AcceptInvitationState> {
  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return { error: "Convite inválido ou expirado." };
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return { error: "Informe seu nome." };
  }
  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existingUser) {
    return { error: "Já existe uma conta com esse e-mail. Faça login normalmente." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: trimmedName, email: invitation.email, passwordHash },
    });

    await tx.membership.create({
      data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
    });

    const publicChannels = await tx.channel.findMany({
      where: { organizationId: invitation.organizationId, type: "CHANNEL", isPrivate: false },
      select: { id: true },
    });
    if (publicChannels.length > 0) {
      await tx.channelMember.createMany({
        data: publicChannels.map((channel) => ({ userId: user.id, channelId: channel.id })),
        skipDuplicates: true,
      });
    }

    await tx.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
  });

  return { success: true };
}
