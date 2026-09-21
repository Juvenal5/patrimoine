import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { MIME_TYPES } from "@/app/lib/renduRapport";
import { toArrayBuffer } from "@/app/lib/helpers";

interface Params {
  params: Promise<{ id: string }>;
}

// ─── GET /api/rapports/historique/:id/download ──────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    // Next.js 16 : params est une Promise
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Identifiant du rapport manquant." },
        { status: 400 }
      );
    }

    const rapport = await prisma.rapportGenere.findUnique({
      where: {
        id,
      },
    });

    if (!rapport || !rapport.contenu) {
      return NextResponse.json(
        { error: "Rapport introuvable." },
        { status: 404 }
      );
    }

    return new NextResponse(
      toArrayBuffer(Buffer.from(rapport.contenu)),
      {
        status: 200,
        headers: {
          "Content-Type":
            MIME_TYPES[rapport.format] ||
            "application/octet-stream",

          "Content-Disposition": `attachment; filename="${rapport.nom}"`,
        },
      }
    );
  } catch (err) {
    console.error(
      "GET /api/rapports/historique/[id]/download error:",
      err
    );

    return NextResponse.json(
      {
        error:
          "Erreur lors du téléchargement du rapport.",
      },
      { status: 500 }
    );
  }
}





// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/app/lib/prisma";
// import { MIME_TYPES } from "@/app/lib/renduRapport";
// import { toArrayBuffer } from "@/app/lib/helpers";

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

//     return new NextResponse(toArrayBuffer(Buffer.from(rapport.contenu)), {
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






// import { NextRequest, NextResponse } from "next/server";
// import prisma  from "@/app/lib/prisma";

// interface Params {
//   params: { id: string };
// }

// // ─── DELETE /api/rapports/historique/:id ────────────────────────────────────
// export async function DELETE(_req: NextRequest, { params }: Params) {
//   try {
//     const rapport = await prisma.rapportGenere.findUnique({ where: { id: params.id } });
//     if (!rapport) return NextResponse.json({ error: "Rapport introuvable." }, { status: 404 });

//     await prisma.rapportGenere.delete({ where: { id: params.id } });
//     return NextResponse.json({ success: true });
//   } catch (err) {
//     console.error("DELETE /api/rapports/historique/[id] error:", err);
//     return NextResponse.json({ error: "Erreur lors de la suppression du rapport." }, { status: 500 });
//   }
// }