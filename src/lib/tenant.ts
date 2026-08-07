// Root domain the app is served from (no protocol, may include a port
// in development, e.g. "lvh.me:3000"). Tenants are reachable at
// "{slug}.{ROOT_DOMAIN}".
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin"]);

/**
 * Extracts the tenant subdomain from a request Host header, or null if
 * the request targets the root domain (marketing site, signup, etc.)
 * or a reserved/unknown host.
 */
export function extractTenantSlug(host: string | null): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0];
  const rootHostname = ROOT_DOMAIN.split(":")[0];

  if (hostname === rootHostname) return null;
  if (!hostname.endsWith(`.${rootHostname}`)) return null;

  const subdomain = hostname.slice(0, -(`.${rootHostname}`.length));
  if (!subdomain || subdomain.includes(".") || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

const IS_LOCAL_ROOT_DOMAIN =
  ROOT_DOMAIN.startsWith("localhost") || ROOT_DOMAIN.startsWith("lvh.me");

export function tenantUrl(slug: string, path = "/"): string {
  const protocol = IS_LOCAL_ROOT_DOMAIN ? "http" : "https";
  return `${protocol}://${slug}.${ROOT_DOMAIN}${path}`;
}

export function rootUrl(path = "/"): string {
  const protocol = IS_LOCAL_ROOT_DOMAIN ? "http" : "https";
  return `${protocol}://${ROOT_DOMAIN}${path}`;
}
