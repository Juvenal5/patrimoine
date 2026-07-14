// src/app/api/alertes/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const now  = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const alertes: any[] = [];

    // 1. Garanties expirant dans 30 jours ─────────────────────────────────────
    const expiringBiens = await prisma.bien.findMany({
      where: {
        deletedAt:   null,
        garantieFin: { gte: now, lte: in30 },
      },
      select: {
        id:            true,
        codeInventaire: true,
        nom:           true,
        garantieFin:   true,
        departement:   { select: { nom: true } },
      },
    });

    for (const b of expiringBiens) {
      const daysLeft = Math.ceil(
        (new Date(b.garantieFin!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      alertes.push({
        id:      `garantie-${b.id}`,
        type:    "garantie",
        niveau:  daysLeft <= 7 ? "critique" : "avertissement",
        message: `Garantie de "${b.nom}" expire dans ${daysLeft} jour(s)`,
        bienId:  b.id,
        bien:    { code: b.codeInventaire, nom: b.nom, departement: b.departement?.nom },
        date:    b.garantieFin,
      });
    }

    // 2. Garanties déjà expirées ───────────────────────────────────────────────
    const expiredBiens = await prisma.bien.findMany({
      where: {
        deletedAt:   null,
        garantieFin: { lt: now },
        etat:        { not: "reforme" },
      },
      select: {
        id:             true,
        codeInventaire: true,
        nom:            true,
        garantieFin:    true,
        departement:    { select: { nom: true } },
      },
      take: 20,
    });

    for (const b of expiredBiens) {
      alertes.push({
        id:      `garantie-exp-${b.id}`,
        type:    "garantie_expiree",
        niveau:  "info",
        message: `Garantie de "${b.nom}" est expirée`,
        bienId:  b.id,
        bien:    { code: b.codeInventaire, nom: b.nom, departement: b.departement?.nom },
        date:    b.garantieFin,
      });
    }

    // 3. Biens en maintenance depuis plus de 30 jours ─────────────────────────
    const longMaintenance = await prisma.bien.findMany({
      where: {
        deletedAt: null,
        etat:      "maintenance",
        maintenances: {
          some: {
            statut:    { not: "termine" },
            dateDebut: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
      },
      select: {
        id:             true,
        codeInventaire: true,
        nom:            true,
        departement:    { select: { nom: true } },
        maintenances: {
          where:   { statut: { not: "termine" } },
          orderBy: { dateDebut: "asc" },
          take:    1,
          select:  { dateDebut: true, type: true },
        },
      },
    });

    for (const b of longMaintenance) {
      const m = b.maintenances[0];
      const days = m?.dateDebut
        ? Math.ceil((now.getTime() - new Date(m.dateDebut).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      alertes.push({
        id:      `maintenance-${b.id}`,
        type:    "maintenance_longue",
        niveau:  "avertissement",
        message: `"${b.nom}" en maintenance depuis ${days ?? "?"} jours`,
        bienId:  b.id,
        bien:    { code: b.codeInventaire, nom: b.nom, departement: b.departement?.nom },
        date:    m?.dateDebut ?? null,
      });
    }

    // 4. Biens actifs non affectés ─────────────────────────────────────────────
    const nonAffectes = await prisma.bien.findMany({
      where: {
        deletedAt: null,
        etat:      "actif",
        affectations: { none: { dateRetour: null } },
      },
      select: {
        id:             true,
        codeInventaire: true,
        nom:            true,
        departement:    { select: { nom: true } },
        createdAt:      true,
      },
      orderBy: { createdAt: "asc" },
      take:    10,
    });

    for (const b of nonAffectes) {
      alertes.push({
        id:      `non-affecte-${b.id}`,
        type:    "non_affecte",
        niveau:  "info",
        message: `"${b.nom}" est actif mais non affecté`,
        bienId:  b.id,
        bien:    { code: b.codeInventaire, nom: b.nom, departement: b.departement?.nom },
        date:    b.createdAt,
      });
    }

    // Sort: critique first, then avertissement, then info
    const niveauOrder = { critique: 0, avertissement: 1, info: 2 };
    alertes.sort((a, b) => (niveauOrder[a.niveau as keyof typeof niveauOrder] ?? 3) - (niveauOrder[b.niveau as keyof typeof niveauOrder] ?? 3));

    return NextResponse.json({
      total:   alertes.length,
      critique: alertes.filter(a => a.niveau === "critique").length,
      alertes,
    });
  } catch (err: any) {
    console.error("[alertes GET] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}