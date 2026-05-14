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
last30Days.setDate(last30Days.getDate()-30);


const warrantyLimit = new Date();
warrantyLimit.setDate(
warrantyLimit.getDate()+30
);


// =========================
// STATS CARDS
// =========================

const totalBiens = await prisma.bien.count();

const actifs = await prisma.bien.count({
 where:{
   etat:"ACTIF"
 }
});

const maintenances = await prisma.maintenance.count({
 where:{
   OR:[
     {statut:"EN_COURS"},
     {statut:"PLANIFIE"}
   ]
 }
});

const acquisitionsMonth = await prisma.bien.count({
 where:{
   createdAt:{
     gte:startMonth
   }
 }
});

const previousMonth = new Date(
now.getFullYear(),
now.getMonth()-1,
1
);

const prevMonthEnd = new Date(
now.getFullYear(),
now.getMonth(),
0
);

const acquisitionsPrev = await prisma.bien.count({
where:{
 createdAt:{
   gte:previousMonth,
   lte:prevMonthEnd
 }
}
});

const deltaAcquisition =
acquisitionsPrev > 0
? Math.round(
((acquisitionsMonth-acquisitionsPrev)/acquisitionsPrev)*100
)
:0;



// =========================
// ALERTES
// =========================

const garantiesExpire = await prisma.bien.count({
where:{
 garantieFin:{
   lte:warrantyLimit,
   gte:now
 }
}
});

const affectationsExpirees = await prisma.affectation.count({
where:{
 statut:"ACTIVE",
 datePrevisionRetour:{
   lt:now
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
include:{
  _count:{
    select:{
      biens:true
    }
  }
}
});

const deptData = departements.map((d)=>({
 name:d.nom,
 count:d._count.biens,
 total:totalBiens
}));



// =========================
// RECENTS
// =========================

const recents = await prisma.bien.findMany({
take:5,
orderBy:{
 createdAt:"desc"
},
include:{
 departement:true
}
});

const recentFormatted = recents.map((item)=>({

id:item.codeInventaire,

name:item.nom,

category:item.categorie || "N/A",

department:
item.departement?.nom || "Non assigné",

status:
item.etat?.toLowerCase() === "maintenance"
 ? "maintenance"
 : item.etat?.toLowerCase() === "inactif"
 ? "inactif"
 : "actif",

date:item.createdAt,

value:item.valeurAchat
 ? `${item.valeurAchat.toLocaleString()} FCFA`
 : "0 FCFA"

}));



// =========================
// ALERT FEED
// =========================

const alertFeed = [];

if(garantiesExpire >0){
alertFeed.push({
id:"1",
message:
`${garantiesExpire} biens arrivent en fin de garantie`,
severity:"high",
time:"Temps réel"
});
}

if(maintenances >0){
alertFeed.push({
id:"2",
message:
`${maintenances} maintenances planifiées`,
severity:"medium",
time:"Temps réel"
});
}

if(affectationsExpirees>0){
alertFeed.push({
id:"3",
message:
`${affectationsExpirees} affectations expirées`,
severity:"medium",
time:"Temps réel"
});
}



// =========================
// TAUX
// =========================

const tauxActivite =
totalBiens>0
? Math.round((actifs/totalBiens)*100)
:0;


const affectes = await prisma.affectation.count({
where:{
 statut:"ACTIVE"
}
});

const tauxAffectation =
totalBiens>0
? Math.round((affectes/totalBiens)*100)
:0;



return NextResponse.json({

stats:{
 totalBiens,
 actifs,
 maintenances,
 alertes:totalAlertes,
 acquisitionsMonth,
 deltaAcquisition
},

monthly:monthlyRaw,

departements:deptData,

recents:recentFormatted,

alerts:alertFeed,

rates:{
 activite:tauxActivite,
 affectation:tauxAffectation
},

updatedAt:new Date()

});


}
catch(error){

console.error(error);

return NextResponse.json(
{
error:"Erreur dashboard"
},
{
status:500
}
);

}

}





// // app/api/dashboard/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "../../lib/prisma";
// import { addDays, startOfMonth } from "date-fns";

// export async function GET() {
//   try {
//     const now = new Date();
//     const startMonth = startOfMonth(now);
//     const in30days = addDays(now, 30);

//     // ── Exécution parallèle des requêtes principales ─────────────────────────
//     const [
//       totalBiens,
//       biensActifs,
//       enMaintenance,
//       biensInactifs,
//       newThisMonth,
//       garantieExpiring,
//       maintenancePrevue,
//       affectationsExpirees,
//       biensAffectesCount,
//       departments,
//       recentBiens,
//     ] = await Promise.all([
//       // Total biens non supprimés
//       prisma.bien.count({ where: { deletedAt: null } }),

//       // Biens dont l'état est "actif"
//       prisma.bien.count({ where: { deletedAt: null, etat: "actif" } }),

//       // Biens en maintenance
//       prisma.bien.count({ where: { deletedAt: null, etat: "maintenance" } }),

//       // Biens inactifs
//       prisma.bien.count({ where: { deletedAt: null, etat: "inactif" } }),

//       // Nouveaux biens acquis ce mois-ci
//       prisma.bien.count({
//         where: {
//           deletedAt: null,
//           dateAcquisition: { gte: startMonth },
//         },
//       }),

//       // Biens dont la garantie expire dans 30 jours
//       prisma.bien.count({
//         where: {
//           deletedAt: null,
//           garantieFin: { gte: now, lte: in30days },
//         },
//       }),

//       // Maintenances planifiées dans les 7 prochains jours
//       prisma.maintenance.findMany({
//         where: {
//           prochaineMaintenance: { gte: now, lte: addDays(now, 7) },
//           statut: { not: "terminé" },
//         },
//         include: { bien: { select: { nom: true, codeInventaire: true } } },
//         orderBy: { prochaineMaintenance: "asc" },
//         take: 5,
//       }),

//       // Affectations dont la date de retour prévue est dépassée
//       prisma.affectation.findMany({
//         where: {
//           datePrevisionRetour: { lt: now },
//           dateRetour: null,
//         },
//         include: {
//           bien: { select: { nom: true, codeInventaire: true } },
//           user: {
//             select: {
//               nom: true,
//               prenom: true,
//               departement: { select: { nom: true } },
//             },
//           },
//         },
//         orderBy: { datePrevisionRetour: "asc" },
//         take: 5,
//       }),

//       // Nombre de biens actuellement affectés (sans date de retour)
//       prisma.affectation.count({
//         where: {
//           dateRetour: null,
//           bien: { deletedAt: null },
//         },
//       }),

//       // Répartition par département
//       prisma.departement.findMany({
//         include: {
//           _count: {
//             select: { biens: { where: { deletedAt: null } } },
//           },
//         },
//         orderBy: { nom: "asc" },
//       }),

//       // Acquisitions récentes
//       prisma.bien.findMany({
//         where: { deletedAt: null },
//         include: {
//           departement: { select: { id: true, nom: true } },
//           fournisseur: { select: { id: true, nom: true } },
//           affectations: {
//             where: { dateRetour: null },
//             include: {
//               user: { select: { nom: true, prenom: true } },
//             },
//             take: 1,
//           },
//         },
//         orderBy: { createdAt: "desc" },
//         take: 10,
//       }),
//     ]);

//     // ── Calcul des taux ───────────────────────────────────────────────────────
//     const tauxActivite =
//       totalBiens > 0 ? Math.round((biensActifs / totalBiens) * 100) : 0;
//     const tauxAffectation =
//       totalBiens > 0
//         ? Math.min(Math.round((biensAffectesCount / totalBiens) * 100), 100)
//         : 0;

//     // ── Construction des alertes ──────────────────────────────────────────────
//     const alerts: {
//       id: string;
//       message: string;
//       severity: "high" | "medium" | "low";
//       time: string;
//       type: string;
//     }[] = [];

