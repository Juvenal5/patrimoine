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




