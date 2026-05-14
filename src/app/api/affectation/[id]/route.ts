// src/app/api/affectations/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

// ── GET /api/affectations/:id ─────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    // IMPORTANT
    const { id } = await params;

    const aff = await prisma.affectation.findUnique({
      where: { id },
      include: {
        bien: {
          select: {
            id: true,
            codeInventaire: true,
            nom: true,
            categorie: true,
            etat: true,
            localisation: true,
            departement: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
      },
    });

    if (!aff) {
      return NextResponse.json(
        { error: "Affectation introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json(aff);

  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// ── PUT /api/affectations/:id ─────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  try {
    // IMPORTANT
    const { id } = await params;

    const body = await req.json();

    const {
      dateRetour,
      statut,
      commentaire,
      datePrevisionRetour,
    } = body;

    const existing = await prisma.affectation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Affectation introuvable." },
        { status: 404 }
      );
    }

    const updated = await prisma.affectation.update({
      where: { id },
      data: {
        dateRetour: dateRetour
          ? new Date(dateRetour)
          : existing.dateRetour,

        datePrevisionRetour: datePrevisionRetour
          ? new Date(datePrevisionRetour)
          : existing.datePrevisionRetour,

        statut: statut ?? existing.statut,

        commentaire: commentaire ?? existing.commentaire,
      },

      include: {
        bien: {
          select: {
            id: true,
            codeInventaire: true,
            nom: true,
          },
        },

        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
          },
        },
      },
    });

    // Si retour effectué → bien devient inactif
    if (dateRetour && !existing.dateRetour) {
      await prisma.bien.update({
        where: {
          id: existing.bienId,
        },
        data: {
          etat: "inactif",
        },
      });
    }

    return NextResponse.json(updated);

  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// ── DELETE /api/affectations/:id ──────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    // IMPORTANT
    const { id } = await params;

    await prisma.affectation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });

  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}





// // src/app/api/affectations/[id]/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/app/lib/prisma";

// type Params = { params: { id: string } };

// // ── GET /api/affectations/:id ─────────────────────────────────────────────────
// export async function GET(_req: NextRequest, { params }: Params) {
//   try {
//     const aff = await prisma.affectation.findUnique({
//       where: { id: params.id },
//       include: {
//         bien: {
//           select: {
//             id: true, codeInventaire: true, nom: true, categorie: true,
//             etat: true, localisation: true,
//             departement: { select: { id: true, nom: true } },
//           },
//         },
//         user: {
//           select: { id: true, nom: true, prenom: true, email: true },
//         },
//       },
//     });
//     if (!aff) return NextResponse.json({ error: "Affectation introuvable." }, { status: 404 });
//     return NextResponse.json(aff);
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // ── PUT /api/affectations/:id  (update or return) ────────────────────────────
// export async function PUT(req: NextRequest, { params }: Params) {
//   try {
//     const body = await req.json();
//     const { dateRetour, statut, commentaire, datePrevisionRetour } = body;

//     const existing = await prisma.affectation.findUnique({ where: { id: params.id } });
//     if (!existing) return NextResponse.json({ error: "Affectation introuvable." }, { status: 404 });

//     const updated = await prisma.affectation.update({
//       where: { id: params.id },
//       data: {
//         dateRetour: dateRetour ? new Date(dateRetour) : existing.dateRetour,
//         datePrevisionRetour: datePrevisionRetour ? new Date(datePrevisionRetour) : existing.datePrevisionRetour,
//         statut: statut ?? existing.statut,
//         commentaire: commentaire ?? existing.commentaire,
//       },
//       include: {
//         bien: { select: { id: true, codeInventaire: true, nom: true } },
//         user: { select: { id: true, nom: true, prenom: true } },
//       },
//     });

//     // If returned, mark the bien as inactif
//     if (dateRetour && !existing.dateRetour) {
//       await prisma.bien.update({
//         where: { id: existing.bienId },
//         data: { etat: "inactif" },
//       });
//     }

//     return NextResponse.json(updated);
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // ── DELETE /api/affectations/:id ──────────────────────────────────────────────
// export async function DELETE(_req: NextRequest, { params }: Params) {
//   try {
//     await prisma.affectation.delete({ where: { id: params.id } });
//     return NextResponse.json({ success: true });
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }