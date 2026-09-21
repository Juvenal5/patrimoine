import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// ─── GET /api/rapports/historique ───────────────────────────────────────────
export async function GET() {
  try {
    const rapports = await prisma.rapportGenere.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { nom: true, prenom: true } } },
    });

    return NextResponse.json(
      rapports.map((r) => ({
        id: r.id,
        nom: r.nom,
        type: r.type,
        format: r.format,
        createdAt: r.createdAt,
        utilisateur: `${r.user.prenom} ${r.user.nom}`,
        periodeDebut: r.periodeDebut,
        periodeFin: r.periodeFin,
      }))
    );
  } catch (err) {
    console.error("GET /api/rapports/historique error:", err);
    return NextResponse.json({ error: "Erreur lors du chargement de l'historique." }, { status: 500 });
  }
}