import { signOut } from "@/auth";
import { tenantPath } from "@/lib/tenant";

export function SignOutButton({ tenant }: { tenant: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: tenantPath(tenant, "/login") });
      }}
    >
      <button
        type="submit"
        className="rounded-md px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
      >
        Sair
      </button>
    </form>
  );
}
