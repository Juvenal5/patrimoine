import prisma from "./prisma";
import { bornesPeriode } from "./helpers";

const MOIS_LABEL = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

interface Bucket {
  label: string;
  debut: Date;
  fin: Date;
}

// Découpe une plage [debut, fin] en compartiments journaliers (si <= 31 jours)
// ou mensuels (sinon), avec un maximum de 12 compartiments.
function decouperEnBuckets(debut: Date, fin: Date): Bucket[] {
  const joursTotal = Math.max(1, Math.round((fin.getTime() - debut.getTime()) / 86400000));
  const buckets: Bucket[] = [];

  if (joursTotal <= 31) {
    for (let i = 0; i < joursTotal; i++) {
      const j0 = new Date(debut); j0.setDate(j0.getDate() + i); j0.setHours(0, 0, 0, 0);
      const j1 = new Date(j0); j1.setDate(j1.getDate() + 1);
      buckets.push({ label: `${j0.getDate()}/${j0.getMonth() + 1}`, debut: j0, fin: j1 });
    }
  } else {
    const moisTotal = Math.min(
      12,
      (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1
    );
    const curseur = new Date(fin.getFullYear(), fin.getMonth() - moisTotal + 1, 1);
    for (let i = 0; i < moisTotal; i++) {
      const m0 = new Date(curseur.getFullYear(), curseur.getMonth() + i, 1);
      const m1 = new Date(curseur.getFullYear(), curseur.getMonth() + i + 1, 1);
      buckets.push({ label: `${MOIS_LABEL[m0.getMonth()]} ${String(m0.getFullYear()).slice(2)}`, debut: m0, fin: m1 });
    }
  }
  return buckets;
}

export async function buildOverview(periode: string, debutPerso?: string | null, finPerso?: string | null) {
  const { debut, fin } = bornesPeriode(periode, debutPerso, finPerso);
  const buckets = decouperEnBuckets(debut, fin);
  const maintenant = new Date();
  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);

  const [
    totalBiens,
    biensActifs,
    biensMaintenance,
    biensInactifs,
    valeurAgg,
    tousLesBiens,
    departementsAgg,
    maintenances,
    garantiesExpirant,
    maintenancesRetard,
    affectationsRetard,
  ] = await Promise.all([
    prisma.bien.count({ where: { deletedAt: null } }),
    prisma.bien.count({ where: { deletedAt: null, etat: "actif" } }),
    prisma.bien.count({ where: { deletedAt: null, etat: "maintenance" } }),
    prisma.bien.count({ where: { deletedAt: null, etat: { in: ["inactif", "reforme"] } } }),
    prisma.bien.aggregate({ where: { deletedAt: null }, _sum: { valeurAchat: true } }),
    prisma.bien.findMany({
      where: { deletedAt: null },
      select: { categorie: true, etat: true, valeurAchat: true, dateAcquisition: true, departementId: true },
    }),
    prisma.departement.findMany({
      select: { nom: true, biens: { where: { deletedAt: null }, select: { valeurAchat: true } } },
    }),
    prisma.maintenance.findMany({
      where: { NOT: { cout: null }, createdAt: { gte: debut, lte: fin } },
      select: { cout: true, createdAt: true },
    }),
    prisma.bien.count({ where: { deletedAt: null, garantieFin: { lte: dansTrenteJours }, NOT: { garantieFin: null } } }),
    prisma.maintenance.count({ where: { statut: "en_cours", dateFin: { lt: maintenant }, NOT: { dateFin: null } } }),
    prisma.affectation.count({ where: { statut: "en_cours", datePrevisionRetour: { lt: maintenant }, dateRetour: null, NOT: { datePrevisionRetour: null } } }),
  ]);

  // ── Acquisitions par bucket (mois ou jour selon la période) ──────────────
  const acquisitionsParMois = buckets.map((b) => ({
    label: b.label,
    value: tousLesBiens.filter((x) => x.dateAcquisition && x.dateAcquisition >= b.debut && x.dateAcquisition < b.fin).length,
  }));

  // ── Répartition par catégorie ─────────────────────────────────────────────
  const catMap = new Map<string, number>();
  for (const b of tousLesBiens) catMap.set(b.categorie || "Autre", (catMap.get(b.categorie || "Autre") || 0) + 1);
  const parCategorie = Array.from(catMap.entries()).map(([label, value]) => ({ label, value }));

  // ── Répartition par département ───────────────────────────────────────────
  const parDepartement = departementsAgg.map((d) => ({
    label: d.nom,
    biens: d.biens.length,
    valeur: d.biens.reduce((s, b) => s + (b.valeurAchat || 0), 0),
  }));

  // ── Répartition par statut ────────────────────────────────────────────────
  const statutMap = new Map<string, number>();
  for (const b of tousLesBiens) statutMap.set(b.etat || "inconnu", (statutMap.get(b.etat || "inconnu") || 0) + 1);
  const parStatut = Array.from(statutMap.entries()).map(([label, value]) => ({ label, value }));

  // ── Évolution cumulative de la valeur du patrimoine ───────────────────────
  let cumul = 0;
  const evolutionValeur = buckets.map((b) => {
    cumul += tousLesBiens
      .filter((x) => x.dateAcquisition && x.dateAcquisition >= b.debut && x.dateAcquisition < b.fin)
      .reduce((s, x) => s + (x.valeurAchat || 0), 0);
    return { label: b.label, value: cumul };
  });

  // ── Coûts de maintenance par bucket ────────────────────────────────────────
  const coutsMaintenance = buckets.map((b) => ({
    label: b.label,
    value: maintenances
      .filter((m) => m.createdAt >= b.debut && m.createdAt < b.fin)
      .reduce((s, m) => s + (m.cout || 0), 0),
  }));

  return {
    cartes: {
      valeurTotale: valeurAgg._sum.valeurAchat || 0,
      totalBiens,
      biensActifs,
      biensMaintenance,
      biensInactifs,
      alertesActives: garantiesExpirant + maintenancesRetard + affectationsRetard,
    },
    graphiques: { acquisitionsParMois, parCategorie, parDepartement, parStatut, evolutionValeur, coutsMaintenance },
    generatedAt: new Date().toISOString(),
  };
}