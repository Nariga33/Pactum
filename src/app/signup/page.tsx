import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Criar workspace — Pactum",
};

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Pactum
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
            Crie o workspace do seu escritório
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Um espaço próprio, com login dedicado, para a comunicação interna do
            seu escritório de advocacia.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 p-6 shadow-sm">
          <SignupForm />
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Já tem um workspace?{" "}
          <span className="text-neutral-700">
            Acesse pelo endereço do seu escritório, ex: seu-escritorio.pactum.app
          </span>
        </p>
      </div>
    </main>
  );
}
