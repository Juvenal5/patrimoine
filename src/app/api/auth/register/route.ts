import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { nom, prenom, email, password, telephone, departementId } =
      await req.json();

    if (!nom || !prenom || !email || !password) {
      return NextResponse.json(
        { error: "Nom, prénom, email et mot de passe sont requis" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        password: hashedPassword,
        telephone: telephone || null,
        departementId: departementId || null,
        role: "USER",
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
        createdAt: true,
        departement: { select: { nom: true } },
      },
    });

    // Enregistrement dans l'historique
    await prisma.historique.create({
      data: {
        userId: user.id,
        action: "CREATION_COMPTE",
        entite: "User",
        entiteId: user.id,
        nouvelleValeur: JSON.stringify({ email: user.email, nom: user.nom, prenom: user.prenom }),
      },
    });

    return NextResponse.json(
      { message: "Compte créé avec succès", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}