//     if (garantieExpiring > 0) {
//       alerts.push({
//         id: "garantie",
//         message: `${garantieExpiring} bien(s) arrivant en fin de garantie dans 30 jours`,
//         severity: "high",
//         time: "Maintenant",
//         type: "garantie",
//       });
//     }

//     maintenancePrevue.forEach((m) => {
//       const dateStr = m.prochaineMaintenance
//         ? new Date(m.prochaineMaintenance).toLocaleDateString("fr-FR")
//         : "prochainement";
//       alerts.push({
//         id: `maint-${m.id}`,
//         message: `Maintenance préventive planifiée — ${m.bien.nom} (${dateStr})`,
//         severity: "medium",
//         time: "Planifié",
//         type: "maintenance",
//       });
//     });

//     affectationsExpirees.forEach((a) => {
//       const dept = a.user.departement?.nom ?? "—";
//       alerts.push({
//         id: `aff-${a.id}`,
//         message: `Affectation expirée : ${a.bien.nom} — ${a.user.prenom} ${a.user.nom} (${dept})`,
//         severity: "medium",
//         time: "Expiré",
//         type: "affectation",
//       });
//     });

//     const totalAlertes = alerts.length;

//     // ── Réponse ───────────────────────────────────────────────────────────────
//     return NextResponse.json({
//       stats: {
//         totalBiens,
//         newThisMonth,
//         biensActifs,
//         enMaintenance,
//         biensInactifs,
//         totalAlertes,
//         garantieExpiring,
//         pourcentageActifs:
//           totalBiens > 0 ? Math.round((biensActifs / totalBiens) * 100) : 0,
//       },
//       departments: departments
//         .map((d) => ({
//           id: d.id,
//           name: d.nom,
//           count: d._count.biens,
//           total: totalBiens,
//         }))
//         .sort((a, b) => b.count - a.count),
//       recentBiens: recentBiens.map((b) => ({
//         id: b.id,
//         codeInventaire: b.codeInventaire,
//         nom: b.nom,
//         categorie: b.categorie ?? "—",
//         type: b.type ?? "—",
//         departement: b.departement?.nom ?? "—",
//         departementId: b.departementId,
//         etat: (b.etat as "actif" | "maintenance" | "inactif") ?? "inactif",
//         dateAcquisition: b.dateAcquisition?.toISOString() ?? null,
//         createdAt: b.createdAt.toISOString(),
//         valeurAchat: b.valeurAchat ?? null,
//         fournisseur: b.fournisseur?.nom ?? "—",
//         localisation: b.localisation ?? "—",
//         affectéA:
//           b.affectations[0]
//             ? `${b.affectations[0].user.prenom} ${b.affectations[0].user.nom}`
//             : null,
//       })),
//       alerts: alerts.slice(0, 8),
//       quickStats: {
//         tauxActivite,
//         tauxAffectation,
//         biensAffectes: biensAffectesCount,
//       },
//     });
//   } catch (error) {
//     console.error("[dashboard/route] GET error:", error);
//     return NextResponse.json(
//       { error: "Erreur interne du serveur" },
//       { status: 500 }
//     );
//   }
// }





// // import { prisma } from "../../lib/prisma"
// // import { NextResponse } from "next/server"

// // export async function GET() {

// //  const users = await prisma.user.count()

// //  const departements = await prisma.departement.count()

// //  const biens = await prisma.bien.count()

// //  const fournisseurs = await prisma.fournisseur.count()

// //  const maintenances = await prisma.maintenance.count()

// //  const affectations = await prisma.affectation.count()

// //  const nouveauxUsers = await prisma.user.findMany({
// //   orderBy:{createdAt:"desc"},
// //   take:5
// //  })

// //  return NextResponse.json({
// //   users,
// //   departements,
// //   biens,
// //   fournisseurs,
// //   maintenances,
// //   affectations,
// //   nouveauxUsers
// //  })
// // }