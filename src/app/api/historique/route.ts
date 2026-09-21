// app/api/historique/route.ts
//
// GET /api/historique
//
// Liste paginée et filtrée du journal d'audit. Paramètres de requête :
//   page         (défaut 1)
//   pageSize     (défaut 20, max 100)
//   search       recherche libre (nom d'utilisateur, action, entité, élément)
//   module       filtre par entité : "Bien" | "Utilisateur" | ... | "tous"
//   action       filtre par action : "CREATION" | "MODIFICATION" | ... | "toutes"
//   userId       filtre par utilisateur, ou "tous"
//   periode      "aujourdhui" | "semaine" | "mois" | "annee" | "personnalisee" | "tout"
//   dateDebut    ISO date (requis si periode = personnalisee)
//   dateFin      ISO date (requis si periode = personnalisee)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getPlageDates, type PeriodeFiltre } from "@/app/lib/historique-labels";

function safeParse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extraireNomElement(entry: {
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
}): string | null {
  const apres = safeParse(entry.nouvelleValeur);
  const avant = safeParse(entry.ancienneValeur);
  const nom = (apres?.nom ?? avant?.nom) as string | undefined;
  return nom ?? null;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));
  const search = searchParams.get("search")?.trim() ?? "";
  const module = searchParams.get("module") ?? "tous";
  const action = searchParams.get("action") ?? "toutes";
  const userId = searchParams.get("userId") ?? "tous";
  const periode = (searchParams.get("periode") ?? "tout") as PeriodeFiltre;
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");

  const where: Prisma.HistoriqueWhereInput = {};

  if (module !== "tous") where.entite = module;
  if (action !== "toutes") where.action = action;
  if (userId !== "tous") where.userId = userId;

  const plage = getPlageDates(periode, dateDebut, dateFin);
  if (plage) where.date = { gte: plage.debut, lte: plage.fin };

  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entite: { contains: search, mode: "insensitive" } },
      { entiteId: { contains: search, mode: "insensitive" } },
      { ancienneValeur: { contains: search, mode: "insensitive" } },
      { nouvelleValeur: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { prenom: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [total, entries] = await Promise.all([
    prisma.historique.count({ where }),
    prisma.historique.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
      },
    }),
  ]);

  const data = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    action: entry.action,
    entite: entry.entite,
    entiteId: entry.entiteId,
    nomElement: extraireNomElement(entry),
    utilisateur: entry.user
      ? {
          id: entry.user.id,
          nomComplet: `${entry.user.prenom} ${entry.user.nom}`.trim(),
          email: entry.user.email,
          role: entry.user.role,
        }
      : null,
  }));

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}







// // src/app/api/historique/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const search   = searchParams.get("search")  || "";
//     const entite   = searchParams.get("entite")  || "";
//     const action   = searchParams.get("action")  || "";
//     const userId   = searchParams.get("userId")  || "";
//     const dateFrom = searchParams.get("from")    || "";
//     const dateTo   = searchParams.get("to")      || "";
//     const limit    = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
//     const page     = Math.max(parseInt(searchParams.get("page")  || "1"), 1);
//     const skip     = (page - 1) * limit;

//     const where: any = {};

//     if (entite)  where.entite = entite;
//     if (action)  where.action = action;
//     if (userId)  where.userId = userId;

//     if (dateFrom || dateTo) {
//       where.date = {};
//       if (dateFrom) where.date.gte = new Date(dateFrom);
//       if (dateTo)   where.date.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
//     }

//     if (search) {
//       where.OR = [
//         { action:        { contains: search, mode: "insensitive" } },
//         { entite:        { contains: search, mode: "insensitive" } },
//         { nouvelleValeur:{ contains: search, mode: "insensitive" } },
//         { ancienneValeur:{ contains: search, mode: "insensitive" } },
//         { user: { nom:   { contains: search, mode: "insensitive" } } },
//         { user: { prenom:{ contains: search, mode: "insensitive" } } },
//       ];
//     }

//     const [total, historiques] = await Promise.all([
//       prisma.historique.count({ where }),
//       prisma.historique.findMany({
//         where,
//         orderBy: { date: "desc" },
//         skip,
//         take: limit,
//         include: {
//           user: {
//             select: {
//               id:     true,
//               nom:    true,
//               prenom: true,
//               email:  true,
//               role:   true,
//               departement: { select: { id: true, nom: true } },
//             },
//           },
//         },
//       }),
//     ]);

//     // Stats for the filters panel
//     const [actionCounts, entiteCounts] = await Promise.all([
//       prisma.historique.groupBy({
//         by:      ["action"],
//         _count:  { id: true },
//         orderBy: { _count: { id: "desc" } },
//       }),
//       prisma.historique.groupBy({
//         by:      ["entite"],
//         _count:  { id: true },
//         orderBy: { _count: { id: "desc" } },
//       }),
//     ]);

//     return NextResponse.json({
//       data:  historiques,
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//       stats: {
//         actions: actionCounts.map(a => ({ label: a.action, count: a._count.id })),
//         entites: entiteCounts.map(e => ({ label: e.entite, count: e._count.id })),
//       },
//     });
//   } catch (err: any) {
//     console.error("[GET /api/historique] Error", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // POST — enregistrer une nouvelle entrée d'historique
// export async function POST(req: NextRequest) {
//   try {
//     const { userId, entiteId, action, entite, ancienneValeur, nouvelleValeur } = await req.json();

//     if (!userId || !action || !entite) {
//       return NextResponse.json(
//         { error: "userId, action et entite sont obligatoires." },
//         { status: 400 }
//       );
//     }

//     const entry = await prisma.historique.create({
//       data: {
//         userId,
//         entiteId:      entiteId      || null,
//         action,
//         entite,
//         ancienneValeur: ancienneValeur ? JSON.stringify(ancienneValeur) : null,
//         nouvelleValeur: nouvelleValeur ? JSON.stringify(nouvelleValeur) : null,
//       },
//       include: {
//         user: { select: { id: true, nom: true, prenom: true, email: true } },
//       },
//     });

//     return NextResponse.json(entry, { status: 201 });
//   } catch (err: any) {
//     console.error("[POST /api/historique] Error", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }
