import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance";
import { markEntryPaid, deleteFinancialEntry } from "@/lib/actions/finance";
import { Card } from "@/components/ui/card";
import { EntryForm } from "./entry-form";

export const metadata: Metadata = { title: "Lançamentos — Pactum" };

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EntriesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await requireFinanceAccess(tenant);

  const [accounts, entries] = await Promise.all([
    prisma.financeAccount.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.financialEntry.findMany({
      where: { organizationId: session.user.organizationId },
      include: { account: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ]);

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Lançamentos</h1>
      <p className="mt-1 text-neutral-500">Receitas e despesas do escritório.</p>

      {accounts.length === 0 ? (
        <p className="mt-6 max-w-lg rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Crie ao menos uma categoria no Plano de contas antes de lançar valores.
        </p>
      ) : (
        <div className="mt-6 max-w-lg">
          <EntryForm
            accounts={accounts.map((account) => ({
              id: account.id,
              name: account.name,
              type: account.type,
            }))}
          />
        </div>
      )}

      <div className="mt-8 max-w-2xl">
        <Card className="divide-y divide-neutral-100 p-0">
          {entries.map((entry) => {
            const isOverdue =
              entry.account.type === "REVENUE" && !entry.paidAt && entry.dueDate && entry.dueDate < new Date();

            let statusLabel = "";
            if (entry.paidAt) {
              statusLabel = ` · pago em ${entry.paidAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
            } else if (isOverdue) {
              statusLabel = " · em atraso";
            } else if (entry.dueDate) {
              statusLabel = ` · vence em ${entry.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
            }

            return (
              <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{entry.description}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {entry.account.name} · {entry.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    {statusLabel}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`text-sm font-medium ${entry.account.type === "REVENUE" ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {entry.account.type === "REVENUE" ? "+" : "-"}
                    {currency(Number(entry.amount))}
                  </span>
                  {!entry.paidAt && (
                    <form action={markEntryPaid.bind(null, entry.id)}>
                      <button type="submit" className="text-xs text-neutral-500 underline hover:text-neutral-800">
                        Marcar pago
                      </button>
                    </form>
                  )}
                  <form action={deleteFinancialEntry.bind(null, entry.id)}>
                    <button type="submit" className="text-xs text-red-600 underline hover:text-red-800">
                      Excluir
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {entries.length === 0 && (
            <p className="px-5 py-6 text-sm text-neutral-400">Nenhum lançamento ainda.</p>
          )}
        </Card>
      </div>
    </main>
  );
}
