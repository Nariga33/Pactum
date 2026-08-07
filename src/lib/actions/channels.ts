"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/tenant";
import { Prisma } from "@/generated/prisma/client";

export type CreateChannelState = {
  error?: string;
  channelId?: string;
};

export async function createChannel(
  _prevState: CreateChannelState,
  formData: FormData,
): Promise<CreateChannelState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autenticado." };
  }

  const rawName = String(formData.get("name") ?? "").trim();
  if (!rawName) {
    return { error: "Informe um nome para o canal." };
  }

  const name = slugify(rawName);
  if (!name) {
    return { error: "Nome inválido — use letras, números e espaços." };
  }

  const isPrivate = formData.get("isPrivate") === "on";

  try {
    const channel = await prisma.channel.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        isPrivate,
        members: { create: { userId: session.user.id } },
      },
      select: { id: true },
    });

    revalidatePath(`/t/${session.user.organizationSlug}/dashboard`, "layout");
    return { channelId: channel.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Já existe um canal com esse nome." };
    }
    throw error;
  }
}
