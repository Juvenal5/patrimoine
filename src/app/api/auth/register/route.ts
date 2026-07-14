import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma"; // ← singleton partagé, plus de new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
//  Regex email (définie une seule fois, pas recréée à chaque appel)
// ─────────────────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // ── 1. Lecture du body ──────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de la requête invalide (JSON attendu)." },
      { status: 400 }
    );
  }

  const { nom, prenom, email, password, telephone, departementId } = body as {
    nom?: string;
    prenom?: string;
    email?: string;
    password?: string;
    telephone?: string;
    departementId?: string;
  };

  // ── 2. Validation des champs obligatoires ────────────────────────────────
  if (!nom?.trim() || !prenom?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: "Nom, prénom, e-mail et mot de passe sont requis." },
      { status: 400 }
    );
  }

  const emailClean = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(emailClean)) {
    return NextResponse.json(
      { error: "Format d'e-mail invalide." },
      { status: 400 }
    );
  }

  // Bug corrigé : le message disait "8 caractères" mais la vérification
  // était < 6. On aligne sur 8 des deux côtés.
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  // ── 3. Unicité de l'e-mail ───────────────────────────────────────────────
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: emailClean },
      select: { id: true }, // on ne ramène que l'id, rien d'inutile
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet e-mail est déjà utilisé." },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("[REGISTER] Erreur vérification e-mail :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }

  // ── 4. Création du compte ────────────────────────────────────────────────
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: emailClean,
        password: hashedPassword,
        telephone: telephone?.trim() || null,
        departementId: departementId || null,
        role: "USER",   // toujours USER à l'inscription publique — la promotion
        actif: true,    // en ADMIN se fait uniquement via la page Utilisateurs
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

    // ── 5. Historique ──────────────────────────────────────────────────────
    // Séparé dans son propre try/catch : un échec de journalisation ne doit
    // pas annuler la création du compte ni renvoyer une erreur 500 au client.
    try {
      await prisma.historique.create({
        data: {
          userId: user.id,
          action: "CREATION_COMPTE",
          entite: "User",
          entiteId: user.id,
          nouvelleValeur: JSON.stringify({
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
          }),
        },
      });
    } catch (histError) {
      console.error("[REGISTER] Échec journalisation historique :", histError);
      // Non bloquant — le compte est créé, on continue
    }

    return NextResponse.json(
      { message: "Compte créé avec succès.", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER] Erreur création compte :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}








// import { NextRequest, NextResponse } from "next/server";
// import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// export async function POST(req: NextRequest) {
//   try {
//     const { nom, prenom, email, password, telephone, departementId } =
//       await req.json();

//     if (!nom || !prenom || !email || !password) {
//       return NextResponse.json(
//         { error: "Nom, prénom, email et mot de passe sont requis" },
//         { status: 400 }
//       );
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return NextResponse.json(
//         { error: "Format d'email invalide" },
//         { status: 400 }
//       );
//     }

//     if (password.length < 6) {
//       return NextResponse.json(
//         { error: "Le mot de passe doit contenir au moins 8 caractères" },
//         { status: 400 }
//       );
//     }

//     const existingUser = await prisma.user.findUnique({ where: { email } });
//     if (existingUser) {
//       return NextResponse.json(
//         { error: "Cet email est déjà utilisé" },
//         { status: 409 }
//       );
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await prisma.user.create({
//       data: {
//         nom,
//         prenom,
//         email,
//         password: hashedPassword,
//         telephone: telephone || null,
//         departementId: departementId || null,
//         role: "USER",
//         actif: true,
//       },
//       select: {
//         id: true,
//         nom: true,
//         prenom: true,
//         email: true,
//         role: true,
//         actif: true,
//         createdAt: true,
//         departement: { select: { nom: true } },
//       },
//     });

//     // Enregistrement dans l'historique
//     await prisma.historique.create({
//       data: {
//         userId: user.id,
//         action: "CREATION_COMPTE",
//         entite: "User",
//         entiteId: user.id,
//         nouvelleValeur: JSON.stringify({ email: user.email, nom: user.nom, prenom: user.prenom }),
//       },
//     });

//     return NextResponse.json(
//       { message: "Compte créé avec succès", user },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error("[REGISTER ERROR]", error);
//     return NextResponse.json(
//       { error: "Erreur interne du serveur" },
//       { status: 500 }
//     );
//   }
// }