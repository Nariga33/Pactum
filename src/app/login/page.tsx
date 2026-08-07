import type { Metadata } from "next";
import Link from "next/link";
import { FindWorkspaceForm } from "./find-workspace-form";

export const metadata: Metadata = { title: "Entrar — Pactum" };

export default function FindWorkspacePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm text-neutral-500">Pactum</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Entrar no seu workspace</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Informe o endereço do escritório para ir à tela de login dele.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 p-6 shadow-sm">
          <FindWorkspaceForm />
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Ainda não tem um workspace?{" "}
          <Link href="/signup" className="text-neutral-700 underline">
            Criar um novo
          </Link>
        </p>
      </div>
    </main>
  );
}
