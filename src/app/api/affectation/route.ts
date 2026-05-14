// src/app/api/affectations/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// ── GET /api/affectations ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bienId  = searchParams.get("bienId")  || "";
    const userId  = searchParams.get("userId")  || "";
    const statut  = searchParams.get("statut")  || "";
    const actives = searchParams.get("actives") === "true"; // only non-returned

    const where: any = {};
    if (bienId)  where.bienId = bienId;
    if (userId)  where.userId = userId;
    if (statut)  where.statut = statut;
    if (actives) where.dateRetour = null;

    const affectations = await prisma.affectation.findMany({
      where,
      orderBy: { dateAffectation: "desc" },
      include: {
        bien: {
          select: {
            id:             true,
            codeInventaire: true,
            nom:            true,
            categorie:      true,
            etat:           true,
            localisation:   true,
            departement:    { select: { id: true, nom: true } },
          },
        },
        user: {
          select: {
            id:     true,
            nom:    true,
            prenom: true,
            email:  true,
            departement: { select: { id: true, nom: true } },
          },
        },
      },
    });

    return NextResponse.json(affectations);
  } catch (err: any) {
    console.error("[GET /api/affectations] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/affectations ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bienId, userId, dateAffectation, datePrevisionRetour, statut, commentaire } = body;

    if (!bienId || !userId || !dateAffectation) {
      return NextResponse.json(
        { error: "bienId, userId et dateAffectation sont obligatoires." },
        { status: 400 }
      );
    }

    // Check the bien exists and is not deleted
    const bien = await prisma.bien.findFirst({
      where: { id: bienId, deletedAt: null },
    });
    if (!bien) {
      return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });
    }

    // Check the user exists
    const user = await prisma.user.findFirst({ where: { id: userId, actif: true } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // Close any existing active affectation for this bien
    await prisma.affectation.updateMany({
      where:  { bienId, dateRetour: null },
      data:   { dateRetour: new Date(), statut: "termine" },
    });

    const affectation = await prisma.affectation.create({
      data: {
        bienId,
        userId,
        dateAffectation:     new Date(dateAffectation),
        datePrevisionRetour: datePrevisionRetour ? new Date(datePrevisionRetour) : null,
        statut:              statut      || "actif",
        commentaire:         commentaire || null,
      },
      include: {
        bien: {
          select: {
            id: true, codeInventaire: true, nom: true, categorie: true,
            departement: { select: { id: true, nom: true } },
          },
        },
        user: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
      },
    });

    // Mark the bien as actif if it wasn't
    if (bien.etat !== "actif") {
      await prisma.bien.update({
        where: { id: bienId },
        data:  { etat: "actif" },
      });
    }

    return NextResponse.json(affectation, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/affectations] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}