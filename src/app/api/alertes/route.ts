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




// // app/api/alertes/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import prisma from "../../lib/prisma";

// /**
//  * GET /api/alertes
//  *
//  * Aggregates real alerts from the database:
//  *   1. Biens with garantieFin within the next 30 days  → severity "high"
//  *   2. Maintenances planifiées / en cours               → severity "medium"
//  *   3. Affectations whose datePrevisionRetour has passed → severity "medium"
//  *   4. Biens inactifs (etat = "inactif")                → severity "low"
//  *
//  * Response: { alertes: Alert[], counts: { high, medium, low, total } }
//  *
//  * ─────────────────────────────────────────────────────────────────────────────
//  *
//  * DELETE /api/alertes
//  *
//  * Body: { id: string, type: "garantie" | "maintenance" | "affectation" | "inactif" }
//  *
//  * "Dismissing" a real-world alert is a soft action:
//  *   - garantie      → sets bien.garantieFin = null  (acknowledged)
//  *   - maintenance   → sets maintenance.statut = "acquitte"
//  *   - affectation   → sets affectation.statut = "acquittee"
//  *   - inactif       → no-op (just acknowledged on client)
//  */

// // ── Types ─────────────────────────────────────────────────────────────────────

// interface AlerteItem {
//   id:       string;
//   type:     "garantie" | "maintenance" | "affectation" | "inactif";
//   message:  string;
//   severity: "high" | "medium" | "low";
//   time:     string;
// }

// // ── Helpers ───────────────────────────────────────────────────────────────────

// function relativeTime(date: Date): string {
//   const diffMs  = Date.now() - date.getTime();
//   const diffMin = Math.floor(diffMs / 60000);
//   const diffH   = Math.floor(diffMin / 60);
//   const diffD   = Math.floor(diffH   / 24);

//   if (diffMin < 60)  return `il y a ${diffMin}min`;
//   if (diffH   < 24)  return `il y a ${diffH}h`;
//   if (diffD   === 1) return "Hier";
//   return `Il y a ${diffD}j`;
// }

// // ── GET ───────────────────────────────────────────────────────────────────────

// export async function GET() {
//   try {
//     const now     = new Date();
//     const in30    = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
//     const alertes: AlerteItem[] = [];

//     // 1. Garanties expirant dans 30 jours ─────────────────────────────────────
//     const expiringBiens = await prisma.bien.findMany({
//       where: {
//         deletedAt: null,
//         garantieFin: { gte: now, lte: in30 },
//       },
//       select: {
//         id: true,
//         nom: true,
//         garantieFin: true,
//         codeInventaire: true,
//         updatedAt: true,
//       },
//       orderBy: { garantieFin: "asc" },
//       take: 20,
//     });

//     if (expiringBiens.length > 0) {
//       const daysUntilFirst = Math.ceil(
//         (expiringBiens[0].garantieFin!.getTime() - now.getTime()) / 86400000
//       );
//       alertes.push({
//         id:       `garantie-batch`,
//         type:     "garantie",
//         message:  `${expiringBiens.length} bien${expiringBiens.length > 1 ? "s" : ""} arrivant en fin de garantie dans ${daysUntilFirst} jours`,
//         severity: "high",
//         time:     relativeTime(expiringBiens[0].updatedAt),
//       });
//     }

//     // 2. Maintenances planifiées ou en cours ───────────────────────────────────
//     const pendingMaintenances = await prisma.maintenance.findMany({
//       where: {
//         statut: { in: ["planifie", "en_cours", "ouvert"] },
//       },
//       select: {
//         id: true,
//         type: true,
//         description: true,
//         statut: true,
//         createdAt: true,
//         bien: { select: { nom: true, codeInventaire: true } },
//       },
//       orderBy: { createdAt: "desc" },
//       take: 10,
//     });

