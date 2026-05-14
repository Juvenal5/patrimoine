// src/app/api/biens/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// ── GET /api/biens ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search    = searchParams.get("search")    || "";
    const categorie = searchParams.get("categorie") || "";
    const etat      = searchParams.get("etat")      || "";
    const sortKey   = searchParams.get("sortKey")   || "createdAt";
    const sortDir   = searchParams.get("sortDir")   === "asc" ? "asc" : "desc";
    const limit     = parseInt(searchParams.get("limit") || "200", 10);

    const where: any = { deletedAt: null };
    if (etat)      where.etat      = etat;
    if (categorie) where.categorie = categorie;
    if (search) {
      where.OR = [
        { nom:            { contains: search, mode: "insensitive" } },
        { codeInventaire: { contains: search, mode: "insensitive" } },
        { type:           { contains: search, mode: "insensitive" } },
        { categorie:      { contains: search, mode: "insensitive" } },
        { numeroSerie:    { contains: search, mode: "insensitive" } },
        { departement:    { nom: { contains: search, mode: "insensitive" } } },
      ];
    }

    const sortMap: Record<string, any> = {
      id:          { codeInventaire: sortDir },
      designation: { nom: sortDir },
      categorie:   { categorie: sortDir },
      departement: { departement: { nom: sortDir } },
      valeur:      { valeurAchat: sortDir },
      status:      { etat: sortDir },
      dateAchat:   { dateAcquisition: sortDir },
      createdAt:   { createdAt: sortDir },
    };
    const orderBy = sortMap[sortKey] ?? { createdAt: "desc" };

    const biens = await prisma.bien.findMany({
      where,
      orderBy,
      take: limit,
      include: {
        departement: { select: { id: true, nom: true } },
        fournisseur: { select: { id: true, nom: true } },
        affectations: {
          where:   { dateRetour: null },
          orderBy: { dateAffectation: "desc" },
          take:    1,
          include: { user: { select: { id: true, nom: true, prenom: true } } },
        },
      },
    });

    return NextResponse.json(biens);
  } catch (err: any) {
    console.error("[GET /api/biens] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/biens ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      codeInventaire,
      nom,
      description,
      type,
      categorie,
      numeroSerie,
      departementId,
      fournisseurId,
      dateAcquisition,
      dateMiseService,
      valeurAchat,
      garantieFin,
      etat,
      localisation,
    } = body;

    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
    }

    // ── Auto-génération du code inventaire ──────────────────────────────────
    let code = codeInventaire?.trim();
    if (!code) {
      const count = await prisma.bien.count();
      let suffix = count + 1;
      code = `BN-${String(suffix).padStart(4, "0")}`;
      while (await prisma.bien.findUnique({ where: { codeInventaire: code } })) {
        suffix++;
        code = `BN-${String(suffix).padStart(4, "0")}`;
      }
    } else {
      const existing = await prisma.bien.findUnique({ where: { codeInventaire: code } });
      if (existing) {
        return NextResponse.json(
          { error: `Le code inventaire "${code}" est déjà utilisé.` },
          { status: 409 }
        );
      }
    }

    // ── Validation departementId ────────────────────────────────────────────
    // Seul un UUID existant en base est accepté. Chaîne texte = null (pas de crash FK).
    let validDepartementId: string | null = null;
    if (departementId) {
      const dept = await prisma.departement.findUnique({
        where:  { id: departementId },
        select: { id: true },
      });
      validDepartementId = dept?.id ?? null;
    }

    // ── Validation fournisseurId ────────────────────────────────────────────
    let validFournisseurId: string | null = null;
    if (fournisseurId) {
      const four = await prisma.fournisseur.findUnique({
        where:  { id: fournisseurId },
        select: { id: true },
      });
      validFournisseurId = four?.id ?? null;
    }

    const bien = await prisma.bien.create({
      data: {
        codeInventaire:  code,
        nom:             nom.trim(),
        description:     description  || null,
        type:            type         || null,
        categorie:       categorie    || null,
        numeroSerie:     numeroSerie  || null,
        departementId:   validDepartementId,  // ✅ UUID vérifié ou null
        fournisseurId:   validFournisseurId,  // ✅ UUID vérifié ou null
        dateAcquisition: dateAcquisition ? new Date(dateAcquisition) : null,
        dateMiseService: dateMiseService ? new Date(dateMiseService) : null,
        valeurAchat:     valeurAchat != null ? parseFloat(valeurAchat) : null,
        garantieFin:     garantieFin ? new Date(garantieFin) : null,
        etat:            etat         || "actif",
        localisation:    localisation || null,
      },
      include: {
        departement: { select: { id: true, nom: true } },
        affectations: {
          where:   { dateRetour: null },
          take:    1,
          include: { user: { select: { id: true, nom: true, prenom: true } } },
        },
      },
    });

    return NextResponse.json(bien, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/biens] Error", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Ce code inventaire existe déjà." }, { status: 409 });
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "Département ou fournisseur introuvable. Vérifiez votre sélection." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



