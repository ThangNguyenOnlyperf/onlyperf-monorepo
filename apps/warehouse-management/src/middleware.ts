import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/signin", "/signup", "/setup"] as const;

function isPublicPath(pathname: string) {
  return PUBLIC_ROUTES.some((base) => pathname === base || pathname.startsWith(base + "/"));
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const getSessionToken = () => {
    const direct = req.cookies.get("better-auth.session_token")?.value;
    if (direct) return direct;
    const secure =
      req.cookies.get("__Secure-better-auth.session_token")?.value ||
      req.cookies.get("__Host-better-auth.session_token")?.value;
    if (secure) return secure;
    const any = req.cookies
      .getAll()
      .find((c) => c.name.endsWith("better-auth.session_token"))?.value;
    return any;
  };

  if (isPublicPath(pathname)) {
    const sessionToken = getSessionToken();
    if (sessionToken && (pathname === "/signin" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
