// src/app/api/Utilisateurs/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// ── GET /api/Utilisateurs ─────────────────────────────────────────────────────
// Paramètres query : search, role, actif, departementId, sortKey, sortDir, limit
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search       = searchParams.get("search")       || "";
    const role         = searchParams.get("role")         || "";       // "ADMIN" | "USER"
    const actif        = searchParams.get("actif");                    // "true" | "false"
    const departementId = searchParams.get("departementId") || "";
    const sortKey      = searchParams.get("sortKey")      || "createdAt";
    const sortDir      = (searchParams.get("sortDir")     || "desc") as "asc" | "desc";
    const limit        = parseInt(searchParams.get("limit") || "200");

    const where: any = {};

    if (search) {
      where.OR = [
        { nom:       { contains: search, mode: "insensitive" } },
        { prenom:    { contains: search, mode: "insensitive" } },
        { email:     { contains: search, mode: "insensitive" } },
        { telephone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role)         where.role         = role;
    if (actif !== null && actif !== "") where.actif = actif === "true";
    if (departementId) where.departementId = departementId;

    // Colonnes triables directement sur le modèle
    const allowedSort = ["nom", "prenom", "email", "createdAt", "role", "actif"];
    const orderBy = allowedSort.includes(sortKey)
      ? { [sortKey]: sortDir }
      : { createdAt: sortDir };

    const users = await prisma.user.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id:           true,
        nom:          true,
        prenom:       true,
        email:        true,
        telephone:    true,
        role:         true,
        actif:        true,
        createdAt:    true,
        updatedAt:    true,
        departementId: true,
        departement: {
          select: { id: true, nom: true },
        },
        // Compter les affectations actives
        _count: {
          select: { affectations: true },
        },
      },
    });

    // On n'expose jamais le mot de passe
    return NextResponse.json(users);
  } catch (err: any) {
    console.error("[GET /api/Utilisateurs]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

// ── POST /api/Utilisateurs ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, prenom, email, telephone, password, role, actif, departementId } = body;

    if (!nom?.trim() || !prenom?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Nom, prénom, email et mot de passe sont obligatoires." },
        { status: 400 }
      );
    }

    // Vérifier unicité email
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nom:          nom.trim(),
        prenom:       prenom.trim(),
        email:        email.trim().toLowerCase(),
        telephone:    telephone?.trim() || null,
        password:     hashed,
        role:         role === "ADMIN" ? "ADMIN" : "USER",
        actif:        actif !== false,
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

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/Utilisateurs]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}