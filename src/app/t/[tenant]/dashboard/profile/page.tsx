import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Meu perfil — Pactum" };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await requireTenantSession(tenant);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, title: true, image: true },
  });

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Meu perfil</h1>
      <p className="mt-1 text-neutral-500">
        Essas informações aparecem para o resto do escritório.
      </p>

      <div className="mt-6 max-w-md">
        <ProfileForm
          name={user.name}
          email={user.email}
          phone={user.phone}
          title={user.title}
          image={user.image}
        />
      </div>
    </main>
  );
}
