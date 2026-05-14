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







// // app/api/dashboard/stats/route.ts
// import { NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";

// /**
//  * GET /api/dashboard/stats
//  *
//  * Returns the four KPI cards shown at the top of the Dashboard:
//  *   - total      : total number of biens (non-deleted)
//  *   - actif      : biens whose etat === "actif"
//  *   - maintenance: biens whose etat === "maintenance"
//  *   - inactif    : biens whose etat === "inactif"
//  *   - alertes    : active alerts count (guarantees expiring ≤30d + open maintenances)
//  *
//  * Also returns month-over-month delta for the "total" card.
//  */
// export async function GET() {
//   try {
//     const now = new Date();

//     // ── Counts by etat ────────────────────────────────────────────────────────
//     const [total, actif, maintenance, inactif] = await Promise.all([
//       prisma.bien.count({ where: { deletedAt: null } }),
//       prisma.bien.count({ where: { deletedAt: null, etat: "actif" } }),
//       prisma.bien.count({ where: { deletedAt: null, etat: "maintenance" } }),
//       prisma.bien.count({ where: { deletedAt: null, etat: "inactif" } }),
//     ]);

//     // ── Delta : biens added this calendar month ───────────────────────────────
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const addedThisMonth = await prisma.bien.count({
//       where: { deletedAt: null, createdAt: { gte: startOfMonth } },
//     });

//     // ── Alertes : guarantees expiring in ≤30 days + open maintenances ─────────
//     const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

//     const [expiringWarranties, openMaintenances] = await Promise.all([
//       prisma.bien.count({
//         where: {
//           deletedAt: null,
//           garantieFin: { gte: now, lte: in30Days },
//         },
//       }),
//       prisma.maintenance.count({
//         where: {
//           statut: { in: ["en_cours", "planifie", "ouvert"] },
//         },
//       }),
//     ]);

//     const alertesCount = expiringWarranties + openMaintenances;

//     return NextResponse.json({
//       stats: [
//         {
//           key: "all",
//           label: "Total des biens",
//           value: total,
//           delta: `+${addedThisMonth} ce mois`,
//           pos: true,
//         },
//         {
//           key: "actif",
//           label: "Biens actifs",
//           value: actif,
//           delta: `${total > 0 ? Math.round((actif / total) * 100) : 0}% du total`,
//           pos: true,
//         },
//         {
//           key: "maintenance",
//           label: "En maintenance",
//           value: maintenance,
//           delta: `${maintenance} en cours`,
//           pos: false,
//         },
//         {
//           key: "inactif",
//           label: "Alertes urgentes",
//           value: alertesCount,
//           delta: alertesCount > 0 ? "Action requise" : "Tout est en ordre",
//           pos: false,
//         },
//       ],
//     });
//   } catch (error) {
//     console.error("[dashboard/stats]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }