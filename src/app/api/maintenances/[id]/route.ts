// src/app/api/maintenances/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const m = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        bien: {
          select: {
            id: true, codeInventaire: true, nom: true, categorie: true,
            etat: true, localisation: true, valeurAchat: true,
            departement: { select: { id: true, nom: true } },
          },
        },
        fournisseur: { select: { id: true, nom: true, email: true, telephone: true, adresse: true } },
      },
    });
    if (!m) return NextResponse.json({ error: "Maintenance introuvable." }, { status: 404 });
    return NextResponse.json(m);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.maintenance.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Maintenance introuvable." }, { status: 404 });

    const body = await req.json();
    const { fournisseurId, technicienId, type, description, dateDebut, dateFin, cout, statut, prochaineMaintenance } = body;

    let validFournisseurId = existing.fournisseurId;
    if (fournisseurId !== undefined) {
      if (!fournisseurId) {
        validFournisseurId = null;
      } else {
        const f = await prisma.fournisseur.findUnique({ where: { id: fournisseurId }, select: { id: true } });
        validFournisseurId = f?.id ?? null;
      }
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        fournisseurId:       validFournisseurId,
        technicienId:        technicienId !== undefined ? (technicienId || null) : existing.technicienId,
        type:                type         !== undefined ? (type || null)         : existing.type,
        description:         description  !== undefined ? (description || null)  : existing.description,
        dateDebut:           dateDebut    !== undefined ? (dateDebut ? new Date(dateDebut) : null) : existing.dateDebut,
        dateFin:             dateFin      !== undefined ? (dateFin   ? new Date(dateFin)   : null) : existing.dateFin,
        cout:                cout         !== undefined ? (cout != null ? parseFloat(cout) : null) : existing.cout,
        statut:              statut       ?? existing.statut,
        prochaineMaintenance: prochaineMaintenance !== undefined
          ? (prochaineMaintenance ? new Date(prochaineMaintenance) : null)
          : existing.prochaineMaintenance,
      },
      include: {
        bien:        { select: { id: true, codeInventaire: true, nom: true, categorie: true, etat: true, departement: { select: { id: true, nom: true } } } },
        fournisseur: { select: { id: true, nom: true, email: true, telephone: true } },
      },
    });

    // Si terminé → repasse le bien en actif
    if (statut === "termine" && existing.statut !== "termine") {
      await prisma.bien.update({ where: { id: existing.bienId }, data: { etat: "actif" } });
    }
    // Si réouvert depuis terminé → repasse en maintenance
    if (statut !== "termine" && existing.statut === "termine") {
      await prisma.bien.update({ where: { id: existing.bienId }, data: { etat: "maintenance" } });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/maintenances/:id]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.maintenance.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Maintenance introuvable." }, { status: 404 });

    await prisma.maintenance.delete({ where: { id } });

    // Si c'était la seule maintenance en cours, repasse le bien en actif
    const remaining = await prisma.maintenance.count({
      where: { bienId: existing.bienId, statut: { not: "termine" } },
    });
    if (remaining === 0) {
      await prisma.bien.update({ where: { id: existing.bienId }, data: { etat: "actif" } });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("[DELETE /api/maintenances/:id]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}