//     for (const m of pendingMaintenances) {
//       alertes.push({
//         id:       `maintenance-${m.id}`,
//         type:     "maintenance",
//         message:  `Maintenance ${m.statut === "planifie" ? "planifiée" : "en cours"} — ${m.bien.nom} (${m.bien.codeInventaire})`,
//         severity: "medium",
//         time:     relativeTime(m.createdAt),
//       });
//     }

//     // 3. Affectations en retard ────────────────────────────────────────────────
//     const overdueAffectations = await prisma.affectation.findMany({
//       where: {
//         datePrevisionRetour: { lt: now },
//         dateRetour: null,
//         statut: { not: "retourne" },
//       },
//       select: {
//         id: true,
//         datePrevisionRetour: true,
//         createdAt: true,
//         bien: { select: { nom: true, codeInventaire: true } },
//         user: { select: { nom: true, prenom: true, departement: { select: { nom: true } } } },
//       },
//       orderBy: { datePrevisionRetour: "asc" },
//       take: 10,
//     });

//     for (const a of overdueAffectations) {
//       const dept = a.user.departement?.nom ?? "—";
//       alertes.push({
//         id:       `affectation-${a.id}`,
//         type:     "affectation",
//         message:  `Affectation expirée : ${a.bien.nom} (${dept})`,
//         severity: "medium",
//         time:     relativeTime(a.createdAt),
//       });
//     }

//     // 4. Biens inactifs ────────────────────────────────────────────────────────
//     const inactifBiens = await prisma.bien.findMany({
//       where: { deletedAt: null, etat: "inactif" },
//       select: { id: true, nom: true, updatedAt: true, departement: { select: { nom: true } } },
//       orderBy: { updatedAt: "desc" },
//       take: 5,
//     });

//     for (const b of inactifBiens) {
//       alertes.push({
//         id:       `inactif-${b.id}`,
//         type:     "inactif",
//         message:  `Bien inactif : ${b.nom}${b.departement ? ` (${b.departement.nom})` : ""}`,
//         severity: "low",
//         time:     relativeTime(b.updatedAt),
//       });
//     }

//     // ── Summary counts ────────────────────────────────────────────────────────
//     const counts = {
//       high:   alertes.filter((a) => a.severity === "high").length,
//       medium: alertes.filter((a) => a.severity === "medium").length,
//       low:    alertes.filter((a) => a.severity === "low").length,
//       total:  alertes.length,
//     };

//     return NextResponse.json({ alertes, counts });
//   } catch (error) {
//     console.error("[alertes GET]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }

// // ── DELETE ────────────────────────────────────────────────────────────────────

// export async function DELETE(request: NextRequest) {
//   try {
//     const { id, type } = (await request.json()) as {
//       id:   string;
//       type: AlerteItem["type"];
//     };

//     if (!id || !type) {
//       return NextResponse.json({ error: "id et type requis" }, { status: 400 });
//     }

//     switch (type) {
//       case "garantie": {
//         // id = "garantie-batch" — acknowledge: clear garantieFin for the soonest expiry
//         // In production you may want to mark an explicit field. Here we reset the field.
//         const bienId = id.replace("garantie-", "");
//         if (bienId !== "batch") {
//           await prisma.bien.update({
//             where: { id: bienId },
//             data: { garantieFin: null },
//           });
//         }
//         break;
//       }

//       case "maintenance": {
//         const maintenanceId = id.replace("maintenance-", "");
//         await prisma.maintenance.update({
//           where: { id: maintenanceId },
//           data: { statut: "acquitte" },
//         });
//         break;
//       }

//       case "affectation": {
//         const affectationId = id.replace("affectation-", "");
//         await prisma.affectation.update({
//           where: { id: affectationId },
//           data: { statut: "acquittee" },
//         });
//         break;
//       }

//       case "inactif":
//         // Client-side only — no DB mutation needed
//         break;

//       default:
//         return NextResponse.json({ error: "Type inconnu" }, { status: 400 });
//     }

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("[alertes DELETE]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }