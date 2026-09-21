// app/api/historique/export/route.ts
//
// GET /api/historique/export
// Exporte au format CSV les entrées correspondant aux mêmes filtres que
// GET /api/historique (search, module, action, userId, periode, dateDebut,
// dateFin), sans pagination — jusqu'à 5000 lignes par export.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  ACTION_LABELS,
  ENTITE_LABELS,
  getPlageDates,
  type HistoriqueAction,
  type HistoriqueEntite,
  type PeriodeFiltre,
} from "@/app/lib/historique-labels";

function safeParse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function echapperCSV(valeur: string): string {
  if (/[",\n;]/.test(valeur)) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
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
      { ancienneValeur: { contains: search, mode: "insensitive" } },
      { nouvelleValeur: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { prenom: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const entries = await prisma.historique.findMany({
    where,
    orderBy: { date: "desc" },
    take: 5000,
    include: { user: { select: { nom: true, prenom: true, email: true } } },
  });

  const entetes = [
    "Date",
    "Heure",
    "Utilisateur",
    "Email",
    "Action",
    "Module",
    "Élément",
    "Ancienne valeur",
    "Nouvelle valeur",
  ];

  const lignes = entries.map((entry) => {
    const avant = safeParse(entry.ancienneValeur);
    const apres = safeParse(entry.nouvelleValeur);
    const nom = (apres?.nom ?? avant?.nom ?? entry.entiteId ?? "") as string;

    return [
      entry.date.toLocaleDateString("fr-FR"),
      entry.date.toLocaleTimeString("fr-FR"),
      entry.user ? `${entry.user.prenom} ${entry.user.nom}` : "",
      entry.user?.email ?? "",
      ACTION_LABELS[entry.action as HistoriqueAction] ?? entry.action,
      ENTITE_LABELS[entry.entite as HistoriqueEntite] ?? entry.entite,
      nom,
      entry.ancienneValeur ?? "",
      entry.nouvelleValeur ?? "",
    ]
      .map((valeur) => echapperCSV(String(valeur)))
      .join(";");
  });

  const csv = "\uFEFF" + [entetes.join(";"), ...lignes].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historique-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}