import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function GET() {

  try {

    const now = new Date();

    const startMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);


    const warrantyLimit = new Date();
    warrantyLimit.setDate(
      warrantyLimit.getDate() + 30
    );


    // =========================
    // STATS CARDS
    // =========================

    const totalBiens = await prisma.bien.count();

    const actifs = await prisma.bien.count({
      where: {
        etat: "ACTIF"
      }
    });

    const maintenances = await prisma.maintenance.count({
      where: {
        OR: [
          { statut: "EN_COURS" },
          { statut: "PLANIFIE" }
        ]
      }
    });

    const acquisitionsMonth = await prisma.bien.count({
      where: {
        createdAt: {
          gte: startMonth
        }
      }
    });

    const previousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    );

    const acquisitionsPrev = await prisma.bien.count({
      where: {
        createdAt: {
          gte: previousMonth,
          lte: prevMonthEnd
        }
      }
    });

    const deltaAcquisition =
      acquisitionsPrev > 0
        ? Math.round(
          ((acquisitionsMonth - acquisitionsPrev) / acquisitionsPrev) * 100
        )
        : 0;



    // =========================
    // ALERTES
    // =========================

    const garantiesExpire = await prisma.bien.count({
      where: {
        garantieFin: {
          lte: warrantyLimit,
          gte: now
        }
      }
    });

    const affectationsExpirees = await prisma.affectation.count({
      where: {
        statut: "ACTIVE",
        datePrevisionRetour: {
          lt: now
        }
      }
    });

    const totalAlertes =
      garantiesExpire + affectationsExpirees;


    // =========================
    // CHART MENSUEL
    // =========================

    const monthlyRaw = await prisma.$queryRaw`
SELECT
TO_CHAR("createdAt",'Mon') as month,
COUNT(*)::int as value
FROM "Bien"
GROUP BY month,
DATE_TRUNC('month',"createdAt")
ORDER BY DATE_TRUNC('month',"createdAt")
`;



    // =========================
    // REPARTITION DEPARTEMENTS
    // =========================

    const departements = await prisma.departement.findMany({
      include: {
        _count: {
          select: {
            biens: true
          }
        }
      }
    });

    const deptData = departements.map((d) => ({
      name: d.nom,
      count: d._count.biens,
      total: totalBiens
    }));



    // =========================
    // RECENTS
    // =========================

    const recents = await prisma.bien.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        departement: true
      }
    });

    const recentFormatted = recents.map((item) => ({

      id: item.codeInventaire,

      name: item.nom,

      category: item.categorie || "N/A",

      department:
        item.departement?.nom || "Non assigné",

      status:
        item.etat?.toLowerCase() === "maintenance"
          ? "maintenance"
          : item.etat?.toLowerCase() === "inactif"
            ? "inactif"
            : "actif",

      date: item.createdAt,

      value: item.valeurAchat
        ? `${item.valeurAchat.toLocaleString()} FCFA`
        : "0 FCFA"

    }));



    // =========================
    // ALERT FEED
    // =========================

    const alertFeed = [];

    if (garantiesExpire > 0) {
      alertFeed.push({
        id: "1",
        message:
          `${garantiesExpire} biens arrivent en fin de garantie`,
        severity: "high",
        time: "Temps réel"
      });
    }

    if (maintenances > 0) {
      alertFeed.push({
        id: "2",
        message:
          `${maintenances} maintenances planifiées`,
        severity: "medium",
        time: "Temps réel"
      });
    }

    if (affectationsExpirees > 0) {
      alertFeed.push({
        id: "3",
        message:
          `${affectationsExpirees} affectations expirées`,
        severity: "medium",
        time: "Temps réel"
      });
    }



    // =========================
    // TAUX
    // =========================

    const tauxActivite =
      totalBiens > 0
        ? Math.round((actifs / totalBiens) * 100)
        : 0;


    const affectes = await prisma.affectation.count({
      where: {
        statut: "ACTIVE"
      }
    });

    const tauxAffectation =
      totalBiens > 0
        ? Math.round((affectes / totalBiens) * 100)
        : 0;



    return NextResponse.json({

      stats: {
        totalBiens,
        actifs,
        maintenances,
        alertes: totalAlertes,
        acquisitionsMonth,
        deltaAcquisition
      },

      monthly: monthlyRaw,

      departements: deptData,

      recents: recentFormatted,

      alerts: alertFeed,

      rates: {
        activite: tauxActivite,
        affectation: tauxAffectation
      },

      updatedAt: new Date()

    });


  }
  catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error: "Erreur dashboard"
      },
      {
        status: 500
      }
    );

  }

}
