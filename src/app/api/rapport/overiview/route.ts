import { NextRequest, NextResponse } from "next/server";
import { buildOverview } from "@/app/lib/rapports";

// ─── GET /api/rapports/overview?periode=...&debut=...&fin=... ──────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periode = searchParams.get("periode") || "month";
    const debut = searchParams.get("debut");
    const fin = searchParams.get("fin");

    const overview = await buildOverview(periode, debut, fin);
    return NextResponse.json(overview);
  } catch (err) {
    console.error("GET /api/rapports/overview error:", err);
    return NextResponse.json({ error: "Erreur lors du calcul des statistiques." }, { status: 500 });
  }
}