import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tenantPath } from "@/lib/tenant";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant } = await params;
  const organization = await prisma.organization.findUnique({ where: { slug: tenant } });
  return { title: organization ? `Entrar — ${organization.name}` : "Workspace não encontrado" };
}

export default async function TenantLoginPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const organization = await prisma.organization.findUnique({ where: { slug: tenant } });
  if (!organization) notFound();

  const session = await auth();
  if (session?.user?.organizationSlug === tenant) {
    redirect(tenantPath(tenant, "/dashboard"));
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm text-neutral-500">Pactum</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
            {organization.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Entre no workspace do escritório</p>
        </div>

        <div className="rounded-xl border border-neutral-200 p-6 shadow-sm">
          <LoginForm tenant={tenant} />
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Ainda não tem um workspace?{" "}
          <a href="/signup" className="text-neutral-700 underline">
            Criar um novo
          </a>
        </p>
      </div>
    </main>
  );
}
