import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { GradientBubble } from "@/components/ui/gradient-bubble";

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
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            ← Mês anterior
          </Link>
          <Link
            href={`?month=${monthParam(next.year, next.month)}`}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Próximo mês →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GradientBubble label="Receita" value={currency(revenue)} gradient="emerald" sublabel="Regime de competência" />
        <GradientBubble label="Despesa" value={currency(expense)} gradient="rose" sublabel="Regime de competência" />
        <GradientBubble
          label="Resultado"
          value={currency(result)}
          gradient={result >= 0 ? "violet" : "dark"}
          sublabel={result >= 0 ? "Superávit do mês" : "Déficit do mês"}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-neutral-900">Fluxo de caixa do mês</h2>
          <p className="mt-1 text-sm text-neutral-500">
            O que efetivamente entrou/saiu do caixa (lançamentos marcados como pagos).
          </p>
          <div className="mt-5 space-y-3">
            <StatTile label="Entradas" value={currency(cashIn)} tint="green" />
            <StatTile label="Saídas" value={currency(cashOut)} tint="red" />
            <StatTile label="Saldo do período" value={currency(cashIn - cashOut)} tint="purple" />
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-neutral-900">Inadimplência</h2>
          <p className="mt-1 text-sm text-neutral-500">Recebimentos vencidos, de todos os períodos.</p>
          <div className="mt-5 space-y-3">
            <StatTile
              label="Total em atraso"
              value={currency(overdueTotal)}
              tint="red"
              valueClassName="text-red-700"
            />
            <StatTile label="Títulos em atraso" value={overdueEntries.length} tint="orange" />
          </div>

          {overdueEntries.length > 0 && (
            <ul className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100 pt-2">
              {overdueEntries.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">{entry.description}</p>
                    <p className="text-xs text-neutral-500">
                      Venceu em {entry.dueDate?.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-red-600">
                    {currency(Number(entry.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
