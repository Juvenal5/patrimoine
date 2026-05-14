// src/app/api/fournisseurs/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { nom:     { contains: search, mode: "insensitive" } },
        { email:   { contains: search, mode: "insensitive" } },
        { type:    { contains: search, mode: "insensitive" } },
      ];
    }

    const fournisseurs = await prisma.fournisseur.findMany({
      where,
      orderBy: { nom: "asc" },
      select: {
        id: true, nom: true, email: true,
        telephone: true, type: true, adresse: true,
        contratDebut: true, contratFin: true,
        _count: { select: { maintenances: true, biens: true } },
      },
    });

    return NextResponse.json(fournisseurs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nom, email, telephone, adresse, type, contratDebut, contratFin } = await req.json();
    if (!nom?.trim()) return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });

    const f = await prisma.fournisseur.create({
      data: {
        nom:         nom.trim(),
        email:       email       || null,
        telephone:   telephone   || null,
        adresse:     adresse     || null,
        type:        type        || null,
        contratDebut: contratDebut ? new Date(contratDebut) : null,
        contratFin:   contratFin   ? new Date(contratFin)   : null,
      },
    });
    return NextResponse.json(f, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}