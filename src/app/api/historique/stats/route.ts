// app/api/historique/stats/route.ts
//
// GET /api/historique/stats
// Alimente les 4 cartes en haut de la page Historique : total, aujourd'hui,
// cette semaine, utilisateurs actifs (utilisateurs distincts ayant réalisé
// au moins une action au cours des 7 derniers jours).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const maintenant = new Date();

  const debutJour = new Date(maintenant);
  debutJour.setHours(0, 0, 0, 0);

  const debutSemaine = new Date(maintenant);
  const jour = debutSemaine.getDay() === 0 ? 7 : debutSemaine.getDay();
  debutSemaine.setDate(debutSemaine.getDate() - (jour - 1));
  debutSemaine.setHours(0, 0, 0, 0);

  const [total, aujourdHui, cetteSemaine, utilisateursActifsGroup] = await Promise.all([
    prisma.historique.count(),
    prisma.historique.count({ where: { date: { gte: debutJour } } }),
    prisma.historique.count({ where: { date: { gte: debutSemaine } } }),
    prisma.historique.groupBy({
      by: ["userId"],
      where: { date: { gte: debutSemaine } },
    }),
  ]);

  return NextResponse.json({
    total,
    aujourdHui,
    cetteSemaine,
    utilisateursActifs: utilisateursActifsGroup.length,
  });
}