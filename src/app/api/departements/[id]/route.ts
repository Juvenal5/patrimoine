// src/app/api/departements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const dept = await prisma.departement.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true, nom: true, prenom: true, email: true,
            telephone: true, role: true, actif: true,
          },
        },
        biens: {
          where:  { deletedAt: null },
          select: {
            id: true, codeInventaire: true, nom: true,
            categorie: true, etat: true, valeurAchat: true, localisation: true,
          },
        },
      },
    });

    if (!dept) return NextResponse.json({ error: "Département introuvable." }, { status: 404 });
    return NextResponse.json(dept);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.departement.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Département introuvable." }, { status: 404 });

    const { nom, description, responsableId } = await req.json();

    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
    }

    // Vérifie unicité du nom (sauf pour lui-même)
    const conflict = await prisma.departement.findFirst({
      where: {
        nom: { equals: nom.trim(), mode: "insensitive" },
        NOT: { id },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Un département nommé "${nom.trim()}" existe déjà.` },
        { status: 409 }
      );
    }

    const dept = await prisma.departement.update({
      where: { id },
      data: {
        nom:          nom.trim(),
        description:  description?.trim() ?? existing.description,
        responsableId: responsableId !== undefined ? (responsableId || null) : existing.responsableId,
      },
      include: {
        users: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
        biens: { where: { deletedAt: null }, select: { id: true, etat: true, valeurAchat: true } },
      },
    });

    return NextResponse.json(dept);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.departement.findUnique({
      where: { id },
      include: {
        biens: { where: { deletedAt: null }, select: { id: true } },
        users: { where: { actif: true },     select: { id: true } },
      },
    });

    if (!existing) return NextResponse.json({ error: "Département introuvable." }, { status: 404 });

    // Bloque la suppression si des utilisateurs ou biens actifs sont rattachés
    if (existing.users.length > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${existing.users.length} utilisateur(s) rattaché(s). Réaffectez-les d'abord.` },
        { status: 409 }
      );
    }
    if (existing.biens.length > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${existing.biens.length} bien(s) rattaché(s). Réaffectez-les d'abord.` },
        { status: 409 }
      );
    }

    await prisma.departement.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}