import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = { title: "Entrar no workspace — Pactum" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>;
}) {
  const { tenant, token } = await params;

  const organization = await prisma.organization.findUnique({ where: { slug: tenant } });
  const invitation = organization
    ? await prisma.invitation.findUnique({ where: { token } })
    : null;

  const isValid =
    organization &&
    invitation &&
    invitation.organizationId === organization.id &&
    invitation.status === "PENDING" &&
    invitation.expiresAt > new Date();

  if (!organization || !isValid || !invitation) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-neutral-500">Pactum</p>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">
            Convite inválido ou expirado
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Peça para quem te convidou gerar um novo link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm text-neutral-500">Pactum</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">{organization.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Você foi convidado(a) como <strong>{invitation.email}</strong>
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 p-6 shadow-sm">
          <AcceptInviteForm token={token} email={invitation.email} />
        </div>
      </div>
    </main>
  );
}
