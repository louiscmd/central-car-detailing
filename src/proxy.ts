import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;

  const publicPaths = ["/login", "/register", "/privacy"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isAuth && !isPublic && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/instagram") && !pathname.startsWith("/api/webhooks")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuth && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icon-\\d+\\.png|apple-touch-icon\\.png|manifest\\.webmanifest|sw\\.js|api/auth).*)",
  ],
};
