import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// ⚠️ Ajuster ce chemin d'import vers l'emplacement réel de vos options NextAuth
// (ex: "@/lib/authOptions" ou "@/app/api/auth/[...nextauth]/route").
import { authOptions } from "@/app/lib/authOptions";
import { prisma } from "@/app/lib/prisma";
import { genererDonneesRapport } from "@/app/lib/generateurRapport";
import { rendreCsv, rendreExcel, rendrePdf, MIME_TYPES, EXTENSIONS } from "@/app/lib/renduRapport";
import { toArrayBuffer } from "@/app/lib/helpers";

const NOMS_TYPES: Record<string, string> = {
  inventaire: "Inventaire des biens",
  financier: "Rapport financier",
  maintenance: "Maintenance",
  affectations: "Affectations",
  departements: "Par département",
  alertes: "Alertes et garanties",
};

// ─── POST /api/rapports/generate ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const body = await req.json();
    const { type, format } = body as { type: string; format: "pdf" | "excel" | "csv" };

    if (!type || !NOMS_TYPES[type]) {
      return NextResponse.json({ error: "Type de rapport invalide." }, { status: 400 });
    }
    if (!format || !MIME_TYPES[format]) {
      return NextResponse.json({ error: "Format invalide." }, { status: 400 });
    }

    const filtres = {
      departementId: body.departementId || undefined,
      categorie: body.categorie || undefined,
      statut: body.statut || undefined,
      periodeDebut: body.periodeDebut || undefined,
      periodeFin: body.periodeFin || undefined,
    };

    const donnees = await genererDonneesRapport(type, filtres);

    let buffer: Buffer;
    if (format === "csv") buffer = rendreCsv(donnees);
    else if (format === "excel") buffer = await rendreExcel(donnees);
    else buffer = await rendrePdf(donnees);

    const horodatage = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const nomFichier = `${NOMS_TYPES[type].normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").toLowerCase()}-${horodatage}.${EXTENSIONS[format]}`;

    await prisma.rapportGenere.create({
      data: {
        userId,
        nom: nomFichier,
        type,
        format,
        departementId: filtres.departementId || null,
        categorie: filtres.categorie || null,
        statut: filtres.statut || null,
        periodeDebut: filtres.periodeDebut ? new Date(filtres.periodeDebut) : null,
        periodeFin: filtres.periodeFin ? new Date(filtres.periodeFin) : null,
        contenu: buffer,
      },
    });

    return new NextResponse(toArrayBuffer(buffer), {
      status: 200,
      headers: {
        "Content-Type": MIME_TYPES[format],
        "Content-Disposition": `attachment; filename="${nomFichier}"`,
      },
    });
  } catch (err) {
    console.error("POST /api/rapports/generate error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération du rapport." }, { status: 500 });
  }
}






// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// // ⚠️ Ajuster ce chemin d'import vers l'emplacement réel de vos options NextAuth
// // (ex: "@/lib/authOptions" ou "@/app/api/auth/[...nextauth]/route").
// import { authOptions } from "@/app/lib/authOptions";
// import   prisma from "@/app/lib/prisma";
// import { genererDonneesRapport } from "@/app/lib/generateurRapport";
// import { rendreCsv, rendreExcel, rendrePdf, MIME_TYPES, EXTENSIONS } from "@/app/lib/renduRapport";

// const NOMS_TYPES: Record<string, string> = {
//   inventaire: "Inventaire des biens",
//   financier: "Rapport financier",
//   maintenance: "Maintenance",
//   affectations: "Affectations",
//   departements: "Par département",
//   alertes: "Alertes et garanties",
// };

// // ─── POST /api/rapports/generate ────────────────────────────────────────────
// export async function POST(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions).catch(() => null);
//     const userId = (session as any)?.user?.id as string | undefined;
//     if (!userId) {
//       return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
//     }

//     const body = await req.json();
//     const { type, format } = body as { type: string; format: "pdf" | "excel" | "csv" };

//     if (!type || !NOMS_TYPES[type]) {
//       return NextResponse.json({ error: "Type de rapport invalide." }, { status: 400 });
//     }
//     if (!format || !MIME_TYPES[format]) {
//       return NextResponse.json({ error: "Format invalide." }, { status: 400 });
//     }

//     const filtres = {
//       departementId: body.departementId || undefined,
//       categorie: body.categorie || undefined,
//       statut: body.statut || undefined,
//       periodeDebut: body.periodeDebut || undefined,
//       periodeFin: body.periodeFin || undefined,
//     };

//     const donnees = await genererDonneesRapport(type, filtres);

//     let buffer: Buffer;
//     if (format === "csv") buffer = rendreCsv(donnees);
//     else if (format === "excel") buffer = await rendreExcel(donnees);
//     else buffer = await rendrePdf(donnees);

//     const horodatage = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
//     const nomFichier = `${NOMS_TYPES[type].normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").toLowerCase()}-${horodatage}.${EXTENSIONS[format]}`;

//     await prisma.rapportGenere.create({
//       data: {
//         userId,
//         nom: nomFichier,
//         type,
//         format,
//         departementId: filtres.departementId || null,
//         categorie: filtres.categorie || null,
//         statut: filtres.statut || null,
//         periodeDebut: filtres.periodeDebut ? new Date(filtres.periodeDebut) : null,
//         periodeFin: filtres.periodeFin ? new Date(filtres.periodeFin) : null,
//         contenu: buffer,
//       },
//     });

//     return new NextResponse(buffer, {
//       status: 200,
//       headers: {
//         "Content-Type": MIME_TYPES[format],
//         "Content-Disposition": `attachment; filename="${nomFichier}"`,
//       },
//     });
//   } catch (err) {
//     console.error("POST /api/rapports/generate error:", err);
//     return NextResponse.json({ error: "Erreur lors de la génération du rapport." }, { status: 500 });
//   }
// }