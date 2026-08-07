"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Hash, Loader2 } from "lucide-react";
import { searchWorkspace, type SearchResults } from "@/lib/actions/search";
import { tenantPath } from "@/lib/tenant";
import { Avatar } from "@/components/avatar";

const EMPTY_RESULTS: SearchResults = { channels: [], people: [], messages: [] };

export function SearchBar({ tenant }: { tenant: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchWorkspace(trimmed);
      setResults(data);
      setLoading(false);
    }, 250);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(path: string) {
    setOpen(false);
    setQuery("");
    router.push(tenantPath(tenant, path));
  }

  const hasQuery = query.trim().length >= 2;
  const hasResults = results.channels.length > 0 || results.people.length > 0 || results.messages.length > 0;

  return (
    <div ref={containerRef} className="relative px-2 pb-2">
      <div className="flex items-center gap-2 rounded-md border border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-hover)] px-2.5 py-1.5">
        <Search className="size-3.5 shrink-0 text-neutral-500" />
        <input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar canais, pessoas, mensagens..."
          className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
        />
        {loading && <Loader2 className="size-3.5 shrink-0 animate-spin text-neutral-500" />}
      </div>

      {open && hasQuery && (
        <div className="absolute inset-x-2 top-full z-20 mt-1 max-h-96 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1.5 shadow-lg">
          {!loading && !hasResults && (
            <p className="px-3 py-4 text-center text-sm text-neutral-400">Nenhum resultado.</p>
          )}

          {results.channels.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                Canais
              </p>
              {results.channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => goTo(`/dashboard/c/${channel.id}`)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                >
                  <Hash className="size-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}

          {results.people.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                Pessoas
              </p>
              {results.people.map((person) => (
                <button
                  key={person.userId}
                  type="button"
                  onClick={() => goTo(`/dashboard/dm/${person.userId}`)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                >
                  <Avatar name={person.name} image={person.image} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{person.name}</span>
                </button>
              ))}
            </div>
          )}

          {results.messages.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                Mensagens
              </p>
              {results.messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() =>
                    goTo(message.dmUserId ? `/dashboard/dm/${message.dmUserId}` : `/dashboard/c/${message.channelId}`)
                  }
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left hover:bg-neutral-50"
                >
                  <span className="text-xs font-medium text-neutral-600">
                    {message.channelLabel} · {message.senderName}
                  </span>
                  <span className="truncate text-sm text-neutral-800">{message.snippet}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
