import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host");

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const tenant = resolveTenant({ hostname, pathname });

  if (!tenant) {
    return NextResponse.next();
  }

  const pathParts = pathname.split("/").filter(Boolean);
  const firstPart = pathParts[0];

  if (firstPart === tenant.slug) {
    return NextResponse.next();
  }

  const rewrittenUrl = request.nextUrl.clone();
  rewrittenUrl.pathname =
    pathname === "/" ? `/${tenant.slug}` : `/${tenant.slug}${pathname}`;

  return NextResponse.rewrite(rewrittenUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};