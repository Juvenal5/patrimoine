import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ── Routes strictement réservées aux ADMIN ──────────────────────────────
    const adminOnlyRoutes = [
      "/Utilisateurs",
      "/utilisateurs",
    ];

    const isAdminRoute = adminOnlyRoutes.some(route =>
      pathname.startsWith(route)
    );

    if (isAdminRoute && token?.role !== "ADMIN") {
      // Redirige vers le Dashboard avec un paramètre d'erreur
      const url = req.nextUrl.clone();
      url.pathname = "/Dashboard";
      url.searchParams.set("error", "access_denied");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Le middleware ne s'exécute que si l'utilisateur est connecté
      // Sinon NextAuth redirige automatiquement vers /auth
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Applique le middleware à toutes les routes sauf :
     * - /auth (page de connexion)
     * - /api/auth (NextAuth callbacks)
     * - _next (assets Next.js)
     * - fichiers statiques
     */
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};



// import { NextRequest, NextResponse } from "next/server";

// export function middleware(req: NextRequest) {
//   const token = req.cookies.get("token");

//   const isAuthPage =
//     req.nextUrl.pathname.startsWith("/auth");

//   // Pas connecté
//   if (!token && !isAuthPage) {
//     return NextResponse.redirect(
//       new URL("/auth", req.url)
//     );
//   }

//   // Déjà connecté
//   if (token && isAuthPage) {
//     return NextResponse.redirect(
//       new URL("/", req.url)
//     );
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
// };