// src/app/api/historique/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search")  || "";
    const entite   = searchParams.get("entite")  || "";
    const action   = searchParams.get("action")  || "";
    const userId   = searchParams.get("userId")  || "";
    const dateFrom = searchParams.get("from")    || "";
    const dateTo   = searchParams.get("to")      || "";
    const limit    = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const page     = Math.max(parseInt(searchParams.get("page")  || "1"), 1);
    const skip     = (page - 1) * limit;

    const where: any = {};

    if (entite)  where.entite = entite;
    if (action)  where.action = action;
    if (userId)  where.userId = userId;

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo)   where.date.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    if (search) {
      where.OR = [
        { action:        { contains: search, mode: "insensitive" } },
        { entite:        { contains: search, mode: "insensitive" } },
        { nouvelleValeur:{ contains: search, mode: "insensitive" } },
        { ancienneValeur:{ contains: search, mode: "insensitive" } },
        { user: { nom:   { contains: search, mode: "insensitive" } } },
        { user: { prenom:{ contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, historiques] = await Promise.all([
      prisma.historique.count({ where }),
      prisma.historique.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id:     true,
              nom:    true,
              prenom: true,
              email:  true,
              role:   true,
              departement: { select: { id: true, nom: true } },
            },
          },
        },
      }),
    ]);

    // Stats for the filters panel
    const [actionCounts, entiteCounts] = await Promise.all([
      prisma.historique.groupBy({
        by:      ["action"],
        _count:  { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.historique.groupBy({
        by:      ["entite"],
        _count:  { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    return NextResponse.json({
      data:  historiques,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: {
        actions: actionCounts.map(a => ({ label: a.action, count: a._count.id })),
        entites: entiteCounts.map(e => ({ label: e.entite, count: e._count.id })),
      },
    });
  } catch (err: any) {
    console.error("[GET /api/historique] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — enregistrer une nouvelle entrée d'historique
export async function POST(req: NextRequest) {
  try {
    const { userId, entiteId, action, entite, ancienneValeur, nouvelleValeur } = await req.json();

    if (!userId || !action || !entite) {
      return NextResponse.json(
        { error: "userId, action et entite sont obligatoires." },
        { status: 400 }
      );
    }

    const entry = await prisma.historique.create({
      data: {
        userId,
        entiteId:      entiteId      || null,
        action,
        entite,
        ancienneValeur: ancienneValeur ? JSON.stringify(ancienneValeur) : null,
        nouvelleValeur: nouvelleValeur ? JSON.stringify(nouvelleValeur) : null,
      },
      include: {
        user: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/historique] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}





// /* -------------------------------------------------------------------------- */
// /*                     src/app/api/historiques/route.ts                       */
// /* -------------------------------------------------------------------------- */

// import { NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";

// export async function GET() {
//   try {
//     const historiques = await prisma.historique.findMany({
//       include: {
//         user: {
//           select: {
//             id: true,
//             nom: true,
//             prenom: true,
//             email: true,
//             role: true,
//           },
//         },
//       },

//       orderBy: {
//         date: "desc",
//       },
//     });

//     return NextResponse.json(historiques);
//   } catch (error) {
//     console.error(error);

//     return NextResponse.json(
//       {
//         error: "Erreur lors du chargement des historiques",
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }