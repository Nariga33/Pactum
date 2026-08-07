import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { SignOutButton } from "./sign-out-button";
import { CreateChannelForm } from "./_components/create-channel-form";

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
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-64 shrink-0 flex-col bg-neutral-900 text-neutral-100">
        <div className="px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Workspace</p>
          <p className="font-semibold">{organization.name}</p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-2">
          <div>
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
              Canais
            </p>
            <ul className="mt-1 space-y-0.5">
              {channelMemberships.map(({ channel }) => (
                <li key={channel.id}>
                  <Link
                    href={`/dashboard/c/${channel.id}`}
                    className="block truncate rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    # {channel.name}
                  </Link>
                </li>
              ))}
            </ul>
            <CreateChannelForm />
          </div>

          <div>
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
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
                    href={`/dashboard/dm/${user.id}`}
                    className="flex items-center gap-2 truncate rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    <Avatar name={user.name} image={user.image} size="sm" />
                    <span className="truncate">{user.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="space-y-0.5 border-t border-neutral-800 px-2 py-2">
          <Link
            href="/dashboard/directory"
            className="block rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Diretório
          </Link>
          <Link
            href="/dashboard/files"
            className="block rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Arquivos
          </Link>
          {hasFinanceAccess && (
            <Link
              href="/finance"
              className="block rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Financeiro
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3">
          <Link href="/dashboard/profile" className="flex min-w-0 items-center gap-2 hover:opacity-80">
            <Avatar name={currentUser.name} image={currentUser.image} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{currentUser.name}</p>
              <p className="truncate text-xs text-neutral-400">{currentUser.email}</p>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
