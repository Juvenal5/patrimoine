import { NextRequest, NextResponse } from "next/server"; 
import prisma from "@/app/lib/prisma"; 
import { MIME_TYPES } from "@/app/lib/renduRapport"; 
 
interface Params { 
  params: Promise<{ id: string }>; 
} 
 
// ─── GET /api/rapports/historique/:id/download ────────────────────────────── 
export async function GET(_req: NextRequest, { params }: Params) { 
  try { 
    const { id } = await params;

    const rapport = await prisma.rapportGenere.findUnique({ where: { id } }); 
    if (!rapport || !rapport.contenu) { 
      return NextResponse.json({ error: "Rapport introuvable." }, { status: 404 }); 
    } 
 
    return new NextResponse(Buffer.from(rapport.contenu), { 
      status: 200, 
      headers: { 
        "Content-Type": MIME_TYPES[rapport.format] || "application/octet-stream", 
        "Content-Disposition": `attachment; filename="${rapport.nom}"`, 
      }, 
    }); 
  } catch (err) { 
    console.error("GET /api/rapports/historique/[id]/download error:", err); 
    return NextResponse.json({ error: "Erreur lors du téléchargement du rapport." }, { status: 500 }); 
  } 
}






// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";
// import { MIME_TYPES } from "@/app/lib/renduRapport";

// interface Params {
//   params: { id: string };
// }

// // ─── GET /api/rapports/historique/:id/download ──────────────────────────────
// export async function GET(_req: NextRequest, { params }: Params) {
//   try {
//     const rapport = await prisma.rapportGenere.findUnique({ where: { id: params.id } });
//     if (!rapport || !rapport.contenu) {
//       return NextResponse.json({ error: "Rapport introuvable." }, { status: 404 });
//     }

//     return new NextResponse(Buffer.from(rapport.contenu), {
//       status: 200,
//       headers: {
//         "Content-Type": MIME_TYPES[rapport.format] || "application/octet-stream",
//         "Content-Disposition": `attachment; filename="${rapport.nom}"`,
//       },
//     });
//   } catch (err) {
//     console.error("GET /api/rapports/historique/[id]/download error:", err);
//     return NextResponse.json({ error: "Erreur lors du téléchargement du rapport." }, { status: 500 });
//   }
// }