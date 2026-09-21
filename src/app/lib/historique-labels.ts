// lib/historique-labels.ts
//
// Configuration centrale des actions et entités journalisées dans le modèle
// Prisma `Historique`. Ce fichier ne dépend d'aucune librairie UI : il peut
// être importé aussi bien côté serveur (routes API, export CSV) que côté
// client (page Historique.tsx) pour garantir des libellés identiques partout.

export type HistoriqueEntite =
  | "Bien"
  | "Utilisateur"
  | "Departement"
  | "Fournisseur"
  | "Maintenance"
  | "Affectation";

export type HistoriqueAction =
  | "CREATION"
  | "MODIFICATION"
  | "SUPPRESSION"
  | "ARCHIVAGE"
  | "AFFECTATION"
  | "RETOUR"
  | "ANNULATION"
  | "MAINTENANCE_DEMARREE"
  | "MAINTENANCE_TERMINEE"
  | "STATUT_MODIFIE"
  | "VALEUR_MODIFIEE"
  | "ROLE_MODIFIE"
  | "MOT_DE_PASSE_MODIFIE"
  | "COMPTE_DESACTIVE"
  | "CONNEXION";

export const ENTITE_LABELS: Record<HistoriqueEntite, string> = {
  Bien: "Biens",
  Utilisateur: "Utilisateurs",
  Departement: "Départements",
  Fournisseur: "Fournisseurs",
  Maintenance: "Maintenance",
  Affectation: "Affectations",
};

export const ENTITE_EMOJI: Record<HistoriqueEntite, string> = {
  Bien: "📦",
  Utilisateur: "👤",
  Departement: "🏢",
  Fournisseur: "🚚",
  Maintenance: "🔧",
  Affectation: "🔄",
};

export const ACTION_LABELS: Record<HistoriqueAction, string> = {
  CREATION: "Création",
  MODIFICATION: "Modification",
  SUPPRESSION: "Suppression",
  ARCHIVAGE: "Archivage",
  AFFECTATION: "Affectation",
  RETOUR: "Retour",
  ANNULATION: "Annulation",
  MAINTENANCE_DEMARREE: "Maintenance démarrée",
  MAINTENANCE_TERMINEE: "Maintenance terminée",
  STATUT_MODIFIE: "Statut modifié",
  VALEUR_MODIFIEE: "Valeur modifiée",
  ROLE_MODIFIE: "Rôle modifié",
  MOT_DE_PASSE_MODIFIE: "Mot de passe modifié",
  COMPTE_DESACTIVE: "Compte désactivé",
  CONNEXION: "Connexion",
};

// Utilisé pour la couleur du badge / point de timeline
export const ACTION_TONE: Record<
  HistoriqueAction,
  "success" | "info" | "danger" | "warning" | "neutral"
> = {
  CREATION: "success",
  MODIFICATION: "info",
  SUPPRESSION: "danger",
  ARCHIVAGE: "neutral",
  AFFECTATION: "info",
  RETOUR: "neutral",
  ANNULATION: "danger",
  MAINTENANCE_DEMARREE: "warning",
  MAINTENANCE_TERMINEE: "success",
  STATUT_MODIFIE: "warning",
  VALEUR_MODIFIEE: "warning",
  ROLE_MODIFIE: "info",
  MOT_DE_PASSE_MODIFIE: "neutral",
  COMPTE_DESACTIVE: "danger",
  CONNEXION: "neutral",
};

export type PeriodeFiltre =
  | "aujourdhui"
  | "semaine"
  | "mois"
  | "annee"
  | "personnalisee"
  | "tout";

export const PERIODE_LABELS: Record<PeriodeFiltre, string> = {
  aujourdhui: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois",
  annee: "Cette année",
  personnalisee: "Personnalisée",
  tout: "Toute la période",
};

// Champs monétaires : formatés en XOF plutôt qu'affichés bruts
export const CHAMPS_MONETAIRES = new Set([
  "valeur",
  "valeurAchat",
  "cout",
  "prix",
  "montant",
]);

export function formatXOF(valeur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(valeur);
}

/**
 * Calcule les bornes de dates [debut, fin] pour une période de filtre donnée.
 * Retourne `null` pour "tout" (pas de filtre de date).
 */
export function getPlageDates(
  periode: PeriodeFiltre,
  dateDebut?: string | null,
  dateFin?: string | null
): { debut: Date; fin: Date } | null {
  const maintenant = new Date();
  const finJour = new Date(maintenant);
  finJour.setHours(23, 59, 59, 999);

  switch (periode) {
    case "aujourdhui": {
      const debut = new Date(maintenant);
      debut.setHours(0, 0, 0, 0);
      return { debut, fin: finJour };
    }
    case "semaine": {
      const debut = new Date(maintenant);
      const jour = debut.getDay() === 0 ? 7 : debut.getDay(); // lundi = 1
      debut.setDate(debut.getDate() - (jour - 1));
      debut.setHours(0, 0, 0, 0);
      return { debut, fin: finJour };
    }
    case "mois": {
      const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
      return { debut, fin: finJour };
    }
    case "annee": {
      const debut = new Date(maintenant.getFullYear(), 0, 1);
      return { debut, fin: finJour };
    }
    case "personnalisee": {
      if (!dateDebut || !dateFin) return null;
      const debut = new Date(dateDebut);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin };
    }
    case "tout":
    default:
      return null;
  }
}