import { NextRequest, NextResponse } from "next/server";
import { extractTenantSlug } from "@/lib/tenant";

// Reverse-proxies tenant subdomains (escritorio.pactum.app) into the
// /t/[tenant] route group, and stamps the resolved tenant slug on a
// request header so server components, route handlers and Auth.js can
// read it without re-parsing the Host header.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const tenantSlug = extractTenantSlug(host);
  const { pathname, search } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);

  if (!tenantSlug) {
    requestHeaders.delete("x-tenant-slug");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.set("x-tenant-slug", tenantSlug);

  // Let API routes and static assets pass through untouched (path-based
  // routing only applies to pages); they read the tenant from the header.
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const rewrittenUrl = request.nextUrl.clone();
  rewrittenUrl.pathname = `/t/${tenantSlug}${pathname}`;
  rewrittenUrl.search = search;

  return NextResponse.rewrite(rewrittenUrl, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
