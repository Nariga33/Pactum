"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { acceptInvitation } from "@/lib/actions/invitations";
import { tenantPath } from "@/lib/tenant";

export function AcceptInviteForm({
  tenant,
  token,
  email,
}: {
  tenant: string;
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await acceptInvitation(token, name, password);
    if (result.error) {
      setPending(false);
      setError(result.error);
      return;
    }

    const signInResult = await signIn("credentials", { email, password, tenant, redirect: false });
    setPending(false);

    if (signInResult?.error) {
      router.push(tenantPath(tenant, "/login"));
      return;
    }

    router.push(tenantPath(tenant, "/dashboard"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-neutral-700">
          Seu nome
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Seu nome completo"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Crie uma senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo de 8 caracteres"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar no workspace"}
      </button>
    </form>
  );
}
