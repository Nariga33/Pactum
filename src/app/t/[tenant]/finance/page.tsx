import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance";

export const metadata: Metadata = { title: "Financeiro — Pactum" };

function parseMonth(monthParam: string | undefined): { year: number; month: number } {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split("-").map(Number);
    if (year && month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function monthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FinanceOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { tenant } = await params;
  const { month: monthParamValue } = await searchParams;
  const session = await requireFinanceAccess(tenant);

  const { year, month } = parseMonth(monthParamValue);
  const { start, end } = monthRange(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const [dreEntries, cashEntries, overdueEntries] = await Promise.all([
    prisma.financialEntry.findMany({
      where: { organizationId: session.user.organizationId, date: { gte: start, lt: end } },
      include: { account: true },
    }),
    prisma.financialEntry.findMany({
      where: { organizationId: session.user.organizationId, paidAt: { gte: start, lt: end } },
      include: { account: true },
    }),
    prisma.financialEntry.findMany({
      where: {
        organizationId: session.user.organizationId,
        paidAt: null,
        dueDate: { lt: new Date() },
        account: { type: "REVENUE" },
      },
      include: { account: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const revenue = dreEntries
    .filter((e) => e.account.type === "REVENUE")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const expense = dreEntries
    .filter((e) => e.account.type === "EXPENSE")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const result = revenue - expense;

  const cashIn = cashEntries
    .filter((e) => e.account.type === "REVENUE")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const cashOut = cashEntries
    .filter((e) => e.account.type === "EXPENSE")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const maxCashBar = Math.max(cashIn, cashOut, 1);

  const overdueTotal = overdueEntries.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">DRE Gerencial</h1>
          <p className="mt-1 capitalize text-neutral-500">{formatMonthLabel(year, month)}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`?month=${monthParam(prev.year, prev.month)}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            ← Mês anterior
          </Link>
          <Link
            href={`?month=${monthParam(next.year, next.month)}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Próximo mês →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Receita</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{currency(revenue)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Despesa</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{currency(expense)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Resultado</p>
          <p className={`mt-1 text-2xl font-semibold ${result >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {currency(result)}
          </p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Fluxo de caixa do mês</h2>
      <p className="text-sm text-neutral-500">
        O que efetivamente entrou/saiu do caixa (lançamentos marcados como pagos).
      </p>
      <div className="mt-4 max-w-md space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span>Entradas</span>
            <span className="font-medium text-emerald-600">{currency(cashIn)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-neutral-100">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${(cashIn / maxCashBar) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span>Saídas</span>
            <span className="font-medium text-red-600">{currency(cashOut)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-neutral-100">
            <div
              className="h-2 rounded-full bg-red-500"
              style={{ width: `${(cashOut / maxCashBar) * 100}%` }}
            />
          </div>
        </div>
        <p className="pt-2 text-sm font-medium text-neutral-900">
          Saldo do período: {currency(cashIn - cashOut)}
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Inadimplência</h2>
      <p className="text-sm text-neutral-500">
        Recebimentos vencidos e ainda não pagos, de todos os períodos.
      </p>
      {overdueEntries.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">Nenhum recebimento em atraso.</p>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium text-red-600">
            Total em atraso: {currency(overdueTotal)}
          </p>
          <ul className="mt-2 max-w-lg divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {overdueEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{entry.description}</p>
                  <p className="text-xs text-neutral-500">
                    Venceu em {entry.dueDate?.toLocaleDateString("pt-BR", { timeZone: "UTC" })} ·{" "}
                    {entry.account.name}
                  </p>
                </div>
                <span className="text-sm font-medium text-red-600">
                  {currency(Number(entry.amount))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
