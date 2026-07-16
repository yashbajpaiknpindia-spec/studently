import { NextRequest, NextResponse } from "next/server";
import { verifySession, ADMIN_SESSION_COOKIE, STUDENT_SESSION_COOKIE } from "@/lib/auth";
import { buildAppUrl } from "@/lib/request-origin";

const STUDENT_PROTECTED_PREFIXES = ["/dashboard", "/weekly-test", "/ai-tools", "/settings"];
const STUDENT_PROTECTED_API_PREFIXES = [
  "/api/students/me",
  "/api/applications",
  "/api/saved-items",
  "/api/notifications",
  "/api/ai-tools",
  "/api/recommendations",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Admin area ---
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token, "ADMIN") : null;
    if (!session) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = buildAppUrl(req, "/admin/login");
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // --- Student area ---
  const isProtectedPage = STUDENT_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtectedApi = STUDENT_PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtectedPage || isProtectedApi) {
    const token = req.cookies.get(STUDENT_SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token, "STUDENT") : null;
    if (!session) {
      if (isProtectedApi) {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
      }
      const loginUrl = buildAppUrl(req, "/auth");
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/weekly-test/:path*",
    "/ai-tools/:path*",
    "/settings/:path*",
    "/api/students/me/:path*",
    "/api/applications/:path*",
    "/api/saved-items/:path*",
    "/api/notifications/:path*",
    "/api/ai-tools/:path*",
    "/api/recommendations/:path*",
  ],
};
