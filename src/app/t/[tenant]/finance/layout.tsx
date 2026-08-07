import Link from "next/link";
import { requireFinanceAccess } from "@/lib/finance";

export default async function FinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  await requireFinanceAccess(tenant);

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-56 shrink-0 flex-col bg-neutral-950 text-neutral-100">
        <div className="px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Modo focado</p>
          <p className="font-semibold">Financeiro</p>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          <Link
            href="/finance"
            className="block rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Visão geral (DRE)
          </Link>
          <Link
            href="/finance/entries"
            className="block rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Lançamentos
          </Link>
          <Link
            href="/finance/accounts"
            className="block rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Plano de contas
          </Link>
        </nav>

        <div className="border-t border-neutral-800 px-2 py-2">
          <Link
            href="/dashboard"
            className="block rounded-md px-2 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800"
          >
            ← Voltar ao chat
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
