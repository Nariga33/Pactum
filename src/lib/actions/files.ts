"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Leaves room for base64 (~37% larger than binary) plus multipart
// overhead under the 10mb Server Action body limit (next.config.ts).
const MAX_FILE_BYTES = 7 * 1024 * 1024;

export type FileActionResult = { error?: string; success?: boolean };

export async function uploadFile(
  _prevState: FileActionResult,
  formData: FormData,
): Promise<FileActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "Não autenticado." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 7MB por enquanto)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const data = `data:${mimeType};base64,${buffer.toString("base64")}`;

  await prisma.fileAttachment.create({
    data: {
      organizationId: session.user.organizationId,
      uploadedById: session.user.id,
      name: file.name,
      mimeType,
      size: file.size,
      data,
    },
  });

  revalidatePath(`/t/${session.user.organizationSlug}/dashboard/files`);
  return { success: true };
}

export async function deleteFile(fileId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const file = await prisma.fileAttachment.findUnique({ where: { id: fileId } });
  if (!file || file.organizationId !== session.user.organizationId) return;

  const canDelete =
    file.uploadedById === session.user.id ||
    session.user.role === "OWNER" ||
    session.user.role === "ADMIN";
  if (!canDelete) return;

  await prisma.fileAttachment.delete({ where: { id: fileId } });
  revalidatePath(`/t/${session.user.organizationSlug}/dashboard/files`);
}
