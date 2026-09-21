// app/api/historique/[id]/route.ts
//
// GET /api/historique/[id]
// Renvoie le détail d'une entrée d'historique, avec le diff avant/après
// au format attendu par le composant Historique.tsx :
//
// {
//   id, date, action, entite, entiteId, nomElement,
//   utilisateur: { id, nomComplet, email, role } | null,
//   champsModifies: [{ champ, avant, apres }]
// }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { prisma } from "@/app/lib/prisma";

// Champs techniques à ne jamais afficher dans le diff
const CHAMPS_IGNORES = new Set([
    "id",
    "createdAt",
    "updatedAt",
    "password",
    "motDePasse",
    "hashedPassword",
]);

/**
 * Les colonnes ancienneValeur / nouvelleValeur peuvent contenir :
 *  - du JSON stringifié ({"nom":"PC","valeur":250000})
 *  - une valeur scalaire simple ("en_cours")
 *  - null
 * Cette fonction normalise tout ça en objet exploitable.
 */
function parseValeur(valeur: unknown): Record<string, unknown> | null {
    if (valeur === null || valeur === undefined || valeur === "") return null;

    if (typeof valeur === "object") return valeur as Record<string, unknown>;

    if (typeof valeur === "string") {
        try {
            const parsed = JSON.parse(valeur);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
            return { valeur: parsed };
        } catch {
            return { valeur };
        }
    }

    return { valeur };
}

function construireDiff(
    avant: Record<string, unknown> | null,
    apres: Record<string, unknown> | null
): { champ: string; avant: unknown; apres: unknown }[] {
    if (!avant && !apres) return [];

    const cles = new Set<string>([
        ...Object.keys(avant ?? {}),
        ...Object.keys(apres ?? {}),
    ]);

    const diff: { champ: string; avant: unknown; apres: unknown }[] = [];

    for (const champ of cles) {
        if (CHAMPS_IGNORES.has(champ)) continue;

        const valeurAvant = avant?.[champ] ?? null;
        const valeurApres = apres?.[champ] ?? null;

        // On ne garde que ce qui a réellement changé
        if (JSON.stringify(valeurAvant) === JSON.stringify(valeurApres)) continue;

        diff.push({ champ, avant: valeurAvant, apres: valeurApres });
    }

    return diff;
}

function deduireNomElement(
    apres: Record<string, unknown> | null,
    avant: Record<string, unknown> | null
): string | null {
    const source = apres ?? avant;
    if (!source) return null;

    for (const cle of ["nom", "libelle", "titre", "codeInventaire", "email"]) {
        const v = source[cle];
        if (typeof v === "string" && v.trim()) return v;
    }
    return null;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    // ⚠️ Next 15+ : params est une Promise, il faut l'attendre.
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
        }

        const entree = await prisma.historique.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        if (!entree) {
            return NextResponse.json({ error: "Entrée introuvable." }, { status: 404 });
        }

        const avant = parseValeur((entree as Record<string, unknown>).ancienneValeur);
        const apres = parseValeur((entree as Record<string, unknown>).nouvelleValeur);

        const nomElementBrut = (entree as Record<string, unknown>).nomElement;

        return NextResponse.json({
            id: entree.id,
            date: entree.date,
            action: entree.action,
            entite: entree.entite,
            entiteId: entree.entiteId ?? null,
            nomElement:
                (typeof nomElementBrut === "string" && nomElementBrut) ||
                deduireNomElement(apres, avant),
            utilisateur: entree.user
                ? {
                      id: entree.user.id,
                      nomComplet: `${entree.user.prenom} ${entree.user.nom}`.trim(),
                      email: entree.user.email,
                      role: entree.user.role,
                  }
                : null,
            champsModifies: construireDiff(avant, apres),
        });
    } catch (error) {
        console.error("[GET /api/historique/[id]]", error);
        return NextResponse.json(
            { error: "Erreur serveur lors du chargement du détail." },
            { status: 500 }
        );
    }
}








// // app/api/historique/[id]/route.ts
// //
// // GET /api/historique/[id]
// // Détail complet d'une entrée, utilisé par le panneau/modal "Voir les
// // détails d'une action" (diff ancienne valeur / nouvelle valeur).

// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/lib/authOptions";
// import { prisma } from "@/app/lib/prisma";

// function safeParse(json: string | null): Record<string, unknown> | null {
//   if (!json) return null;
//   try {
//     return JSON.parse(json);
//   } catch {
//     return { valeur: json };
//   }
// }

// export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
//   const session = await getServerSession(authOptions);
//   if (!session?.user) {
//     return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
//   }

//   const entry = await prisma.historique.findUnique({
//     where: { id: params.id },
//     include: {
//       user: { select: { id: true, nom: true, prenom: true, email: true, role: true } },
//     },
//   });

//   if (!entry) {
//     return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
//   }

//   const avant = safeParse(entry.ancienneValeur);
//   const apres = safeParse(entry.nouvelleValeur);

//   const champsModifies = Array.from(
//     new Set([...Object.keys(avant ?? {}), ...Object.keys(apres ?? {})])
//   )
//     .filter((champ) => champ !== "nom")
//     .map((champ) => ({
//       champ,
//       avant: avant?.[champ] ?? null,
//       apres: apres?.[champ] ?? null,
//     }));

//   return NextResponse.json({
//     id: entry.id,
//     date: entry.date,
//     action: entry.action,
//     entite: entry.entite,
//     entiteId: entry.entiteId,
//     nomElement: (apres?.nom ?? avant?.nom ?? null) as string | null,
//     utilisateur: entry.user
//       ? {
//           id: entry.user.id,
//           nomComplet: `${entry.user.prenom} ${entry.user.nom}`.trim(),
//           email: entry.user.email,
//           role: entry.user.role,
//         }
//       : null,
//     champsModifies,
//   });
// }