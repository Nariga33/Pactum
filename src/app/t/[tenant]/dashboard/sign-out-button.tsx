import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
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
