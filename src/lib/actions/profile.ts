"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type UpdateProfileState = {
  error?: string;
  success?: boolean;
};

const MAX_IMAGE_DATA_URL_LENGTH = 400_000; // ~300KB of image data, base64-encoded

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autenticado." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();

  if (name.length < 2) {
    return { error: "Informe seu nome." };
  }
  if (image && !image.startsWith("data:image/")) {
    return { error: "Foto inválida." };
  }
  if (image.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return { error: "Foto muito grande. Tente uma imagem menor." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phone || null,
      title: title || null,
      ...(image ? { image } : {}),
    },
  });

  revalidatePath(`/t/${session.user.organizationSlug}/dashboard`, "layout");
  return { success: true };
}
