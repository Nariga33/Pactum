"use client";

import { useActionState } from "react";
import { createFinancialEntry, type FinanceActionResult } from "@/lib/actions/finance";

const initialState: FinanceActionResult = {};

export function EntryForm({
  accounts,
}: {
  accounts: { id: string; name: string; type: "REVENUE" | "EXPENSE" }[];
}) {
  const [state, formAction, pending] = useActionState(createFinancialEntry, initialState);

  return (
    <form action={formAction} className="rounded-xl border border-neutral-200 p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-neutral-700">
            Descrição
          </label>
          <input
            id="description"
            name="description"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="accountId" className="text-sm font-medium text-neutral-700">
            Categoria
          </label>
          <select
            id="accountId"
            name="accountId"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.type === "REVENUE" ? "Receita" : "Despesa"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium text-neutral-700">
            Valor (R$)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-sm font-medium text-neutral-700">
            Data
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dueDate" className="text-sm font-medium text-neutral-700">
            Vencimento (opcional)
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Lançando..." : "Lançar"}
      </button>
    </form>
  );
}
