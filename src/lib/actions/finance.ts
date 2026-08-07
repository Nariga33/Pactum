"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFinanceSession } from "@/lib/finance";
import type { FinanceAccountType } from "@/generated/prisma/enums";

function financePath(slug: string): string {
  return `/t/${slug}/finance`;
}

export type FinanceActionResult = { error?: string };

export async function createFinanceAccount(
  _prevState: FinanceActionResult,
  formData: FormData,
): Promise<FinanceActionResult> {
  const session = await requireFinanceSession();
  if (!session) return { error: "Sem acesso ao financeiro." };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!name) return { error: "Informe um nome." };
  if (type !== "REVENUE" && type !== "EXPENSE") return { error: "Tipo inválido." };

  const existing = await prisma.financeAccount.findUnique({
    where: { organizationId_name: { organizationId: session.user.organizationId, name } },
  });
  if (existing) return { error: "Já existe uma categoria com esse nome." };

  await prisma.financeAccount.create({
    data: { organizationId: session.user.organizationId, name, type: type as FinanceAccountType },
  });

  revalidatePath(financePath(session.user.organizationSlug), "layout");
  return {};
}

export async function createFinancialEntry(
  _prevState: FinanceActionResult,
  formData: FormData,
): Promise<FinanceActionResult> {
  const session = await requireFinanceSession();
  if (!session) return { error: "Sem acesso ao financeiro." };

  const accountId = String(formData.get("accountId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const dateRaw = String(formData.get("date") ?? "");
  const dueDateRaw = String(formData.get("dueDate") ?? "");

  if (!description) return { error: "Informe uma descrição." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Informe um valor válido." };

  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) return { error: "Informe uma data válida." };

  let dueDate: Date | null = null;
  if (dueDateRaw) {
    dueDate = new Date(dueDateRaw);
    if (Number.isNaN(dueDate.getTime())) return { error: "Vencimento inválido." };
  }

  const account = await prisma.financeAccount.findUnique({ where: { id: accountId } });
  if (!account || account.organizationId !== session.user.organizationId) {
    return { error: "Categoria inválida." };
  }

  await prisma.financialEntry.create({
    data: {
      organizationId: session.user.organizationId,
      accountId,
      description,
      amount,
      date,
      dueDate,
      createdById: session.user.id,
    },
  });

  revalidatePath(financePath(session.user.organizationSlug), "layout");
  return {};
}

export async function markEntryPaid(entryId: string): Promise<void> {
  const session = await requireFinanceSession();
  if (!session) return;

  await prisma.financialEntry.updateMany({
    where: { id: entryId, organizationId: session.user.organizationId },
    data: { paidAt: new Date() },
  });

  revalidatePath(financePath(session.user.organizationSlug), "layout");
}

export async function deleteFinancialEntry(entryId: string): Promise<void> {
  const session = await requireFinanceSession();
  if (!session) return;

  await prisma.financialEntry.deleteMany({
    where: { id: entryId, organizationId: session.user.organizationId },
  });

  revalidatePath(financePath(session.user.organizationSlug), "layout");
}
