import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as { role?: string })?.role;

  // Let static assets, API auth routes, and login page through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Not logged in → login page
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // CLIENT users can only access /portal and /api/portal
  if (role === "CLIENT") {
    if (!pathname.startsWith("/portal") && !pathname.startsWith("/api/portal")) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|sw.js|.*\\.png$|.*\\.ico$|.*\\.webmanifest$).*)"],
};
