// app/api/historique/meta/route.ts
//
// GET /api/historique/meta
// Fournit les listes utilisées pour remplir les menus déroulants de filtres :
// modules (entités) réellement présents en base, actions réellement
// présentes, et la liste des utilisateurs ayant au moins une entrée
// d'historique — plutôt que d'exposer des enums statiques, on ne propose que
// ce qui existe vraiment, pour que les filtres restent toujours pertinents.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { prisma } from "@/app/lib/prisma";
import {
  ACTION_LABELS,
  ENTITE_LABELS,
  type HistoriqueAction,
  type HistoriqueEntite,
} from "@/app/lib/historique-labels";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const [modulesDistincts, actionsDistinctes, utilisateurs] = await Promise.all([
    prisma.historique.findMany({ distinct: ["entite"], select: { entite: true } }),
    prisma.historique.findMany({ distinct: ["action"], select: { action: true } }),
    prisma.user.findMany({
      where: { historiques: { some: {} } },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ prenom: "asc" }, { nom: "asc" }],
    }),
  ]);

  const modules = modulesDistincts.map((m) => ({
    valeur: m.entite,
    libelle: ENTITE_LABELS[m.entite as HistoriqueEntite] ?? m.entite,
  }));

  const actions = actionsDistinctes.map((a) => ({
    valeur: a.action,
    libelle: ACTION_LABELS[a.action as HistoriqueAction] ?? a.action,
  }));

  return NextResponse.json({
    modules,
    actions,
    utilisateurs: utilisateurs.map((u) => ({
      id: u.id,
      nomComplet: `${u.prenom} ${u.nom}`.trim(),
    })),
  });
}