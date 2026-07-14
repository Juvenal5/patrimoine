// src/app/api/Utilisateurs/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// IMPORTANT
type Params = {
  params: Promise<{ id: string }>;
};

// ── GET /api/Utilisateurs/[id] ────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    // IMPORTANT
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },

      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
        updatedAt: true,
        departementId: true,

        departement: {
          select: {
            id: true,
            nom: true,
            description: true,
          },
        },

        affectations: {
          orderBy: {
            dateAffectation: "desc",
          },

          take: 20,

          select: {
            id: true,
            statut: true,
            dateAffectation: true,
            datePrevisionRetour: true,
            dateRetour: true,
            commentaire: true,

            bien: {
              select: {
                id: true,
                codeInventaire: true,
                nom: true,
                categorie: true,
                etat: true,

                departement: {
                  select: {
                    id: true,
                    nom: true,
                  },
                },
              },
            },
          },
        },

        historiques: {
          orderBy: {
            date: "desc",
          },

          take: 10,

          select: {
            id: true,
            action: true,
            entite: true,
            ancienneValeur: true,
            nouvelleValeur: true,
            date: true,
          },
        },

        _count: {
          select: {
            affectations: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (err: any) {
    console.error("[GET /api/Utilisateurs/[id]]", err);

    return NextResponse.json(
      { error: err.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

// ── PUT /api/Utilisateurs/[id] ────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  try {
    // IMPORTANT
    const { id } = await params;

    const body = await req.json();

    const {
      nom,
      prenom,
      email,
      telephone,
      role,
      actif,
      departementId,
      password,
    } = body;

    if (!nom?.trim() || !prenom?.trim() || !email?.trim()) {
      return NextResponse.json(
        {
          error: "Nom, prénom et email sont obligatoires.",
        },
        {
          status: 400,
        }
      );
    }

    // Vérifier unicité email
    const existing = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),

        NOT: {
          id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "Cet email est déjà utilisé.",
        },
        {
          status: 409,
        }
      );
    }

    const data: any = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.trim().toLowerCase(),
      telephone: telephone?.trim() || null,
      role: role === "ADMIN" ? "ADMIN" : "USER",
      actif: actif !== false,
      departementId: departementId || null,
    };

    // Changer mot de passe
    if (password?.trim()) {
      data.password = await bcrypt.hash(
        password.trim(),
        10
      );
    }

    const user = await prisma.user.update({
      where: { id },

      data,

      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
        updatedAt: true,

        departement: {
          select: {
            id: true,
            nom: true,
          },
        },

        _count: {
          select: {
            affectations: true,
          },
        },
      },
    });

    return NextResponse.json(user);

  } catch (err: any) {
    console.error("[PUT /api/Utilisateurs/[id]]", err);

    return NextResponse.json(
      { error: err.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/Utilisateurs/[id] ─────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    // IMPORTANT
    const { id } = await params;

    const { searchParams } = new URL(req.url);

    const force =
      searchParams.get("force") === "true";

    const affCount =
      await prisma.affectation.count({
        where: {
          userId: id,
        },
      });

    if (affCount > 0 && !force) {
      // Désactivation douce
      const user = await prisma.user.update({
        where: { id },

        data: {
          actif: false,
        },

        select: {
          id: true,
          nom: true,
          prenom: true,
          actif: true,
        },
      });

      return NextResponse.json({
        deactivated: true,

        message:
          `L'utilisateur a ${affCount} affectation(s) — il a été désactivé plutôt que supprimé.`,

        user,
      });
    }

    // Supprimer historiques
    await prisma.historique.deleteMany({
      where: {
        userId: id,
      },
    });

    // Supprimer utilisateur
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      deleted: true,
    });

  } catch (err: any) {
    console.error("[DELETE /api/Utilisateurs/[id]]", err);

    return NextResponse.json(
      { error: err.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
