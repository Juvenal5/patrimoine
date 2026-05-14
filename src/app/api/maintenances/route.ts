// src/app/api/maintenances/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search  = searchParams.get("search") || "";
    const statut  = searchParams.get("statut") || "";
    const type    = searchParams.get("type")   || "";
    const bienId  = searchParams.get("bienId") || "";
    const limit   = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const page    = Math.max(parseInt(searchParams.get("page")  || "1"), 1);
    const skip    = (page - 1) * limit;

    const where: any = {};
    if (statut) where.statut = statut;
    if (type)   where.type   = type;
    if (bienId) where.bienId = bienId;
    if (search) {
      where.OR = [
        { description:  { contains: search, mode: "insensitive" } },
        { type:         { contains: search, mode: "insensitive" } },
        { bien: { nom:  { contains: search, mode: "insensitive" } } },
        { bien: { codeInventaire: { contains: search, mode: "insensitive" } } },
        { fournisseur: { nom: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, maintenances, statsRaw, coutAgg] = await Promise.all([
      prisma.maintenance.count({ where }),
      prisma.maintenance.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          bien: {
            select: {
              id: true, codeInventaire: true, nom: true,
              categorie: true, etat: true, localisation: true,
              departement: { select: { id: true, nom: true } },
            },
          },
          fournisseur: { select: { id: true, nom: true, email: true, telephone: true } },
        },
      }),
      prisma.maintenance.groupBy({ by: ["statut"], _count: { id: true }, _sum: { cout: true } }),
      prisma.maintenance.aggregate({ where, _sum: { cout: true } }),
    ]);

    return NextResponse.json({
      data:      maintenances,
      total,
      page,
      pages:     Math.ceil(total / limit),
      coutTotal: coutAgg._sum.cout ?? 0,
      stats:     statsRaw.map(s => ({ statut: s.statut || "inconnu", count: s._count.id, cout: s._sum.cout ?? 0 })),
    });
  } catch (err: any) {
    console.error("[GET /api/maintenances]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bienId, fournisseurId, technicienId, type, description, dateDebut, dateFin, cout, statut, prochaineMaintenance } = body;

    if (!bienId) return NextResponse.json({ error: "bienId est obligatoire." }, { status: 400 });

    const bien = await prisma.bien.findFirst({ where: { id: bienId, deletedAt: null } });
    if (!bien) return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });

    let validFournisseurId: string | null = null;
    if (fournisseurId) {
      const f = await prisma.fournisseur.findUnique({ where: { id: fournisseurId }, select: { id: true } });
      validFournisseurId = f?.id ?? null;
    }

    const maintenance = await prisma.maintenance.create({
      data: {
        bienId,
        fournisseurId:       validFournisseurId,
        technicienId:        technicienId || null,
        type:                type         || null,
        description:         description  || null,
        dateDebut:           dateDebut    ? new Date(dateDebut)            : null,
        dateFin:             dateFin      ? new Date(dateFin)              : null,
        cout:                cout != null ? parseFloat(cout)               : null,
        statut:              statut       || "en_cours",
        prochaineMaintenance: prochaineMaintenance ? new Date(prochaineMaintenance) : null,
      },
      include: {
        bien:        { select: { id: true, codeInventaire: true, nom: true, categorie: true, etat: true, departement: { select: { id: true, nom: true } } } },
        fournisseur: { select: { id: true, nom: true, email: true, telephone: true } },
      },
    });

    // Passe le bien en maintenance si pas encore terminé
    if (statut !== "termine") {
      await prisma.bien.update({ where: { id: bienId }, data: { etat: "maintenance" } });
    }

    return NextResponse.json(maintenance, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/maintenances]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}