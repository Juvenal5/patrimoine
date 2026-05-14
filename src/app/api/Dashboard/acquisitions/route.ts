// src/app/api/Dashboard/acquisitions/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "mois"; // "mois" | "annee"

    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();

    if (period === "annee") {
      // Monthly buckets for current year
      const startOfYear = new Date(year, 0, 1);
      const endOfYear   = new Date(year, 11, 31, 23, 59, 59, 999);

      const biens = await prisma.bien.findMany({
        where: {
          deletedAt:       null,
          dateAcquisition: { gte: startOfYear, lte: endOfYear },
        },
        select: {
          dateAcquisition: true,
          valeurAchat:     true,
          categorie:       true,
        },
      });

      // Group by month
      const months = Array.from({ length: 12 }, (_, i) => ({
        label:  new Date(year, i, 1).toLocaleDateString("fr-CI", { month: "short" }),
        count:  0,
        valeur: 0,
      }));
      for (const b of biens) {
        const m = new Date(b.dateAcquisition!).getMonth();
        months[m].count++;
        months[m].valeur += b.valeurAchat ?? 0;
      }

      // Category breakdown for the full year
      const catMap: Record<string, number> = {};
      for (const b of biens) {
        const cat = b.categorie || "Autre";
        catMap[cat] = (catMap[cat] ?? 0) + 1;
      }

      return NextResponse.json({
        series:     months,
        categories: Object.entries(catMap).map(([label, count]) => ({ label, count })),
        total:      biens.length,
        valeur:     biens.reduce((s, b) => s + (b.valeurAchat ?? 0), 0),
      });
    }

    // Default: daily buckets for current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth   = new Date(year, month, daysInMonth, 23, 59, 59, 999);

    const biens = await prisma.bien.findMany({
      where: {
        deletedAt:       null,
        dateAcquisition: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        dateAcquisition: true,
        valeurAchat:     true,
        categorie:       true,
      },
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      label:  String(i + 1),
      count:  0,
      valeur: 0,
    }));
    for (const b of biens) {
      const d = new Date(b.dateAcquisition!).getDate() - 1;
      days[d].count++;
      days[d].valeur += b.valeurAchat ?? 0;
    }

    const catMap: Record<string, number> = {};
    for (const b of biens) {
      const cat = b.categorie || "Autre";
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    }

    return NextResponse.json({
      series:     days,
      categories: Object.entries(catMap).map(([label, count]) => ({ label, count })),
      total:      biens.length,
      valeur:     biens.reduce((s, b) => s + (b.valeurAchat ?? 0), 0),
    });
  } catch (err: any) {
    console.error("[dashboard/acquisitions] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}





// // app/api/dashboard/acquisitions/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";

// /**
//  * GET /api/dashboard/acquisitions?period=mois
//  *
//  * Query params:
//  *   period  "semaine" | "mois" | "annee"   (default: "mois")
//  *
//  * Returns { labels: string[], values: number[], highlights: number[] }
//  * that maps directly to the BarChart component in Dashboard.tsx.
//  *
//  * - semaine : acquisitions per day for the current week (Mon–Sun)
//  * - mois    : acquisitions per month for the current year (Jan–Dec)
//  * - annee   : acquisitions per year for the last 6 years
//  */
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const period = (searchParams.get("period") ?? "mois") as
//     | "semaine"
//     | "mois"
//     | "annee";

//   try {
//     const now = new Date();

//     if (period === "semaine") {
//       // Current Mon → Sun
//       const dayOfWeek = now.getDay(); // 0 = Sun
//       const monday = new Date(now);
//       monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
//       monday.setHours(0, 0, 0, 0);

//       const sunday = new Date(monday);
//       sunday.setDate(monday.getDate() + 6);
//       sunday.setHours(23, 59, 59, 999);

//       const biens = await prisma.bien.findMany({
//         where: {
//           deletedAt: null,
//           dateAcquisition: { gte: monday, lte: sunday },
//         },
//         select: { dateAcquisition: true },
//       });

//       const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
//       const values = Array(7).fill(0);

//       for (const { dateAcquisition } of biens) {
//         if (!dateAcquisition) continue;
//         const d = new Date(dateAcquisition);
//         const idx = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
//         values[idx]++;
//       }

//       const maxIdx = values.indexOf(Math.max(...values));

//       return NextResponse.json({
//         labels: DAY_LABELS,
//         values,
//         highlights: [maxIdx],
//       });
//     }

//     if (period === "mois") {
//       const year = now.getFullYear();
//       const startOfYear = new Date(year, 0, 1);
//       const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

//       const biens = await prisma.bien.findMany({
//         where: {
//           deletedAt: null,
//           dateAcquisition: { gte: startOfYear, lte: endOfYear },
//         },
//         select: { dateAcquisition: true },
//       });

//       const MONTH_LABELS = [
//         "Jan","Fév","Mar","Avr","Mai","Jun",
//         "Jui","Aoû","Sep","Oct","Nov","Déc",
//       ];
//       const values = Array(12).fill(0);

//       for (const { dateAcquisition } of biens) {
//         if (!dateAcquisition) continue;
//         values[new Date(dateAcquisition).getMonth()]++;
//       }

//       const maxIdx = values.indexOf(Math.max(...values));

//       return NextResponse.json({
//         labels: MONTH_LABELS,
//         values,
//         highlights: [maxIdx],
//       });
//     }

//     // period === "annee" — last 6 years
//     const currentYear = now.getFullYear();
//     const startYear = currentYear - 5;
//     const years = Array.from({ length: 6 }, (_, i) => startYear + i);

//     const biens = await prisma.bien.findMany({
//       where: {
//         deletedAt: null,
//         dateAcquisition: {
//           gte: new Date(startYear, 0, 1),
//           lte: new Date(currentYear, 11, 31, 23, 59, 59, 999),
//         },
//       },
//       select: { dateAcquisition: true },
//     });

//     const values = Array(6).fill(0);
//     for (const { dateAcquisition } of biens) {
//       if (!dateAcquisition) continue;
//       const y = new Date(dateAcquisition).getFullYear();
//       const idx = y - startYear;
//       if (idx >= 0 && idx < 6) values[idx]++;
//     }

//     const maxIdx = values.indexOf(Math.max(...values));

//     return NextResponse.json({
//       labels: years.map(String),
//       values,
//       highlights: [maxIdx],
//     });
//   } catch (error) {
//     console.error("[dashboard/acquisitions]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }