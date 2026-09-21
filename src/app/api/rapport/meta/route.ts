import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// ─── GET /api/rapports/meta ─────────────────────────────────────────────────
export async function GET() {
  try {
    const [departements, categoriesRows, statutsRows] = await Promise.all([
      prisma.departement.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
      prisma.bien.findMany({
        where: { deletedAt: null, NOT: { categorie: null } },
        distinct: ["categorie"],
        select: { categorie: true },
      }),
      prisma.bien.findMany({
        where: { deletedAt: null, NOT: { etat: null } },
        distinct: ["etat"],
        select: { etat: true },
      }),
    ]);

    return NextResponse.json({
      departements,
      categories: categoriesRows.map((c) => c.categorie).filter(Boolean),
      statuts: statutsRows.map((s) => s.etat).filter(Boolean),
    });
  } catch (err) {
    console.error("GET /api/rapports/meta error:", err);
    return NextResponse.json({ error: "Erreur lors du chargement des filtres." }, { status: 500 });
  }
}