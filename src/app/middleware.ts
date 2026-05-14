import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token");

  const isAuthPage =
    req.nextUrl.pathname.startsWith("/auth");

  // Pas connecté
  if (!token && !isAuthPage) {
    return NextResponse.redirect(
      new URL("/auth", req.url)
    );
  }

  // Déjà connecté
  if (token && isAuthPage) {
    return NextResponse.redirect(
      new URL("/", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};