"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/tenant";

export function FindWorkspaceForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = slugify(value);
    if (!slug) {
      setError("Informe o endereço do seu workspace.");
      return;
    }
    router.push(`/${slug}/login`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-neutral-700">
          Endereço do workspace
        </label>
        <div className="flex items-center overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-900">
          <span className="whitespace-nowrap bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            pactum.app/
          </span>
          <input
            id="slug"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
            placeholder="reis-associados"
            className="w-full px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        Continuar
      </button>
    </form>
  );
}