// // app/api/biens/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import prisma from "../../lib/prisma";

// /**
//  * GET /api/biens
//  *
//  * Query params:
//  *   status   "actif" | "maintenance" | "inactif"  (omit for all)
//  *   search   string  – searches nom, codeInventaire, categorie, departement.nom
//  *   sortKey  "id" | "name" | "department" | "date" | "status" | "value"
//  *   sortDir  "asc" | "desc"   (default: "desc")
//  *   page     number           (default: 1)
//  *   limit    number           (default: 50, max: 200)
//  *
//  * Response:
//  * {
//  *   biens: Asset[],
//  *   total: number,
//  *   page:  number,
//  *   pages: number
//  * }
//  *
//  * ─────────────────────────────────────────────────────────────────────────────
//  *
//  * POST /api/biens
//  *
//  * Body (JSON):
//  * {
//  *   name:         string    (required)
//  *   category:     string
//  *   departmentId: string    (UUID of Departement)
//  *   value:        number
//  *   status:       "actif" | "maintenance" | "inactif"
//  *   fournisseurId?: string
//  *   numeroSerie?:   string
//  *   localisation?:  string
//  * }
//  *
//  * Returns the newly created bien as an Asset object.
//  */

// // ── Helpers ───────────────────────────────────────────────────────────────────

// /** Map Dashboard sortKey → Prisma orderBy field */
// const SORT_MAP: Record<string, object> = {
//   id:         { codeInventaire: "asc" },
//   name:       { nom: "asc" },
//   department: { departement: { nom: "asc" } },
//   date:       { dateAcquisition: "asc" },
//   status:     { etat: "asc" },
//   value:      { valeurAchat: "asc" },
// };

// /** Shape a Prisma bien row into the Asset type used by Dashboard.tsx */
// function toAsset(b: {
//   id: string;
//   codeInventaire: string;
//   nom: string;
//   categorie: string | null;
//   departement: { nom: string } | null;
//   etat: string | null;
//   dateAcquisition: Date | null;
//   valeurAchat: number | null;
//   createdAt: Date;
// }) {
//   return {
//     id:         b.codeInventaire,
//     name:       b.nom,
//     category:   b.categorie ?? "—",
//     department: b.departement?.nom ?? "—",
//     status:     b.etat ?? "inactif",
//     date:       (b.dateAcquisition ?? b.createdAt).toLocaleDateString("fr-FR", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     }),
//     value: b.valeurAchat ?? 0,
//     _id: b.id, // internal UUID, useful for further API calls
//   };
// }

// // ── GET ───────────────────────────────────────────────────────────────────────

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);

//   const status  = searchParams.get("status") ?? "";
//   const search  = searchParams.get("search") ?? "";
//   const sortKey = searchParams.get("sortKey") ?? "date";
//   const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc";
//   const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
//   const limit   = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

