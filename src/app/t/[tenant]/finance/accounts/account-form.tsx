"use client";

import { useActionState } from "react";
import { createFinanceAccount, type FinanceActionResult } from "@/lib/actions/finance";
import { Card } from "@/components/ui/card";

const initialState: FinanceActionResult = {};

export function AccountForm() {
  const [state, formAction, pending] = useActionState(createFinanceAccount, initialState);

  return (
    <Card>
      <form action={formAction}>
        <div className="flex gap-2">
          <input
            name="name"
            required
            placeholder="Ex: Honorários"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
          <select
            name="type"
            required
            defaultValue="REVENUE"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
          >
            <option value="REVENUE">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {pending ? "Criando..." : "Adicionar"}
          </button>
        </div>
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </form>
    </Card>
  );
}
