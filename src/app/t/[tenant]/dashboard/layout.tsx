import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash, Users, Folder, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { tenantPath } from "@/lib/tenant";
import { Avatar } from "@/components/avatar";
import { SignOutButton } from "./sign-out-button";
import { CreateChannelForm } from "./_components/create-channel-form";
import { SearchBar } from "./_components/search-bar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await requireTenantSession(tenant);

  const organization = await prisma.organization.findUnique({ where: { slug: tenant } });
  if (!organization) notFound();

  const [channelMemberships, teammates, currentUser, currentMembership] = await Promise.all([
    prisma.channelMember.findMany({
      where: { userId: session.user.id, channel: { organizationId: organization.id, type: "CHANNEL" } },
      include: { channel: true },
      orderBy: { channel: { createdAt: "asc" } },
    }),
    prisma.membership.findMany({
      where: { organizationId: organization.id, userId: { not: session.user.id } },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true },
    }),
    prisma.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: organization.id } },
      select: { financeAccess: true },
    }),
  ]);

  const hasFinanceAccess = session.user.role === "OWNER" || currentMembership?.financeAccess === true;

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <aside className="flex w-64 shrink-0 flex-col bg-[var(--color-sidebar)] text-neutral-100">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold">
            {organization.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Workspace</p>
            <p className="truncate text-sm font-semibold">{organization.name}</p>
          </div>
        </div>

        <SearchBar tenant={tenant} />

        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-2">
          <div>
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Canais
            </p>
            <ul className="mt-1 space-y-0.5">
              {channelMemberships.map(({ channel }) => (
                <li key={channel.id}>
                  <Link
                    href={tenantPath(tenant, `/dashboard/c/${channel.id}`)}
                    className="flex items-center gap-2 truncate rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
                  >
                    <Hash className="size-3.5 shrink-0 text-neutral-500" />
                    <span className="truncate">{channel.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <CreateChannelForm tenant={tenant} />
          </div>

          <div>
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Mensagens diretas
            </p>
            <ul className="mt-1 space-y-0.5">
              {teammates.length === 0 && (
                <li className="px-2 py-1 text-sm text-neutral-500">
                  Ninguém mais no workspace ainda
                </li>
              )}
              {teammates.map(({ user }) => (
                <li key={user.id}>
                  <Link
                    href={tenantPath(tenant, `/dashboard/dm/${user.id}`)}
                    className="flex items-center gap-2 truncate rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
                  >
                    <Avatar name={user.name} image={user.image} size="sm" />
                    <span className="truncate">{user.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="space-y-0.5 border-t border-[var(--color-sidebar-border)] px-2 py-2">
          <Link
            href={tenantPath(tenant, "/dashboard/directory")}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
          >
            <Users className="size-4 text-neutral-500" />
            Diretório
          </Link>
          <Link
            href={tenantPath(tenant, "/dashboard/files")}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
          >
            <Folder className="size-4 text-neutral-500" />
            Arquivos
          </Link>
          {hasFinanceAccess && (
            <Link
              href={tenantPath(tenant, "/finance")}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-[var(--color-sidebar-hover)]"
            >
              <Wallet className="size-4 text-neutral-500" />
              Financeiro
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-sidebar-border)] px-4 py-3">
          <Link href={tenantPath(tenant, "/dashboard/profile")} className="flex min-w-0 items-center gap-2 hover:opacity-80">
            <Avatar name={currentUser.name} image={currentUser.image} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{currentUser.name}</p>
              <p className="truncate text-xs text-neutral-500">{currentUser.email}</p>
            </div>
          </Link>
          <SignOutButton tenant={tenant} />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
