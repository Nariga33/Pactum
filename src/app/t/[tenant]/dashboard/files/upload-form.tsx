"use client";

import { useActionState } from "react";
import { uploadFile, type FileActionResult } from "@/lib/actions/files";

const initialState: FileActionResult = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadFile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-5">
      <input type="file" name="file" required className="text-sm" />
      <p className="text-xs text-neutral-400">Máximo 7MB por arquivo.</p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Arquivo enviado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar arquivo"}
      </button>
    </form>
  );
}
