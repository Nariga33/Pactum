import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { revokeInvitation } from "@/lib/actions/invitations";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Equipe — Pactum" };

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

export default async function TeamPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await requireTenantSession(tenant);
  const isAdmin = ADMIN_ROLES.has(session.user.role);

  const [memberships, pendingInvites] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: session.user.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    isAdmin
      ? prisma.invitation.findMany({
          where: { organizationId: session.user.organizationId, status: "PENDING" },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Equipe</h1>
      <p className="mt-1 text-neutral-500">
        Pessoas com acesso a este workspace.
      </p>

      {isAdmin && (
        <div className="mt-6 max-w-lg">
          <InviteForm />
        </div>
      )}

      <div className="mt-8 max-w-lg">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Membros
        </h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {memberships.map((membership) => (
            <li key={membership.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{membership.user.name}</p>
                <p className="text-xs text-neutral-500">{membership.user.email}</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                {membership.role}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && pendingInvites.length > 0 && (
        <div className="mt-8 max-w-lg">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Convites pendentes
          </h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-neutral-700">{invite.email}</p>
                <form action={revokeInvitation.bind(null, invite.id)}>
                  <button
                    type="submit"
                    className="text-xs text-neutral-500 underline hover:text-neutral-800"
                  >
                    Cancelar convite
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
