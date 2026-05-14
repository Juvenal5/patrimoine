// src/app/api/biens/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// Next.js 15 : params est une Promise — il faut l'awaiter
type Params = { params: Promise<{ id: string }> };

// ── GET /api/biens/:id ────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const bien = await prisma.bien.findFirst({
      where: { id, deletedAt: null },
      include: {
        departement: { select: { id: true, nom: true } },
        fournisseur: { select: { id: true, nom: true } },
        affectations: {
          orderBy: { dateAffectation: "desc" },
          include: {
            user: { select: { id: true, nom: true, prenom: true, email: true } },
          },
        },
        maintenances: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!bien) return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });
    return NextResponse.json(bien);
  } catch (err: any) {
    console.error("[GET /api/biens/:id] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT /api/biens/:id ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.bien.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });

    const body = await req.json();
    const {
      codeInventaire,
      nom,
      description,
      type,
      categorie,
      numeroSerie,
      departementId,
      fournisseurId,
      dateAcquisition,
      dateMiseService,
      valeurAchat,
      garantieFin,
      etat,
      localisation,
    } = body;

    // Vérifie unicité du code si changé
    if (codeInventaire && codeInventaire !== existing.codeInventaire) {
      const conflict = await prisma.bien.findUnique({ where: { codeInventaire } });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: `Le code inventaire "${codeInventaire}" est déjà utilisé.` },
          { status: 409 }
        );
      }
    }

    // Valide departementId : doit être un UUID existant ou null
    let validDepartementId: string | null = existing.departementId;
    if (departementId !== undefined) {
      if (!departementId) {
        validDepartementId = null;
      } else {
        const dept = await prisma.departement.findUnique({
          where: { id: departementId },
          select: { id: true },
        });
        validDepartementId = dept?.id ?? null; // si UUID invalide → null (pas d'erreur FK)
      }
    }

    const updated = await prisma.bien.update({
      where: { id },                             // ✅ id est maintenant résolu via await params
      data: {
        ...(codeInventaire && { codeInventaire }),
        ...(nom            && { nom: nom.trim() }),
        description:     description     ?? existing.description,
        type:            type            ?? existing.type,
        categorie:       categorie       ?? existing.categorie,
        numeroSerie:     numeroSerie     ?? existing.numeroSerie,
        departementId:   validDepartementId,
        fournisseurId:   fournisseurId !== undefined
          ? (fournisseurId || null)
          : existing.fournisseurId,
        dateAcquisition: dateAcquisition !== undefined
          ? (dateAcquisition ? new Date(dateAcquisition) : null)
          : existing.dateAcquisition,
        dateMiseService: dateMiseService !== undefined
          ? (dateMiseService ? new Date(dateMiseService) : null)
          : existing.dateMiseService,
        valeurAchat: valeurAchat !== undefined
          ? (valeurAchat != null ? parseFloat(valeurAchat) : null)
          : existing.valeurAchat,
        garantieFin: garantieFin !== undefined
          ? (garantieFin ? new Date(garantieFin) : null)
          : existing.garantieFin,
        etat:         etat         ?? existing.etat,
        localisation: localisation !== undefined ? localisation : existing.localisation,
      },
      include: {
        departement: { select: { id: true, nom: true } },
        affectations: {
          where:   { dateRetour: null },
          take:    1,
          include: { user: { select: { id: true, nom: true, prenom: true } } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/biens/:id] Error", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Ce code inventaire existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/biens/:id  (soft delete) ──────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const existing = await prisma.bien.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });

    await prisma.bien.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("[DELETE /api/biens/:id] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}