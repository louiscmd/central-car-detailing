import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  const publicPaths = ["/login", "/register", "/privacy"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isAuth && !isPublic && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/instagram") && !pathname.startsWith("/api/webhooks")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuth && isPublic) {
    const dest = role === "CLIENT" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // CLIENT users can only access /portal and /api/portal
  if (isAuth && role === "CLIENT") {
    if (!pathname.startsWith("/portal") && !pathname.startsWith("/api/portal")) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icon-\\d+\\.png|apple-touch-icon\\.png|manifest\\.webmanifest|sw\\.js|api/auth).*)",
  ],
};
