import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance";
import { AccountForm } from "./account-form";

export const metadata: Metadata = { title: "Plano de contas — Pactum" };

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await requireFinanceAccess(tenant);

  const accounts = await prisma.financeAccount.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const revenueAccounts = accounts.filter((account) => account.type === "REVENUE");
  const expenseAccounts = accounts.filter((account) => account.type === "EXPENSE");

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Plano de contas</h1>
      <p className="mt-1 text-neutral-500">Categorias usadas para classificar receitas e despesas.</p>

      <div className="mt-6 max-w-md">
        <AccountForm />
      </div>

      <div className="mt-8 grid max-w-2xl gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Receitas</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {revenueAccounts.map((account) => (
              <li key={account.id} className="px-4 py-2.5 text-sm text-neutral-800">
                {account.name}
              </li>
            ))}
            {revenueAccounts.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-neutral-400">Nenhuma categoria ainda.</li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Despesas</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {expenseAccounts.map((account) => (
              <li key={account.id} className="px-4 py-2.5 text-sm text-neutral-800">
                {account.name}
              </li>
            ))}
            {expenseAccounts.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-neutral-400">Nenhuma categoria ainda.</li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
