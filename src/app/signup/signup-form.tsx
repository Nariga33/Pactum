"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "@/lib/actions/signup";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="firmName" className="text-sm font-medium text-neutral-700">
          Nome do escritório
        </label>
        <input
          id="firmName"
          name="firmName"
          required
          defaultValue={state.values?.firmName}
          placeholder="Reis & Associados Advocacia"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-neutral-700">
          Endereço do seu workspace
        </label>
        <div className="flex items-center overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-900">
          <span className="whitespace-nowrap bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            pactum.app/
          </span>
          <input
            id="slug"
            name="slug"
            defaultValue={state.values?.slug}
            placeholder="reis-associados"
            className="w-full px-3 py-2 text-sm outline-none"
          />
        </div>
        <p className="text-xs text-neutral-500">
          Deixe em branco para gerarmos a partir do nome do escritório.
        </p>
      </div>

      <hr className="border-neutral-200" />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-neutral-700">
          Seu nome
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={state.values?.name}
          placeholder="Ana Ribeiro"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={state.values?.email}
          placeholder="ana@escritorio.com.br"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Senha
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

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Criando workspace..." : "Criar workspace do escritório"}
      </button>
    </form>
  );
}
