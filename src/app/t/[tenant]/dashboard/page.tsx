import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Workspace — Pactum" };

const NAV_SECTIONS = [
  {
    label: "Canais",
    items: ["# geral", "# societário", "# contencioso"],
  },
  {
    label: "Mensagens diretas",
    items: [],
  },
];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await auth();

  if (!session?.user || session.user.organizationSlug !== tenant) {
    redirect(`/login`);
  }

  const organization = await prisma.organization.findUnique({ where: { slug: tenant } });
  if (!organization) {
    redirect(`/login`);
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-64 shrink-0 flex-col bg-neutral-900 text-neutral-100">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Workspace</p>
            <p className="font-semibold">{organization.name}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                {section.label}
              </p>
              <ul className="mt-1 space-y-0.5">
                {section.items.length === 0 && (
                  <li className="px-2 py-1 text-sm text-neutral-500">Em breve</li>
                )}
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="cursor-default rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-neutral-400">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 px-8 py-10">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Bem-vindo(a), {session.user.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-neutral-500">
          Este é o workspace de <strong>{organization.name}</strong>. A fundação de
          login e conta multi-tenant está pronta — chat em canais e integração de
          arquivos (Drive/SharePoint) entram nas próximas etapas.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-5">
            <p className="text-sm font-medium text-neutral-900">Canais e mensagens</p>
            <p className="mt-1 text-sm text-neutral-500">
              Converse em tempo real por canal ou em conversas diretas, como no
              Slack — específico para as áreas do seu escritório.
            </p>
            <span className="mt-3 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
              Em breve
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200 p-5">
            <p className="text-sm font-medium text-neutral-900">Arquivos e integrações</p>
            <p className="mt-1 text-sm text-neutral-500">
              Anexe documentos diretamente ou conecte o Google Drive/SharePoint
              do escritório para buscar e compartilhar arquivos sem sair do chat.
            </p>
            <span className="mt-3 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
              Em breve
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
