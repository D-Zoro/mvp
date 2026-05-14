import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_KEYS } from "@/lib/auth/tokens";

const PROTECTED = ["/sell", "/orders", "/profile"];
const AUTH_ONLY = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const token = req.cookies.get(TOKEN_KEYS.access)?.value;
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((path) => pathname.startsWith(path)) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  if (AUTH_ONLY.some((path) => pathname === path) && token) {
    return NextResponse.redirect(new URL("/books", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/sell/:path*", "/orders/:path*", "/profile/:path*", "/login", "/register"],
};
