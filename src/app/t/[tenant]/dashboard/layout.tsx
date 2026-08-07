import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

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

  const [channelMemberships, teammates] = await Promise.all([
    prisma.channelMember.findMany({
      where: { userId: session.user.id, channel: { organizationId: organization.id, type: "CHANNEL" } },
      include: { channel: true },
      orderBy: { channel: { createdAt: "asc" } },
    }),
    prisma.membership.findMany({
      where: { organizationId: organization.id, userId: { not: session.user.id } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

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
                    className="block truncate rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    {user.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="border-t border-neutral-800 px-2 py-2">
          <Link
            href="/dashboard/team"
            className="block rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Equipe
          </Link>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-neutral-400">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
