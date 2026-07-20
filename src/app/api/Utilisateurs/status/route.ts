import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma"; // ✅ client Prisma partagé (singleton) — ne PAS faire `new PrismaClient()` ici
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../../../lib/authOptions"; // adaptez le chemin

// Récupère l'id utilisateur depuis la session OU le token JWT brut
async function getUserId(req: NextRequest): Promise<string | null> {
  // Méthode 1 : session serveur (nécessite NEXTAUTH_SECRET)
  try {
    const session = await getServerSession(authOptions);
    const id = (session?.user as any)?.id;
    if (id) return id;
  } catch {}

  // Méthode 2 : lecture directe du JWT (plus fiable en cas d'erreur de session)
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const id = (token as any)?.id;
    if (id) return id;
  } catch {}

  return null;
}

// POST — heartbeat
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[STATUS POST ERROR]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET — liste des utilisateurs avec statut en ligne
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
        updatedAt: true,
        createdAt: true,
        departement: { select: { nom: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const now = new Date();
    const usersWithStatus = users.map((u) => ({
      ...u,
      enLigne: now.getTime() - new Date(u.updatedAt).getTime() < 2 * 60 * 1000,
    }));

    return NextResponse.json(usersWithStatus);
  } catch (error) {
    console.error("[STATUS GET ERROR]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}






// import { NextRequest, NextResponse } from "next/server";
// import { PrismaClient } from "@/app/lib/prisma";
// import { getServerSession } from "next-auth";
// import { getToken } from "next-auth/jwt";
// import { authOptions } from "../../../lib/authOptions"; // adaptez le chemin

// const prisma = new PrismaClient();

// // Récupère l'id utilisateur depuis la session OU le token JWT brut
// async function getUserId(req: NextRequest): Promise<string | null> {
//   // Méthode 1 : session serveur (nécessite NEXTAUTH_SECRET)
//   try {
//     const session = await getServerSession(authOptions);
//     const id = (session?.user as any)?.id;
//     if (id) return id;
//   } catch {}

//   // Méthode 2 : lecture directe du JWT (plus fiable en cas d'erreur de session)
//   try {
//     const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
//     const id = (token as any)?.id;
//     if (id) return id;
//   } catch {}

//   return null;
// }

// // POST — heartbeat
// export async function POST(req: NextRequest) {
//   try {
//     const userId = await getUserId(req);

//     if (!userId) {
//       return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
//     }

//     await prisma.user.update({
//       where: { id: userId },
//       data: { updatedAt: new Date() },
//     });

//     return NextResponse.json({ ok: true });
//   } catch (error) {
//     console.error("[STATUS POST ERROR]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }

// // GET — liste des utilisateurs avec statut en ligne
// export async function GET(req: NextRequest) {
//   try {
//     const userId = await getUserId(req);

//     if (!userId) {
//       return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
//     }

//     const users = await prisma.user.findMany({
//       select: {
//         id: true,
//         nom: true,
//         prenom: true,
//         email: true,
//         role: true,
//         actif: true,
//         updatedAt: true,
//         createdAt: true,
//         departement: { select: { nom: true } },
//       },
//       orderBy: { updatedAt: "desc" },
//     });

//     const now = new Date();
//     const usersWithStatus = users.map((u) => ({
//       ...u,
//       enLigne: now.getTime() - new Date(u.updatedAt).getTime() < 2 * 60 * 1000,
//     }));

//     return NextResponse.json(usersWithStatus);
//   } catch (error) {
//     console.error("[STATUS GET ERROR]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }






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
//         { error: "Le mot de passe doit contenir au moins 6 caractères" },
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










// import { NextResponse } from "next/server";
// import { PrismaClient } from "@prisma/client";
// import { getServerSession } from "next-auth";
// import { authOptions } from "../../../lib/authOptions";

// const prisma = new PrismaClient();

// // POST — heartbeat : appelé toutes les 30s par le client connecté
// export async function POST() {
//   try {
//     const session = await getServerSession(authOptions);

//     if ((session?.user as any)?.id) {
//       return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
//     }

//     await prisma.user.update({
//       where: { id: (session?.user as any)?.id },
//       data: { updatedAt: new Date() },
//     });

//     return NextResponse.json({ ok: true });
//   } catch (error) {
//     console.error("[STATUS POST ERROR]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }

// // GET — liste tous les utilisateurs avec leur statut en ligne
// export async function GET() {
//   try {
//     const session = await getServerSession(authOptions);

//     if ((session?.user as any)?.id) {
//       return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
//     }

//     const users = await prisma.user.findMany({
//       select: {
//         id: true,
//         nom: true,
//         prenom: true,
//         email: true,
//         role: true,
//         actif: true,
//         updatedAt: true,
//         createdAt: true,
//         departement: { select: { nom: true } },
//       },
//       orderBy: { updatedAt: "desc" },
//     });

//     const now = new Date();

//     // En ligne = activité dans les 2 dernières minutes
//     const usersWithStatus = users.map((u) => ({
//       ...u,
//       enLigne: now.getTime() - new Date(u.updatedAt).getTime() < 2 * 60 * 1000,
//     }));

//     return NextResponse.json(usersWithStatus);
//   } catch (error) {
//     console.error("[STATUS GET ERROR]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }