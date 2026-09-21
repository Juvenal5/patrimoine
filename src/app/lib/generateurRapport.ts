import prisma from "./prisma";

export interface Filtres {
  departementId?: string;
  categorie?: string;
  statut?: string;
  periodeDebut?: string;
  periodeFin?: string;
}

export interface DonneesRapport {
  titre: string;
  colonnes: { cle: string; label: string }[];
  lignes: Record<string, string | number>[];
}

const fmtDate = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const fmtVal = (v: number | null | undefined) => (v != null ? String(v) : "0");

// ─── Rapport : inventaire des biens ─────────────────────────────────────────
async function rapportInventaire(f: Filtres): Promise<DonneesRapport> {
  const biens = await prisma.bien.findMany({
    where: {
      deletedAt: null,
      ...(f.departementId ? { departementId: f.departementId } : {}),
      ...(f.categorie ? { categorie: f.categorie } : {}),
      ...(f.statut ? { etat: f.statut } : {}),
      ...(f.periodeDebut || f.periodeFin
        ? {
            dateAcquisition: {
              ...(f.periodeDebut ? { gte: new Date(f.periodeDebut) } : {}),
              ...(f.periodeFin ? { lte: new Date(f.periodeFin) } : {}),
            },
          }
        : {}),
    },
    include: { departement: { select: { nom: true } }, fournisseur: { select: { nom: true } } },
    orderBy: { codeInventaire: "asc" },
  });

  return {
    titre: "Inventaire des biens",
    colonnes: [
      { cle: "code", label: "Code inventaire" }, { cle: "nom", label: "Désignation" },
      { cle: "categorie", label: "Catégorie" }, { cle: "etat", label: "Statut" },
      { cle: "departement", label: "Département" }, { cle: "fournisseur", label: "Fournisseur" },
      { cle: "dateAcquisition", label: "Date d'achat" }, { cle: "valeur", label: "Valeur (FCFA)" },
    ],
    lignes: biens.map((b) => ({
      code: b.codeInventaire, nom: b.nom, categorie: b.categorie || "—", etat: b.etat || "—",
      departement: b.departement?.nom || "—", fournisseur: b.fournisseur?.nom || "—",
      dateAcquisition: fmtDate(b.dateAcquisition), valeur: fmtVal(b.valeurAchat),
    })),
  };
}

// ─── Rapport : financier ─────────────────────────────────────────────────────
async function rapportFinancier(f: Filtres): Promise<DonneesRapport> {
  const departements = await prisma.departement.findMany({
    include: {
      biens: {
        where: {
          deletedAt: null,
          ...(f.categorie ? { categorie: f.categorie } : {}),
          ...(f.statut ? { etat: f.statut } : {}),
        },
        select: { valeurAchat: true, categorie: true },
      },
    },
    where: f.departementId ? { id: f.departementId } : undefined,
    orderBy: { nom: "asc" },
  });

  return {
    titre: "Rapport financier — valeur du patrimoine",
    colonnes: [
      { cle: "departement", label: "Département" }, { cle: "nbBiens", label: "Nombre de biens" },
      { cle: "valeurTotale", label: "Valeur totale (FCFA)" }, { cle: "valeurMoyenne", label: "Valeur moyenne (FCFA)" },
    ],
    lignes: departements.map((d) => {
      const valeurTotale = d.biens.reduce((s, b) => s + (b.valeurAchat || 0), 0);
      return {
        departement: d.nom, nbBiens: d.biens.length, valeurTotale,
        valeurMoyenne: d.biens.length ? Math.round(valeurTotale / d.biens.length) : 0,
      };
    }),
  };
}

// ─── Rapport : maintenance ───────────────────────────────────────────────────
async function rapportMaintenance(f: Filtres): Promise<DonneesRapport> {
  const maintenances = await prisma.maintenance.findMany({
    where: {
      ...(f.statut ? { statut: f.statut } : {}),
      ...(f.periodeDebut || f.periodeFin
        ? {
            createdAt: {
              ...(f.periodeDebut ? { gte: new Date(f.periodeDebut) } : {}),
              ...(f.periodeFin ? { lte: new Date(f.periodeFin) } : {}),
            },
          }
        : {}),
      bien: {
        deletedAt: null,
        ...(f.departementId ? { departementId: f.departementId } : {}),
        ...(f.categorie ? { categorie: f.categorie } : {}),
      },
    },
    include: { bien: { select: { nom: true, codeInventaire: true } }, fournisseur: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    titre: "Rapport de maintenance",
    colonnes: [
      { cle: "bien", label: "Bien" }, { cle: "code", label: "Code" }, { cle: "type", label: "Type" },
      { cle: "statut", label: "Statut" }, { cle: "debut", label: "Début" }, { cle: "fin", label: "Fin prévue" },
      { cle: "cout", label: "Coût (FCFA)" }, { cle: "fournisseur", label: "Fournisseur" },
    ],
    lignes: maintenances.map((m) => ({
      bien: m.bien.nom, code: m.bien.codeInventaire, type: m.type || "—", statut: m.statut || "—",
      debut: fmtDate(m.dateDebut), fin: fmtDate(m.dateFin), cout: fmtVal(m.cout), fournisseur: m.fournisseur?.nom || "—",
    })),
  };
}

// ─── Rapport : affectations ──────────────────────────────────────────────────
async function rapportAffectations(f: Filtres): Promise<DonneesRapport> {
  const affectations = await prisma.affectation.findMany({
    where: {
      ...(f.statut ? { statut: f.statut } : {}),
      ...(f.periodeDebut || f.periodeFin
        ? {
            dateAffectation: {
              ...(f.periodeDebut ? { gte: new Date(f.periodeDebut) } : {}),
              ...(f.periodeFin ? { lte: new Date(f.periodeFin) } : {}),
            },
          }
        : {}),
      bien: {
        deletedAt: null,
        ...(f.departementId ? { departementId: f.departementId } : {}),
        ...(f.categorie ? { categorie: f.categorie } : {}),
      },
    },
    include: { bien: { select: { nom: true, codeInventaire: true } }, user: { select: { nom: true, prenom: true } } },
    orderBy: { dateAffectation: "desc" },
  });

  return {
    titre: "Rapport des affectations",
    colonnes: [
      { cle: "bien", label: "Bien" }, { cle: "utilisateur", label: "Utilisateur" }, { cle: "statut", label: "Statut" },
      { cle: "affecteLe", label: "Affecté le" }, { cle: "retourPrevu", label: "Retour prévu" }, { cle: "retourReel", label: "Retour réel" },
    ],
    lignes: affectations.map((a) => ({
      bien: `${a.bien.nom} (${a.bien.codeInventaire})`, utilisateur: `${a.user.prenom} ${a.user.nom}`,
      statut: a.statut || "—", affecteLe: fmtDate(a.dateAffectation), retourPrevu: fmtDate(a.datePrevisionRetour),
      retourReel: fmtDate(a.dateRetour),
    })),
  };
}

// ─── Rapport : par département ───────────────────────────────────────────────
async function rapportDepartements(): Promise<DonneesRapport> {
  const departements = await prisma.departement.findMany({
    include: { users: { select: { id: true } }, biens: { where: { deletedAt: null }, select: { valeurAchat: true, etat: true } } },
    orderBy: { nom: "asc" },
  });

  return {
    titre: "Comparaison des départements",
    colonnes: [
      { cle: "departement", label: "Département" }, { cle: "agents", label: "Agents" },
      { cle: "biens", label: "Biens" }, { cle: "actifs", label: "Biens actifs" }, { cle: "valeur", label: "Valeur (FCFA)" },
    ],
    lignes: departements.map((d) => ({
      departement: d.nom, agents: d.users.length, biens: d.biens.length,
      actifs: d.biens.filter((b) => b.etat === "actif").length,
      valeur: d.biens.reduce((s, b) => s + (b.valeurAchat || 0), 0),
    })),
  };
}

// ─── Rapport : alertes et garanties ──────────────────────────────────────────
async function rapportAlertes(): Promise<DonneesRapport> {
  const maintenant = new Date();
  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);

  const [garanties, maintenancesRetard, inactifs] = await Promise.all([
    prisma.bien.findMany({
      where: { deletedAt: null, garantieFin: { lte: dansTrenteJours }, NOT: { garantieFin: null } },
      select: { nom: true, codeInventaire: true, garantieFin: true },
    }),
    prisma.maintenance.findMany({
      where: { statut: "en_cours", dateFin: { lt: maintenant }, NOT: { dateFin: null } },
      include: { bien: { select: { nom: true, codeInventaire: true } } },
    }),
    prisma.bien.findMany({
      where: { deletedAt: null, etat: "inactif" },
      select: { nom: true, codeInventaire: true, updatedAt: true },
    }),
  ]);

  const lignes: Record<string, string | number>[] = [
    ...garanties.map((b) => ({ type: "Garantie", bien: `${b.nom} (${b.codeInventaire})`, detail: `Échéance : ${fmtDate(b.garantieFin)}` })),
    ...maintenancesRetard.map((m) => ({ type: "Maintenance en retard", bien: `${m.bien.nom} (${m.bien.codeInventaire})`, detail: `Fin prévue : ${fmtDate(m.dateFin)}` })),
    ...inactifs.map((b) => ({ type: "Bien inactif", bien: `${b.nom} (${b.codeInventaire})`, detail: `Depuis le ${fmtDate(b.updatedAt)}` })),
  ];

  return {
    titre: "Alertes et garanties",
    colonnes: [{ cle: "type", label: "Type d'alerte" }, { cle: "bien", label: "Bien" }, { cle: "detail", label: "Détail" }],
    lignes,
  };
}

export async function genererDonneesRapport(type: string, filtres: Filtres): Promise<DonneesRapport> {
  switch (type) {
    case "inventaire": return rapportInventaire(filtres);
    case "financier": return rapportFinancier(filtres);
    case "maintenance": return rapportMaintenance(filtres);
    case "affectations": return rapportAffectations(filtres);
    case "departements": return rapportDepartements();
    case "alertes": return rapportAlertes();
    default: throw new Error(`Type de rapport inconnu : ${type}`);
  }
}