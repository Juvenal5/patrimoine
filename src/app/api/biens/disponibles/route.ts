// src/app/api/biens/disponibles/route.ts
// Returns biens that are actif and have no active affectation
// Used by the Affectation page to pick a bien to assign
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search      = searchParams.get("search")      || "";
    const categorie   = searchParams.get("categorie")   || "";
    const includeTous = searchParams.get("includeTous") === "true"; // include already-assigned

    const where: any = {
      deletedAt: null,
      etat:      { not: "reforme" },
    };

    if (!includeTous) {
      where.affectations = { none: { dateRetour: null } };
    }

    if (categorie) where.categorie = categorie;

    if (search) {
      where.OR = [
        { nom:            { contains: search, mode: "insensitive" } },
        { codeInventaire: { contains: search, mode: "insensitive" } },
        { type:           { contains: search, mode: "insensitive" } },
      ];
    }

    const biens = await prisma.bien.findMany({
      where,
      orderBy: { nom: "asc" },
      take:    100,
      select: {
        id:             true,
        codeInventaire: true,
        nom:            true,
        categorie:      true,
        etat:           true,
        localisation:   true,
        departement:    { select: { id: true, nom: true } },
        affectations: {
          where:   { dateRetour: null },
          take:    1,
          include: { user: { select: { id: true, nom: true, prenom: true } } },
        },
      },
    });

    return NextResponse.json(biens);
  } catch (err: any) {
    console.error("[GET /api/biens/disponibles] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}