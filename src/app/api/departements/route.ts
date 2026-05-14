// src/app/api/departements/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { nom:         { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const departements = await prisma.departement.findMany({
      where,
      orderBy: { nom: "asc" },
      include: {
        users: {
          where:  { actif: true },
          select: { id: true, nom: true, prenom: true, email: true, role: true },
        },
        biens: {
          where:  { deletedAt: null },
          select: { id: true, etat: true, valeurAchat: true, categorie: true },
        },
      },
    });

    // Enrichit chaque département avec des stats calculées
    const result = departements.map(d => ({
      id:          d.id,
      nom:         d.nom,
      description: d.description,
      createdAt:   d.createdAt,
      responsableId: d.responsableId,
      stats: {
        totalUsers:    d.users.length,
        totalBiens:    d.biens.length,
        biensActifs:   d.biens.filter(b => b.etat === "actif").length,
        biensMaint:    d.biens.filter(b => b.etat === "maintenance").length,
        biensInactifs: d.biens.filter(b => b.etat === "inactif").length,
        valeurTotale:  d.biens.reduce((s, b) => s + (b.valeurAchat ?? 0), 0),
        categories:    [...new Set(d.biens.map(b => b.categorie).filter(Boolean))],
      },
      users: d.users,
      biens: d.biens,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GET /api/departements] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nom, description, responsableId } = await req.json();

    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
    }

    // Vérifie unicité du nom
    const existing = await prisma.departement.findFirst({
      where: { nom: { equals: nom.trim(), mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Un département nommé "${nom.trim()}" existe déjà.` },
        { status: 409 }
      );
    }

    const dept = await prisma.departement.create({
      data: {
        nom:         nom.trim(),
        description: description?.trim() || null,
        responsableId: responsableId || null,
      },
      include: {
        users: { select: { id: true, nom: true, prenom: true } },
        biens: { where: { deletedAt: null }, select: { id: true } },
      },
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/departements] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}






// src/app/api/departements/route.ts
// import { NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";

// export async function GET() {
//   try {
//     const departements = await prisma.departement.findMany({
//       orderBy: { nom: "asc" },
//       select: {
//         id:          true,
//         nom:         true,
//         description: true,
//         _count:      { select: { biens: true, users: true } },
//       },
//     });
//     return NextResponse.json(departements);
//   } catch (err: any) {
//     console.error("[GET /api/departements] Error", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }