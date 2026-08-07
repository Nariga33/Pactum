"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { MemberRowActions } from "./member-row-actions";
import type { MembershipRole } from "@/generated/prisma/enums";

export type DirectoryMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  title: string | null;
  phone: string | null;
  role: MembershipRole;
  isSelf: boolean;
  canEditRole: boolean;
  canRemove: boolean;
};

export function DirectoryGrid({ members }: { members: DirectoryMember[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        (member.title ?? "").toLowerCase().includes(q),
    );
  }, [members, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Pesquisar pessoas..."
        className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((member) => (
          <div key={member.membershipId} className="rounded-xl border border-neutral-200 p-5">
            <div className="flex items-start gap-3">
              <Avatar name={member.name} image={member.image} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">
                  {member.name}
                  {member.isSelf && <span className="ml-1 text-neutral-400">(você)</span>}
                </p>
                {member.title && (
                  <p className="truncate text-sm text-neutral-500">{member.title}</p>
                )}
                <p className="mt-1 truncate text-xs text-neutral-400">{member.email}</p>
                {member.phone && (
                  <p className="truncate text-xs text-neutral-400">{member.phone}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
              <MemberRowActions
                membershipId={member.membershipId}
                role={member.role}
                canEditRole={member.canEditRole}
                canRemove={member.canRemove}
              />
              {!member.isSelf && (
                <Link
                  href={`/dashboard/dm/${member.userId}`}
                  className="text-xs text-neutral-600 underline hover:text-neutral-900"
                >
                  Mensagem
                </Link>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-neutral-400">Nenhuma pessoa encontrada.</p>
        )}
      </div>
    </div>
  );
}
