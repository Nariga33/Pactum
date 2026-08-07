import { NextRequest, NextResponse } from "next/server";
import { extractTenantSlug } from "@/lib/tenant";

// Reverse-proxies tenant paths ({ROOT}/{slug}/...) into the /t/[tenant]
// route group, and stamps the resolved tenant slug on a request header
// so server components and route handlers can read it without
// re-parsing the pathname. Path-based (not subdomain-based) so the app
// works on a plain *.vercel.app deployment with no custom domain.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const tenantSlug = extractTenantSlug(pathname);

  const requestHeaders = new Headers(request.headers);

  if (!tenantSlug) {
    requestHeaders.delete("x-tenant-slug");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.set("x-tenant-slug", tenantSlug);

  const rewrittenUrl = request.nextUrl.clone();
  rewrittenUrl.pathname = `/t${pathname}`;
  rewrittenUrl.search = search;

  return NextResponse.rewrite(rewrittenUrl, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
