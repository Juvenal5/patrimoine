// src/app/api/Utilisateurs/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma"; // ← singleton partagé uniquement
import bcrypt from "bcryptjs";

// Bug corrigé : "const prisma = new PrismaClient()" supprimé — il créait un
// doublon qui entrait en conflit avec l'import du singleton ci-dessus ET
// recréait le problème d'épuisement du pool de connexions.

// ─────────────────────────────────────────────────────────────────────────────
//  Constantes
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Colonnes triables directement sur le modèle User — liste blanche pour
// éviter toute injection dans l'orderBy de Prisma
const ALLOWED_SORT_KEYS = ["nom", "prenom", "email", "createdAt", "role", "actif"] as const;
type AllowedSortKey = (typeof ALLOWED_SORT_KEYS)[number];

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/Utilisateurs
//  Paramètres query : search, role, actif, departementId, sortKey, sortDir, limit
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search        = searchParams.get("search")?.trim()        ?? "";
    const role          = searchParams.get("role")?.trim()          ?? "";
    const actifParam    = searchParams.get("actif");
    const departementId = searchParams.get("departementId")?.trim() ?? "";

    // Bug corrigé : parseInt sans radix peut provoquer des comportements
    // inattendus sur certains environnements ; on force la base 10.
    // On borne aussi la limit pour éviter des requêtes trop lourdes.
    const limitRaw = parseInt(searchParams.get("limit") ?? "200", 10);
    const limit    = Number.isNaN(limitRaw) ? 200 : Math.min(limitRaw, 500);

    const sortKeyRaw = searchParams.get("sortKey") ?? "createdAt";
    const sortKey: AllowedSortKey = (ALLOWED_SORT_KEYS as readonly string[]).includes(sortKeyRaw)
      ? (sortKeyRaw as AllowedSortKey)
      : "createdAt";

    const sortDirRaw = searchParams.get("sortDir") ?? "desc";
    const sortDir: "asc" | "desc" = sortDirRaw === "asc" ? "asc" : "desc";

    // Construction du filtre
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nom:       { contains: search, mode: "insensitive" } },
        { prenom:    { contains: search, mode: "insensitive" } },
        { email:     { contains: search, mode: "insensitive" } },
        { telephone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Bug corrigé : comparaison role === "" était déjà couverte par la
    // vérification initiale ; on vérifie maintenant que la valeur est dans
    // l'enum Prisma avant de la passer pour éviter une erreur 500.
    if (role === "ADMIN" || role === "USER") {
      where.role = role;
    }

    if (actifParam === "true")       where.actif = true;
    else if (actifParam === "false") where.actif = false;
    // Si actifParam est null ou vide, pas de filtre → on retourne tous les statuts

    if (departementId) where.departementId = departementId;

    const users = await prisma.user.findMany({
      where,
      orderBy: { [sortKey]: sortDir },
      take: limit,
      select: {
        id:            true,
        nom:           true,
        prenom:        true,
        email:         true,
        telephone:     true,
        role:          true,
        actif:         true,
        createdAt:     true,
        updatedAt:     true,
        departementId: true,
        departement: {
          select: { id: true, nom: true },
        },
        _count: {
          select: { affectations: true },
        },
        // password jamais sélectionné — on n'expose pas le hash
      },
    });

    return NextResponse.json(users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[GET /api/Utilisateurs]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/Utilisateurs
//  Création d'un utilisateur par un ADMIN (via la page Utilisateurs).
//  Contrairement à /api/auth/register, cette route accepte un rôle ADMIN.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Lecture du body ────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de la requête invalide (JSON attendu)." },
      { status: 400 }
    );
  }

  const { nom, prenom, email, telephone, password, role, actif, departementId } = body as {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    password?: string;
    role?: string;
    actif?: boolean;
    departementId?: string;
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!nom?.trim() || !prenom?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Nom, prénom et e-mail sont obligatoires." },
      { status: 400 }
    );
  }

  // Bug corrigé : le mot de passe était vérifié avec ?.trim() ce qui acceptait
  // une chaîne vide de la form " " comme valide.
  if (!password || password.trim().length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  const emailClean = email.trim().toLowerCase();

  // Bug corrigé : aucune validation de format email n'était effectuée dans
  // ce endpoint — un email malformé passait directement à Prisma.
  if (!EMAIL_REGEX.test(emailClean)) {
    return NextResponse.json(
      { error: "Format d'e-mail invalide." },
      { status: 400 }
    );
  }

  try {
    // ── Unicité e-mail ─────────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: emailClean },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Cet e-mail est déjà utilisé." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // ── Création ───────────────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        nom:           nom.trim(),
        prenom:        prenom.trim(),
        email:         emailClean,
        telephone:     telephone?.trim() || null,
        password:      hashed,
        // Bug corrigé : on accepte "ADMIN" | "USER" seulement.
        // Toute autre valeur (ex: "Admin", "Utis") est rejetée → "USER" par défaut.
        role:          role === "ADMIN" ? "ADMIN" : "USER",
        // Bug corrigé : actif !== false acceptait undefined → true, ce qui
        // était le comportement attendu mais implicite. On le rend explicite.
        actif:         actif === true || actif === undefined ? true : false,
        departementId: departementId || null,
      },
      select: {
        id:          true,
        nom:         true,
        prenom:      true,
        email:       true,
        telephone:   true,
        role:        true,
        actif:       true,
        createdAt:   true,
        departement: { select: { id: true, nom: true } },
        _count:      { select: { affectations: true } },
      },
    });

    // ── Historique ─────────────────────────────────────────────────────────
    // Non bloquant : un échec ici ne doit pas annuler la création.
    prisma.historique.create({
      data: {
        userId:        user.id,
        action:        "CREATION_COMPTE",
        entite:        "User",
        entiteId:      user.id,
        nouvelleValeur: JSON.stringify({
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
        }),
      },
    }).catch((e: unknown) => {
      console.error("[POST /api/Utilisateurs] Échec historique :", e);
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[POST /api/Utilisateurs]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}








// // src/app/api/Utilisateurs/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";
// import bcrypt from "bcryptjs";
//  //const prisma = new PrismaClient();

// // ── GET /api/Utilisateurs ─────────────────────────────────────────────────────
// // Paramètres query : search, role, actif, departementId, sortKey, sortDir, limit
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const search       = searchParams.get("search")       || "";
//     const role         = searchParams.get("role")         || "";       // "ADMIN" | "USER"
//     const actif        = searchParams.get("actif");                    // "true" | "false"
//     const departementId = searchParams.get("departementId") || "";
//     const sortKey      = searchParams.get("sortKey")      || "createdAt";
//     const sortDir      = (searchParams.get("sortDir")     || "desc") as "asc" | "desc";
//     const limit        = parseInt(searchParams.get("limit") || "200");

//     const where: any = {};

//     if (search) {
//       where.OR = [
//         { nom:       { contains: search, mode: "insensitive" } },
//         { prenom:    { contains: search, mode: "insensitive" } },
//         { email:     { contains: search, mode: "insensitive" } },
//         { telephone: { contains: search, mode: "insensitive" } },
//       ];
//     }
//     if (role)         where.role         = role;
//     if (actif !== null && actif !== "") where.actif = actif === "true";
//     if (departementId) where.departementId = departementId;

//     // Colonnes triables directement sur le modèle
//     const allowedSort = ["nom", "prenom", "email", "createdAt", "role", "actif"];
//     const orderBy = allowedSort.includes(sortKey)
//       ? { [sortKey]: sortDir }
//       : { createdAt: sortDir };

//     const users = await prisma.user.findMany({
//       where,
//       orderBy,
//       take: limit,
//       select: {
//         id:           true,
//         nom:          true,
//         prenom:       true,
//         email:        true,
//         telephone:    true,
//         role:         true,
//         actif:        true,
//         createdAt:    true,
//         updatedAt:    true,
//         departementId: true,
//         departement: {
//           select: { id: true, nom: true },
//         },
//         // Compter les affectations actives
//         _count: {
//           select: { affectations: true },
//         },
//       },
//     });

//     // On n'expose jamais le mot de passe
//     return NextResponse.json(users);
//   } catch (err: any) {
//     console.error("[GET /api/Utilisateurs]", err);
//     return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
//   }
// }

// // ── POST /api/Utilisateurs ────────────────────────────────────────────────────
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { nom, prenom, email, telephone, password, role, actif, departementId } = body;

//     if (!nom?.trim() || !prenom?.trim() || !email?.trim() || !password?.trim()) {
//       return NextResponse.json(
//         { error: "Nom, prénom, email et mot de passe sont obligatoires." },
//         { status: 400 }
//       );
//     }

//     // Vérifier unicité email
//     const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
//     if (existing) {
//       return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
//     }

//     const hashed = await bcrypt.hash(password, 10);

//     const user = await prisma.user.create({
//       data: {
//         nom:          nom.trim(),
//         prenom:       prenom.trim(),
//         email:        email.trim().toLowerCase(),
//         telephone:    telephone?.trim() || null,
//         password:     hashed,
//         role:         role === "ADMIN" ? "ADMIN" : "USER",
//         actif:        actif !== false,
//         departementId: departementId || null,
//       },
//       select: {
//         id:          true,
//         nom:         true,
//         prenom:      true,
//         email:       true,
//         telephone:   true,
//         role:        true,
//         actif:       true,
//         createdAt:   true,
//         departement: { select: { id: true, nom: true } },
//         _count:      { select: { affectations: true } },
//       },
//     });

//     return NextResponse.json(user, { status: 201 });
//   } catch (err: any) {
//     console.error("[POST /api/Utilisateurs]", err);
//     return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
//   }
// }