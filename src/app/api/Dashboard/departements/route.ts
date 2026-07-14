// src/app/api/Dashboard/departements/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const departements = await prisma.departement.findMany({
      orderBy: { nom: "asc" },
      select: {
        id:          true,
        nom:         true,
        description: true,
        biens: {
          where:  { deletedAt: null },
          select: {
            id:          true,
            etat:        true,
            valeurAchat: true,
            categorie:   true,
          },
        },
        users: {
          where:  { actif: true },
          select: { id: true },
        },
      },
    });

    const result = departements.map(d => {
      const valeurTotale = d.biens.reduce((s, b) => s + (b.valeurAchat ?? 0), 0);
      const etatCounts   = d.biens.reduce<Record<string, number>>((acc, b) => {
        const e = b.etat || "inconnu";
        acc[e] = (acc[e] ?? 0) + 1;
        return acc;
      }, {});

      return {
        id:            d.id,
        nom:           d.nom,
        description:   d.description,
        totalBiens:    d.biens.length,
        totalUsers:    d.users.length,
        valeurTotale,
        etatCounts,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[dashboard/departements] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

