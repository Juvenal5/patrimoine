// src/app/api/biens/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// ── GET /api/biens ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search    = searchParams.get("search")    || "";
    const categorie = searchParams.get("categorie") || "";
    const etat      = searchParams.get("etat")      || "";
    const sortKey   = searchParams.get("sortKey")   || "createdAt";
    const sortDir   = searchParams.get("sortDir")   === "asc" ? "asc" : "desc";
    const limit     = parseInt(searchParams.get("limit") || "200", 10);

    const where: any = { deletedAt: null };
    if (etat)      where.etat      = etat;
    if (categorie) where.categorie = categorie;
    if (search) {
      where.OR = [
        { nom:            { contains: search, mode: "insensitive" } },
        { codeInventaire: { contains: search, mode: "insensitive" } },
        { type:           { contains: search, mode: "insensitive" } },
        { categorie:      { contains: search, mode: "insensitive" } },
        { numeroSerie:    { contains: search, mode: "insensitive" } },
        { departement:    { nom: { contains: search, mode: "insensitive" } } },
      ];
    }

    const sortMap: Record<string, any> = {
      id:          { codeInventaire: sortDir },
      designation: { nom: sortDir },
      categorie:   { categorie: sortDir },
      departement: { departement: { nom: sortDir } },
      valeur:      { valeurAchat: sortDir },
      status:      { etat: sortDir },
      dateAchat:   { dateAcquisition: sortDir },
      createdAt:   { createdAt: sortDir },
    };
    const orderBy = sortMap[sortKey] ?? { createdAt: "desc" };

    const biens = await prisma.bien.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        departement: { select: { id: true, nom: true } },
        fournisseur: { select: { id: true, nom: true } },
        affectations: {
          where:   { dateRetour: null },
          orderBy: { dateAffectation: "desc" },
          take:    1,
          include: { user: { select: { id: true, nom: true, prenom: true } } },
        },
      },
    });

    return NextResponse.json(biens);
  } catch (err: any) {
    console.error("[GET /api/biens] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/biens ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
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

    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
    }

    // ── Auto-génération du code inventaire ──────────────────────────────────
    let code = codeInventaire?.trim();
    if (!code) {
      const count = await prisma.bien.count();
      let suffix = count + 1;
      code = `BN-${String(suffix).padStart(4, "0")}`;
      while (await prisma.bien.findUnique({ where: { codeInventaire: code } })) {
        suffix++;
        code = `BN-${String(suffix).padStart(4, "0")}`;
      }
    } else {
      const existing = await prisma.bien.findUnique({ where: { codeInventaire: code } });
      if (existing) {
        return NextResponse.json(
          { error: `Le code inventaire "${code}" est déjà utilisé.` },
          { status: 409 }
        );
      }
    }

    // ── Validation departementId ────────────────────────────────────────────
    // Seul un UUID existant en base est accepté. Chaîne texte = null (pas de crash FK).
    let validDepartementId: string | null = null;
    if (departementId) {
      const dept = await prisma.departement.findUnique({
        where:  { id: departementId },
        select: { id: true },
      });
      validDepartementId = dept?.id ?? null;
    }

    // ── Validation fournisseurId ────────────────────────────────────────────
    let validFournisseurId: string | null = null;
    if (fournisseurId) {
      const four = await prisma.fournisseur.findUnique({
        where:  { id: fournisseurId },
        select: { id: true },
      });
      validFournisseurId = four?.id ?? null;
    }

    const bien = await prisma.bien.create({
      data: {
        codeInventaire:  code,
        nom:             nom.trim(),
        description:     description  || null,
        type:            type         || null,
        categorie:       categorie    || null,
        numeroSerie:     numeroSerie  || null,
        departementId:   validDepartementId,  // ✅ UUID vérifié ou null
        fournisseurId:   validFournisseurId,  // ✅ UUID vérifié ou null
        dateAcquisition: dateAcquisition ? new Date(dateAcquisition) : null,
        dateMiseService: dateMiseService ? new Date(dateMiseService) : null,
        valeurAchat:     valeurAchat != null ? parseFloat(valeurAchat) : null,
        garantieFin:     garantieFin ? new Date(garantieFin) : null,
        etat:            etat         || "actif",
        localisation:    localisation || null,
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

    return NextResponse.json(bien, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/biens] Error", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Ce code inventaire existe déjà." }, { status: 409 });
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "Département ou fournisseur introuvable. Vérifiez votre sélection." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
