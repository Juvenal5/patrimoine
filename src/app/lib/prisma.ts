import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
//  Singleton PrismaClient
//
//  En développement, Next.js / Turbopack recharge les modules à chaque
//  modification (HMR). Sans ce pattern, chaque rechargement instancie un
//  nouveau PrismaClient, épuisant rapidement le pool de connexions (limite 5
//  par défaut sur Neon / PlanetScale / Supabase).
//
//  En production, les modules ne sont chargés qu'une seule fois, donc un
//  simple `export default new PrismaClient()` serait suffisant — mais ce
//  pattern fonctionne dans les deux cas.
// ─────────────────────────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;







// import { PrismaClient } from "@prisma/client";

// const globalForPrisma = global as unknown as {
//   prisma: PrismaClient;
// };

// export const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log: ["query"],
//   });

// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = prisma;
// }

// export default prisma;



// import { PrismaClient } from "@prisma/client";

// declare global {
//   var prisma: PrismaClient | undefined;
// }

// export const prisma =
//   global.prisma ||
//   new PrismaClient({
//     log: ["query", "error", "warn"],
//   });

// if (process.env.NODE_ENV !== "production") {
//   global.prisma = prisma;
// }

// export default prisma;

