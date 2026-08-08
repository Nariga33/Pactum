"use client";

// Next.js server actions are bound to the exact deployment that served
// the page. If Vercel redeploys while a tab stays open from before, that
// tab's action IDs stop existing on the server — calling one throws
// instead of resolving, instead of quietly falling back. Any client
// component that awaits a server action for longer than a page load
// should route the failure through here: there's nothing useful to
// retry against a dead bundle, so the only fix is to fetch the new one.
export function isStaleDeploymentError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  // Deliberately does NOT match generic "Failed to fetch" — a plain
  // network blip should just show a retryable error, not force a full
  // page reload. Only the deployment-specific signatures land here.
  return (
    /Failed to find Server Action/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk/i.test(message)
  );
}
