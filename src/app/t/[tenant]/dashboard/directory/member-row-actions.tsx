"use client";

import { useState, useTransition } from "react";
import { updateMemberRole, removeMember, toggleFinanceAccess } from "@/lib/actions/members";
import type { MembershipRole } from "@/generated/prisma/enums";

const ROLES: MembershipRole[] = ["OWNER", "ADMIN", "MEMBER"];

export function MemberRowActions({
  membershipId,
  role: initialRole,
  financeAccess: initialFinanceAccess,
  canEditRole,
  canRemove,
}: {
  membershipId: string;
  role: MembershipRole;
  financeAccess: boolean;
  canEditRole: boolean;
  canRemove: boolean;
}) {
  const [role, setRole] = useState(initialRole);
  const [financeAccess, setFinanceAccess] = useState(initialFinanceAccess);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextRole = event.target.value as MembershipRole;
    const previousRole = role;
    setRole(nextRole);
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRole(membershipId, nextRole);
      if (result.error) {
        setRole(previousRole);
        setError(result.error);
      }
    });
  }

  function handleFinanceAccessChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked;
    setFinanceAccess(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleFinanceAccess(membershipId, next);
      if (result.error) {
        setFinanceAccess(!next);
        setError(result.error);
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeMember(membershipId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {canEditRole ? (
          <select
            value={role}
            onChange={handleRoleChange}
            disabled={pending}
            className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-600 disabled:opacity-50"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">{role}</span>
        )}

        {canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="text-xs text-red-600 underline disabled:opacity-50"
          >
            Remover
          </button>
        )}
      </div>

      {canEditRole && role !== "OWNER" && (
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={financeAccess}
            onChange={handleFinanceAccessChange}
            disabled={pending}
          />
          Acesso ao financeiro
        </label>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
