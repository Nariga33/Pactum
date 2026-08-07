"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidSlug, slugify, tenantUrl } from "@/lib/tenant";

export type SignupState = {
  error?: string;
  values?: { firmName: string; slug: string; name: string; email: string };
};

export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const firmName = String(formData.get("firmName") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const values = { firmName, slug: slugInput, name, email };

  if (!firmName || firmName.length < 2) {
    return { error: "Informe o nome do escritório.", values };
  }

  const slug = slugify(slugInput || firmName);
  if (!isValidSlug(slug)) {
    return {
      error: "Escolha um subdomínio válido (letras minúsculas, números e hífens).",
      values,
    };
  }

  if (!name || name.length < 2) {
    return { error: "Informe seu nome.", values };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido.", values };
  }

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres.", values };
  }

  const [existingOrg, existingUser] = await Promise.all([
    prisma.organization.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (existingOrg) {
    return { error: "Esse subdomínio já está em uso. Escolha outro.", values };
  }
  if (existingUser) {
    return { error: "Já existe uma conta com esse e-mail.", values };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: firmName, slug },
    });

    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });

    await tx.membership.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    });
  });

  redirect(tenantUrl(slug, "/login"));
}