//   try {
//     // ── Where clause ──────────────────────────────────────────────────────────
//     const where: Parameters<typeof prisma.bien.findMany>[0]["where"] = {
//       deletedAt: null,
//     };

//     if (status && status !== "all") {
//       where.etat = status;
//     }

//     if (search) {
//       where.OR = [
//         { nom:            { contains: search, mode: "insensitive" } },
//         { codeInventaire: { contains: search, mode: "insensitive" } },
//         { categorie:      { contains: search, mode: "insensitive" } },
//         { departement: { nom: { contains: search, mode: "insensitive" } } },
//       ];
//     }

//     // ── Order by ──────────────────────────────────────────────────────────────
//     const baseOrder = SORT_MAP[sortKey] ?? { dateAcquisition: "asc" };
//     // Apply the requested direction to the first (and only) key in baseOrder
//     const orderBy = Object.fromEntries(
//       Object.entries(baseOrder).map(([k, v]) => {
//         if (typeof v === "object") {
//           // nested field e.g. { departement: { nom: "asc" } }
//           const [nestedKey, _nestedDir] = Object.entries(v as object)[0];
//           return [k, { [nestedKey]: sortDir }];
//         }
//         return [k, sortDir];
//       })
//     );

//     // ── Query ─────────────────────────────────────────────────────────────────
//     const [total, biens] = await Promise.all([
//       prisma.bien.count({ where }),
//       prisma.bien.findMany({
//         where,
//         orderBy,
//         skip:  (page - 1) * limit,
//         take:  limit,
//         select: {
//           id:              true,
//           codeInventaire:  true,
//           nom:             true,
//           categorie:       true,
//           etat:            true,
//           dateAcquisition: true,
//           valeurAchat:     true,
//           createdAt:       true,
//           departement: { select: { nom: true } },
//         },
//       }),
//     ]);

//     return NextResponse.json({
//       biens: biens.map(toAsset),
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//     });
//   } catch (error) {
//     console.error("[biens GET]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }

// // ── POST ──────────────────────────────────────────────────────────────────────

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { name, category, departmentId, value, status, fournisseurId, numeroSerie, localisation } = body;

//     // ── Validation ─────────────────────────────────────────────────────────
//     if (!name || typeof name !== "string" || name.trim() === "") {
//       return NextResponse.json({ error: "Le champ 'name' est requis." }, { status: 400 });
//     }

//     // ── Generate codeInventaire ────────────────────────────────────────────
//     const lastBien = await prisma.bien.findFirst({
//       orderBy: { createdAt: "desc" },
//       select: { codeInventaire: true },
//     });

//     let nextNumber = 1;
//     if (lastBien?.codeInventaire) {
//       const match = lastBien.codeInventaire.match(/(\d+)$/);
//       if (match) nextNumber = parseInt(match[1], 10) + 1;
//     }
//     const codeInventaire = `BN-${String(nextNumber).padStart(4, "0")}`;

//     // ── Create ─────────────────────────────────────────────────────────────
//     const bien = await prisma.bien.create({
//       data: {
//         codeInventaire,
//         nom:             name.trim(),
//         categorie:       category    ?? null,
//         departementId:   departmentId ?? null,
//         valeurAchat:     value != null ? Number(value) : null,
//         etat:            status      ?? "actif",
//         fournisseurId:   fournisseurId ?? null,
//         numeroSerie:     numeroSerie   ?? null,
//         localisation:    localisation  ?? null,
//         dateAcquisition: new Date(),
//       },
//       select: {
//         id:              true,
//         codeInventaire:  true,
//         nom:             true,
//         categorie:       true,
//         etat:            true,
//         dateAcquisition: true,
//         valeurAchat:     true,
//         createdAt:       true,
//         departement: { select: { nom: true } },
//       },
//     });

//     return NextResponse.json({ bien: toAsset(bien) }, { status: 201 });
//   } catch (error) {
//     console.error("[biens POST]", error);
//     return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
//   }
// }