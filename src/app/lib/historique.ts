// lib/historique.ts
//
// Point d'entrée UNIQUE pour écrire dans le journal d'audit (`Historique`).
// Toutes les routes API de PatrimoineX (biens, Utilisateurs, affectation,
// maintenances, departements, fournisseurs, auth) doivent appeler
// `logHistorique(...)` après une opération réussie, au lieu d'écrire
// directement via `prisma.historique.create`.
//
// Exemple d'intégration dans une route existante (ex: PATCH /api/biens/[id]) :
//
//   import { logHistorique, diffChanges } from "@/lib/historique";
//
//   const avant = await prisma.bien.findUnique({ where: { id } });
//   const bienModifie = await prisma.bien.update({ where: { id }, data });
//
//   const changements = diffChanges(avant, data, ["nom", "valeurAchat", "etat", "localisation"]);
//   if (changements) {
//     await logHistorique({
//       userId: session.user.id,
//       action: changements.apres.valeurAchat !== undefined ? "VALEUR_MODIFIEE" : "MODIFICATION",
//       entite: "Bien",
//       entiteId: bienModifie.id,
//       nom: bienModifie.nom,
//       ancienneValeur: changements.avant,
//       nouvelleValeur: changements.apres,
//     });
//   }

import { prisma } from "@/app/lib/prisma";
import type { HistoriqueAction, HistoriqueEntite } from "@/app/lib/historique-labels";

type Primitive = string | number | boolean | null | undefined;
type ValeurJournalisable = Record<string, Primitive> | Primitive;

interface LogHistoriqueParams {
  /** Identifiant de l'utilisateur qui a réalisé l'action (session.user.id) */
  userId: string;
  action: HistoriqueAction;
  entite: HistoriqueEntite;
  /** Identifiant de l'enregistrement concerné (bien.id, user.id, etc.) */
  entiteId?: string;
  /**
   * Nom lisible de l'élément concerné (ex: "MacBook Pro 16").
   * Injecté automatiquement dans `nouvelleValeur.nom` (ou `ancienneValeur.nom`
   * si `nouvelleValeur` est vide) pour que la liste Historique puisse
   * l'afficher sans avoir à re-joindre 6 tables différentes.
   */
  nom?: string;
  ancienneValeur?: ValeurJournalisable;
  nouvelleValeur?: ValeurJournalisable;
}

function toRecord(valeur: ValeurJournalisable | undefined): Record<string, Primitive> | undefined {
  if (valeur === undefined || valeur === null) return undefined;
  if (typeof valeur === "object") return valeur as Record<string, Primitive>;
  return { valeur };
}

function serialize(valeur: Record<string, Primitive> | undefined): string | null {
  if (!valeur || Object.keys(valeur).length === 0) return null;
  try {
    return JSON.stringify(valeur);
  } catch {
    return null;
  }
}

/**
 * Enregistre une entrée dans le journal d'audit. Ne lève jamais d'exception :
 * un échec de journalisation ne doit jamais faire échouer l'action métier
 * principale (création d'un bien, affectation, etc.).
 */
export async function logHistorique({
  userId,
  action,
  entite,
  entiteId,
  nom,
  ancienneValeur,
  nouvelleValeur,
}: LogHistoriqueParams): Promise<void> {
  try {
    const avant = toRecord(ancienneValeur);
    const apres = toRecord(nouvelleValeur);

    if (nom) {
      if (apres) apres.nom = nom;
      else if (avant) avant.nom = nom;
    }

    await prisma.historique.create({
      data: {
        userId,
        action,
        entite,
        entiteId,
        ancienneValeur: serialize(avant),
        nouvelleValeur: serialize(apres ?? (nom ? { nom } : undefined)),
      },
    });
  } catch (error) {
    console.error("[logHistorique] Échec de l'enregistrement d'une entrée d'audit:", error);
  }
}

/**
 * Compare deux objets et ne retient que les champs qui ont réellement changé.
 * Retourne `null` si aucun champ suivi n'a changé (évite de créer une entrée
 * d'historique vide lors d'un simple "Enregistrer" sans modification réelle).
 */
export function diffChanges<T extends Record<string, any>>(
  avantComplet: T | null | undefined,
  apresPartiel: Partial<T>,
  champsSuivis?: (keyof T)[]
): { avant: Partial<T>; apres: Partial<T> } | null {
  if (!avantComplet) return null;
  const cles = champsSuivis ?? (Object.keys(apresPartiel) as (keyof T)[]);
  const avant: Partial<T> = {};
  const apres: Partial<T> = {};
  let modifie = false;

  for (const cle of cles) {
    const nouvelleValeur = apresPartiel[cle];
    if (nouvelleValeur === undefined) continue;
    if (avantComplet[cle] !== nouvelleValeur) {
      avant[cle] = avantComplet[cle];
      apres[cle] = nouvelleValeur;
      modifie = true;
    }
  }

  return modifie ? { avant, apres } : null;
}