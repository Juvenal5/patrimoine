// src/app/api/Dashboard/stats/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    // ── Counts by etat ────────────────────────────────────────────────────────
    const [total, actif, maintenance, inactif, reforme] = await Promise.all([
      prisma.bien.count({ where: { deletedAt: null } }),
      prisma.bien.count({ where: { deletedAt: null, etat: "actif" } }),
      prisma.bien.count({ where: { deletedAt: null, etat: "maintenance" } }),
      prisma.bien.count({ where: { deletedAt: null, etat: "inactif" } }),
      prisma.bien.count({ where: { deletedAt: null, etat: "reforme" } }),
    ]);

    // ── Valeur totale ─────────────────────────────────────────────────────────
    const valeurAgg = await prisma.bien.aggregate({
      where:  { deletedAt: null },
      _sum:   { valeurAchat: true },
    });
    const valeurTotale = valeurAgg._sum.valeurAchat ?? 0;

    // ── Garanties expirant dans 30 jours ──────────────────────────────────────
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const garantiesExpirant = await prisma.bien.count({
      where: {
        deletedAt:   null,
        garantieFin: { gte: now, lte: in30 },
      },
    });

    // ── Biens non affectés ────────────────────────────────────────────────────
    const biensNonAffectes = await prisma.bien.count({
      where: {
        deletedAt: null,
        etat:      "actif",
        affectations: { none: { dateRetour: null } },
      },
    });

    // ── Acquisitions ce mois-ci ───────────────────────────────────────────────
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const acquisitionsMois = await prisma.bien.count({
      where: {
        deletedAt:       null,
        dateAcquisition: { gte: startOfMonth },
      },
    });

    return NextResponse.json({
      total,
      actif,
      maintenance,
      inactif,
      reforme,
      valeurTotale,
      garantiesExpirant,
      biensNonAffectes,
      acquisitionsMois,
    });
  } catch (err: any) {
    console.error("[dashboard/stats] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}