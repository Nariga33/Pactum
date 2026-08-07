import Link from "next/link";
import { LayoutDashboard, Receipt, BookOpen, ArrowLeft } from "lucide-react";
import { requireFinanceAccess } from "@/lib/finance";
import { tenantPath } from "@/lib/tenant";

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
    <div className="flex min-h-screen bg-[var(--background)]">
      <aside className="flex w-60 shrink-0 flex-col bg-[var(--color-sidebar)] text-neutral-100">
        <div className="px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Modo focado</p>
          <p className="font-semibold">Financeiro</p>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          <Link
            href={tenantPath(tenant, "/finance")}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
          >
            <LayoutDashboard className="size-4 text-neutral-500" />
            Visão geral (DRE)
          </Link>
          <Link
            href={tenantPath(tenant, "/finance/entries")}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
          >
            <Receipt className="size-4 text-neutral-500" />
            Lançamentos
          </Link>
          <Link
            href={tenantPath(tenant, "/finance/accounts")}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
          >
            <BookOpen className="size-4 text-neutral-500" />
            Plano de contas
          </Link>
        </nav>

        <div className="border-t border-[var(--color-sidebar-border)] px-2 py-2">
          <Link
            href={tenantPath(tenant, "/dashboard")}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-400 hover:bg-[var(--color-sidebar-hover)]"
          >
            <ArrowLeft className="size-4" />
            Voltar ao chat
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
