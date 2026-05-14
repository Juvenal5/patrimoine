// src/app/api/fournisseurs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const f = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        biens: {
          where:  { deletedAt: null },
          select: {
            id: true, codeInventaire: true, nom: true,
            categorie: true, etat: true, valeurAchat: true,
            departement: { select: { id: true, nom: true } },
          },
        },
        maintenances: {
          orderBy: { createdAt: "desc" },
          include: {
            bien: { select: { id: true, nom: true, codeInventaire: true } },
          },
        },
      },
    });
    if (!f) return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });
    return NextResponse.json(f);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.fournisseur.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });

    const { nom, email, telephone, adresse, type, contratDebut, contratFin } = await req.json();

    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
    }

    const updated = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom:         nom.trim(),
        email:       email       !== undefined ? (email || null)     : existing.email,
        telephone:   telephone   !== undefined ? (telephone || null) : existing.telephone,
        adresse:     adresse     !== undefined ? (adresse || null)   : existing.adresse,
        type:        type        !== undefined ? (type || null)      : existing.type,
        contratDebut: contratDebut !== undefined
          ? (contratDebut ? new Date(contratDebut) : null)
          : existing.contratDebut,
        contratFin:   contratFin !== undefined
          ? (contratFin ? new Date(contratFin) : null)
          : existing.contratFin,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.fournisseur.findUnique({
      where: { id },
      include: {
        biens:        { where: { deletedAt: null }, select: { id: true } },
        maintenances: { select: { id: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });

    if (existing.biens.length > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${existing.biens.length} bien(s) lié(s). Réaffectez-les d'abord.` },
        { status: 409 }
      );
    }

    // Détache les maintenances avant suppression
    if (existing.maintenances.length > 0) {
      await prisma.maintenance.updateMany({
        where: { fournisseurId: id },
        data:  { fournisseurId: null },
      });
    }

    await prisma.fournisseur.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}