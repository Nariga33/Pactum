"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createChannel, type CreateChannelState } from "@/lib/actions/channels";

const initialState: CreateChannelState = {};

export function CreateChannelForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createChannel, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.channelId) {
      router.push(`/dashboard/c/${state.channelId}`);
    }
  }, [state.channelId, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 text-xs font-medium text-neutral-400 hover:text-neutral-200"
      >
        + Criar canal
      </button>
    );
  }

  return (
    <form action={formAction} className="mx-2 mt-1 flex flex-col gap-2 rounded-md bg-neutral-800 p-2">
      <input
        name="name"
        autoFocus
        required
        placeholder="nome-do-canal"
        className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white outline-none focus:border-neutral-500"
      />
      <label className="flex items-center gap-1.5 text-xs text-neutral-400">
        <input type="checkbox" name="isPrivate" className="rounded" />
        Canal privado
      </label>

      {state.error && <p className="text-xs text-red-400">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-white px-2 py-1 text-xs font-medium text-neutral-900 disabled:opacity-50"
        >
          {pending ? "Criando..." : "Criar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
