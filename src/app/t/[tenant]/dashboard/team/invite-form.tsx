"use client";

import { useActionState } from "react";
import { createInvitation, type CreateInvitationState } from "@/lib/actions/invitations";

const initialState: CreateInvitationState = {};

export function InviteForm() {
  const [state, formAction, pending] = useActionState(createInvitation, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          Convidar por e-mail
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="colega@escritorio.com.br"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "Gerando..." : "Gerar convite"}
          </button>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state.inviteUrl && (
        <div className="rounded-md bg-neutral-50 px-3 py-2">
          <p className="text-xs text-neutral-500">
            Envie este link para a pessoa convidada (ainda não enviamos e-mail automaticamente):
          </p>
          <p className="mt-1 break-all font-mono text-xs text-neutral-800">{state.inviteUrl}</p>
        </div>
      )}
    </form>
  );
}
