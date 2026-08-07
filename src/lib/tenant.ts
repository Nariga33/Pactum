// Tenants are identified by the first path segment of the URL
// ({ROOT}/{slug}/...) rather than by subdomain — this works on a plain
// *.vercel.app deployment with no custom domain or wildcard DNS needed.
const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "signup",
  "t",
  "login",
  "dashboard",
  "finance",
  "join",
]);

/**
 * Extracts the tenant slug from a request pathname, or null if the
 * request targets a non-tenant route (landing page, signup, API, etc.)
 * or the first segment isn't a valid/registered-looking slug.
 */
export function extractTenantSlug(pathname: string): string | null {
  const first = pathname.split("/")[1] ?? "";
  return isValidSlug(first) ? first : null;
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DIACRITIC_PATTERN = new RegExp("[̀-ͯ]", "g");

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(DIACRITIC_PATTERN, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

/**
 * Builds the public-facing path for a page inside a tenant's workspace,
 * e.g. tenantPath("reis-associados", "/dashboard") -> "/reis-associados/dashboard".
 * Use this for every Link href, redirect() and router.push() that points
 * inside `/t/[tenant]/...` — a bare "/dashboard" no longer resolves to
 * the right tenant now that routing isn't subdomain-based.
 */
export function tenantPath(slug: string, path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `/${slug}${suffix === "/" ? "" : suffix}`;
}
