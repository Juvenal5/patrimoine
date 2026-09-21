"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// -----------------------------------------------------------------------
// Palette alignée sur Sidebar.tsx (bleu marine / accent cyan)
// -----------------------------------------------------------------------
const COL = {
  pageBg: "#0a0f1a",
  card: "rgba(255,255,255,0.03)",
  cardBorder: "rgba(255,255,255,0.07)",
  cardBorderActive: "rgba(14,165,233,0.35)",
  inputBg: "#0f1824",
  textPrimary: "#e2e8f0",
  textMuted: "#64748b",
  textFaint: "#475569",
  accent: "#38bdf8",
  accentSoft: "rgba(14,165,233,0.1)",
  emerald: "#10b981",
  orange: "#fb923c",
  red: "#f87171",
};

const COULEURS_GRAPHIQUE = ["#38bdf8", "#22d3ee", "#fb923c", "#f87171", "#10b981", "#a78bfa", "#eab308"];

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------
type Periode = "today" | "week" | "month" | "year" | "custom";
type Onglet = "vue" | "rapport" | "historique";
type Format = "pdf" | "excel" | "csv";

interface Overview {
  cartes: {
    valeurTotale: number;
    totalBiens: number;
    biensActifs: number;
    biensMaintenance: number;
    biensInactifs: number;
    alertesActives: number;
  };
  graphiques: {
    acquisitionsParMois: { label: string; value: number }[];
    parCategorie: { label: string; value: number }[];
    parDepartement: { label: string; biens: number; valeur: number }[];
    parStatut: { label: string; value: number }[];
    evolutionValeur: { label: string; value: number }[];
    coutsMaintenance: { label: string; value: number }[];
  };
  generatedAt: string;
}

interface Meta {
  departements: { id: string; nom: string }[];
  categories: string[];
  statuts: string[];
}

interface RapportHistorique {
  id: string;
  nom: string;
  type: string;
  format: string;
  createdAt: string;
  utilisateur: string;
  periodeDebut: string | null;
  periodeFin: string | null;
}

const TYPES_RAPPORT: { id: string; nom: string; description: string }[] = [
  { id: "inventaire", nom: "Inventaire des biens", description: "Liste complète des biens avec code, catégorie, valeur, statut et fournisseur." },
  { id: "financier", nom: "Rapport financier", description: "Valeur du patrimoine par département, par catégorie et son évolution." },
  { id: "maintenance", nom: "Maintenance", description: "Suivi des interventions, coûts, biens les plus sollicités et prochaines échéances." },
  { id: "affectations", nom: "Affectations", description: "Biens affectés, utilisateurs concernés et historique des retours." },
  { id: "departements", nom: "Par département", description: "Comparaison des départements : biens, valeur, effectifs." },
  { id: "alertes", nom: "Alertes et garanties", description: "Garanties expirées ou proches, maintenances en retard, biens inactifs." },
];

function formatXOF(valeur: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(valeur || 0);
}

function formatDate(d?: string | Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR");
}

// ✅ AJOUT : formatage heure courte pour l'indicateur de dernière mise à jour
function formatHeure(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// -----------------------------------------------------------------------
// Composant principal
// -----------------------------------------------------------------------
export default function Rapport() {
  const [onglet, setOnglet] = useState<Onglet>("vue");
  const [periode, setPeriode] = useState<Periode>("month");
  const [dateDebutPerso, setDateDebutPerso] = useState("");
  const [dateFinPerso, setDateFinPerso] = useState("");

  const [overview, setOverview] = useState<Overview | null>(null);
  const [connecteTempsReel, setConnecteTempsReel] = useState(false);
  const [chargementOverview, setChargementOverview] = useState(true);

  const [meta, setMeta] = useState<Meta>({ departements: [], categories: [], statuts: [] });
  const [historique, setHistorique] = useState<RapportHistorique[]>([]);
  const [chargementHistorique, setChargementHistorique] = useState(false);

  const [typeSelectionne, setTypeSelectionne] = useState<string | null>(null);
  const [filtreDepartement, setFiltreDepartement] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [formatExport, setFormatExport] = useState<Format>("pdf");
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paramsPeriode = useMemo(() => {
    const p = new URLSearchParams({ periode });
    if (periode === "custom") {
      if (dateDebutPerso) p.set("debut", dateDebutPerso);
      if (dateFinPerso) p.set("fin", dateFinPerso);
    }
    return p;
  }, [periode, dateDebutPerso, dateFinPerso]);

  // Vue d'ensemble en temps réel : SSE avec repli sur polling
  useEffect(() => {
    if (onglet !== "vue") return;

    setChargementOverview(true);
    let annule = false;

    const demarrerPolling = () => {
      const recharger = async () => {
        try {
          const res = await fetch(`/api/rapport/overview?${paramsPeriode.toString()}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (!annule) {
            setOverview(data);
            setChargementOverview(false);
          }
        } catch {
          if (!annule) setErreur("Impossible de charger les statistiques.");
        }
      };
      recharger();
      pollingRef.current = setInterval(recharger, 20000);
    };

    try {
      const es = new EventSource(`/api/rapport/stream?${paramsPeriode.toString()}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (annule) return;
        setOverview(JSON.parse(event.data));
        setChargementOverview(false);
        setConnecteTempsReel(true);
        setErreur(null);
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setConnecteTempsReel(false);
        demarrerPolling();
      };
    } catch {
      demarrerPolling();
    }

    return () => {
      annule = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (pollingRef.current) clearInterval(pollingRef.current);
      setConnecteTempsReel(false);
    };
  }, [onglet, paramsPeriode]);

  useEffect(() => {
    fetch("/api/rapport/meta")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => setErreur("Impossible de charger les filtres."));
  }, []);

  const chargerHistorique = useCallback(async () => {
    setChargementHistorique(true);
    try {
      const res = await fetch("/api/rapport/historique");
      const data = await res.json();
      setHistorique(data);
    } catch {
      setErreur("Impossible de charger l'historique.");
    } finally {
      setChargementHistorique(false);
    }
  }, []);

  useEffect(() => {
    if (onglet === "historique") chargerHistorique();
  }, [onglet, chargerHistorique]);

  async function genererRapport() {
    if (!typeSelectionne) return;
    setGenerationEnCours(true);
    setErreur(null);
    try {
      const res = await fetch("/api/rapport/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: typeSelectionne,
          format: formatExport,
          departementId: filtreDepartement || undefined,
          categorie: filtreCategorie || undefined,
          statut: filtreStatut || undefined,
          periodeDebut: periode === "custom" ? dateDebutPerso || undefined : undefined,
          periodeFin: periode === "custom" ? dateFinPerso || undefined : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec de la génération du rapport");
      }

      const blob = await res.blob();
      const nom = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "rapport";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nom;
      a.click();
      URL.revokeObjectURL(url);

      setTypeSelectionne(null);
      if (onglet === "historique") chargerHistorique();
    } catch (e: any) {
      setErreur(e.message || "Erreur lors de la génération du rapport");
    } finally {
      setGenerationEnCours(false);
    }
  }

  async function telechargerDepuisHistorique(id: string, nom: string) {
    try {
      const res = await fetch(`/api/rapport/historique/${id}/download`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nom;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErreur("Impossible de télécharger ce rapport.");
    }
  }

  async function supprimerRapport(id: string) {
    try {
      await fetch(`/api/rapport/historique/${id}`, { method: "DELETE" });
      setHistorique((h) => h.filter((r) => r.id !== id));
    } catch {
      setErreur("Impossible de supprimer ce rapport.");
    }
  }

  // -----------------------------------------------------------------------
  // Rendu — pensé comme zone de contenu à côté du Sidebar (pas de min-h-screen)
  // -----------------------------------------------------------------------
  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6" style={{ background: COL.pageBg, color: COL.textPrimary }}>
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Rapports et Analyses</h1>
          <p className="text-sm mt-1" style={{ color: COL.textMuted }}>
            Analysez, consultez et exportez les données du patrimoine de votre entreprise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value as Periode)}
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary }}
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
            <option value="custom">Période personnalisée</option>
          </select>

          {periode === "custom" && (
            <>
              <input
                type="date"
                value={dateDebutPerso}
                onChange={(e) => setDateDebutPerso(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary }}
              />
              <input
                type="date"
                value={dateFinPerso}
                onChange={(e) => setDateFinPerso(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary }}
              />
            </>
          )}

          {/* ✅ AJOUT : heure de dernière mise à jour, à côté du badge temps réel */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{
                border: `1px solid ${connecteTempsReel ? "rgba(16,185,129,0.35)" : COL.cardBorder}`,
                color: connecteTempsReel ? COL.emerald : COL.textMuted,
                background: connecteTempsReel ? "rgba(16,185,129,0.08)" : COL.inputBg,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: connecteTempsReel ? COL.emerald : COL.textFaint }}
              />
              {connecteTempsReel ? "Temps réel actif" : "Mise à jour périodique"}
            </span>
            {overview?.generatedAt && (
              <span className="text-[11px]" style={{ color: COL.textFaint }}>
                Actualisé à {formatHeure(overview.generatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {erreur && (
        <div
          className="text-sm rounded-xl px-4 py-2.5"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: COL.red }}
        >
          {erreur}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1" style={{ borderBottom: `1px solid ${COL.cardBorder}` }}>
        {[
          { id: "vue", label: "Vue d'ensemble" },
          { id: "rapport", label: "Rapport" },
          { id: "historique", label: "Historique" },
        ].map((t) => {
          const actif = onglet === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setOnglet(t.id as Onglet)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: actif ? "#fff" : COL.textMuted,
                borderBottom: `2px solid ${actif ? COL.accent : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {onglet === "vue" && <VueEnsemble overview={overview} chargement={chargementOverview} />}

      {onglet === "rapport" && (
        <RapportsOnglet
          meta={meta}
          typeSelectionne={typeSelectionne}
          setTypeSelectionne={setTypeSelectionne}
          filtreDepartement={filtreDepartement}
          setFiltreDepartement={setFiltreDepartement}
          filtreCategorie={filtreCategorie}
          setFiltreCategorie={setFiltreCategorie}
          filtreStatut={filtreStatut}
          setFiltreStatut={setFiltreStatut}
          formatExport={formatExport}
          setFormatExport={setFormatExport}
          generationEnCours={generationEnCours}
          genererRapport={genererRapport}
        />
      )}

      {onglet === "historique" && (
        <HistoriqueOnglet
          historique={historique}
          chargement={chargementHistorique}
          onTelecharger={telechargerDepuisHistorique}
          onSupprimer={supprimerRapport}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Vue d'ensemble
// -----------------------------------------------------------------------
function CarteStat({ label, valeur, accent }: { label: string; valeur: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
      <p className="text-xs" style={{ color: COL.textMuted }}>{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ color: accent || "#fff" }}>{valeur}</p>
    </div>
  );
}

function Panneau({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: "#cbd5e1" }}>{titre}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

function VueEnsemble({ overview, chargement }: { overview: Overview | null; chargement: boolean }) {
  if (chargement && !overview) {
    return <p className="text-sm py-8" style={{ color: COL.textMuted }}>Chargement des statistiques…</p>;
  }
  if (!overview) return null;

  const { cartes, graphiques } = overview;
  const grille = { stroke: "rgba(255,255,255,0.06)" };
  const axe = { stroke: COL.textFaint, fontSize: 11 };
  const infoBulle = { contentStyle: { background: "#0f1824", border: `1px solid ${COL.cardBorder}`, borderRadius: 8, color: "#e2e8f0" } };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <CarteStat label="Valeur totale" valeur={formatXOF(cartes.valeurTotale)} accent={COL.accent} />
        <CarteStat label="Total biens" valeur={String(cartes.totalBiens)} />
        <CarteStat label="Biens actifs" valeur={String(cartes.biensActifs)} accent={COL.emerald} />
        <CarteStat label="En maintenance" valeur={String(cartes.biensMaintenance)} accent={COL.orange} />
        <CarteStat label="Inactifs / réformés" valeur={String(cartes.biensInactifs)} accent={COL.textMuted} />
        <CarteStat label="Alertes actives" valeur={String(cartes.alertesActives)} accent={COL.red} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panneau titre="Acquisitions par mois">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphiques.acquisitionsParMois}>
              <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
              <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
              <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
              <Tooltip {...infoBulle} />
              <Bar dataKey="value" fill={COL.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panneau>

        <Panneau titre="Répartition par catégorie">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={graphiques.parCategorie} dataKey="value" nameKey="label" outerRadius={90} label>
                {graphiques.parCategorie.map((_, i) => (
                  <Cell key={i} fill={COULEURS_GRAPHIQUE[i % COULEURS_GRAPHIQUE.length]} />
                ))}
              </Pie>
              <Tooltip {...infoBulle} />
              <Legend wrapperStyle={{ fontSize: 11, color: COL.textMuted }} />
            </PieChart>
          </ResponsiveContainer>
        </Panneau>

        <Panneau titre="Répartition par département">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphiques.parDepartement}>
              <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
              <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
              <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
              <Tooltip {...infoBulle} />
              <Bar dataKey="biens" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panneau>

        <Panneau titre="Répartition par statut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={graphiques.parStatut} dataKey="value" nameKey="label" outerRadius={90} label>
                {graphiques.parStatut.map((_, i) => (
                  <Cell key={i} fill={COULEURS_GRAPHIQUE[i % COULEURS_GRAPHIQUE.length]} />
                ))}
              </Pie>
              <Tooltip {...infoBulle} />
              <Legend wrapperStyle={{ fontSize: 11, color: COL.textMuted }} />
            </PieChart>
          </ResponsiveContainer>
        </Panneau>

        <Panneau titre="Évolution de la valeur du patrimoine">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphiques.evolutionValeur}>
              <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
              <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
              <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
              <Tooltip {...infoBulle} />
              <Line type="monotone" dataKey="value" stroke={COL.emerald} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panneau>

        <Panneau titre="Coûts de maintenance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphiques.coutsMaintenance}>
              <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
              <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
              <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
              <Tooltip {...infoBulle} />
              <Bar dataKey="value" fill={COL.orange} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panneau>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Onglet Rapports
// -----------------------------------------------------------------------
function RapportsOnglet(props: {
  meta: Meta;
  typeSelectionne: string | null;
  setTypeSelectionne: (v: string | null) => void;
  filtreDepartement: string;
  setFiltreDepartement: (v: string) => void;
  filtreCategorie: string;
  setFiltreCategorie: (v: string) => void;
  filtreStatut: string;
  setFiltreStatut: (v: string) => void;
  formatExport: Format;
  setFormatExport: (v: Format) => void;
  generationEnCours: boolean;
  genererRapport: () => void;
}) {
  const {
    meta,
    typeSelectionne,
    setTypeSelectionne,
    filtreDepartement,
    setFiltreDepartement,
    filtreCategorie,
    setFiltreCategorie,
    filtreStatut,
    setFiltreStatut,
    formatExport,
    setFormatExport,
    generationEnCours,
    genererRapport,
  } = props;

  const selectStyle = { background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TYPES_RAPPORT.map((t) => {
          const actif = typeSelectionne === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTypeSelectionne(t.id)}
              className="text-left rounded-xl p-4 transition-colors"
              style={{
                background: COL.card,
                border: `1px solid ${actif ? COL.cardBorderActive : COL.cardBorder}`,
              }}
            >
              <p className="font-medium text-white">{t.nom}</p>
              <p className="text-xs mt-1" style={{ color: COL.textMuted }}>{t.description}</p>
            </button>
          );
        })}
      </div>

      {typeSelectionne && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
          <h3 className="text-sm font-medium text-white">
            Générer : {TYPES_RAPPORT.find((t) => t.id === typeSelectionne)?.nom}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={filtreDepartement} onChange={(e) => setFiltreDepartement(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
              <option value="">Tous les départements</option>
              {meta.departements.map((d) => (
                <option key={d.id} value={d.id}>{d.nom}</option>
              ))}
            </select>

            <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
              <option value="">Toutes les catégories</option>
              {meta.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
              <option value="">Tous les statuts</option>
              {meta.statuts.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select value={formatExport} onChange={(e) => setFormatExport(e.target.value as Format)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setTypeSelectionne(null)}
              className="px-4 py-2 text-sm rounded-xl"
              style={{ border: `1px solid ${COL.cardBorder}`, color: "#cbd5e1" }}
            >
              Annuler
            </button>
            <button
              onClick={genererRapport}
              disabled={generationEnCours}
              className="px-4 py-2 text-sm rounded-xl text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
            >
              {generationEnCours ? "Génération…" : "Générer le rapport"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Onglet Historique
// -----------------------------------------------------------------------
function HistoriqueOnglet({
  historique,
  chargement,
  onTelecharger,
  onSupprimer,
}: {
  historique: RapportHistorique[];
  chargement: boolean;
  onTelecharger: (id: string, nom: string) => void;
  onSupprimer: (id: string) => void;
}) {
  if (chargement) return <p className="text-sm py-8" style={{ color: COL.textMuted }}>Chargement de l'historique…</p>;
  if (historique.length === 0)
    return <p className="text-sm py-8" style={{ color: COL.textMuted }}>Aucun rapport généré pour le moment.</p>;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
      <table className="w-full text-sm">
        <thead style={{ background: COL.inputBg, color: COL.textMuted }}>
          <tr>
            <th className="text-left px-4 py-3 font-medium">Nom du rapport</th>
            <th className="text-left px-4 py-3 font-medium">Format</th>
            <th className="text-left px-4 py-3 font-medium">Généré le</th>
            <th className="text-left px-4 py-3 font-medium">Par</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {historique.map((r) => (
            <tr key={r.id} style={{ borderTop: `1px solid ${COL.cardBorder}` }}>
              <td className="px-4 py-3 text-white">{r.nom}</td>
              <td className="px-4 py-3 uppercase" style={{ color: COL.textMuted }}>{r.format}</td>
              <td className="px-4 py-3" style={{ color: COL.textMuted }}>{formatDate(r.createdAt)}</td>
              <td className="px-4 py-3" style={{ color: COL.textMuted }}>{r.utilisateur}</td>
              <td className="px-4 py-3 text-right space-x-3">
                <button onClick={() => onTelecharger(r.id, r.nom)} className="text-xs" style={{ color: COL.accent }}>
                  Télécharger
                </button>
                <button onClick={() => onSupprimer(r.id)} className="text-xs" style={{ color: COL.red }}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}






// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   PieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from "recharts";

// // -----------------------------------------------------------------------
// // Palette alignée sur Sidebar.tsx (bleu marine / accent cyan)
// // -----------------------------------------------------------------------
// const COL = {
//   pageBg: "#0a0f1a",
//   card: "rgba(255,255,255,0.03)",
//   cardBorder: "rgba(255,255,255,0.07)",
//   cardBorderActive: "rgba(14,165,233,0.35)",
//   inputBg: "#0f1824",
//   textPrimary: "#e2e8f0",
//   textMuted: "#64748b",
//   textFaint: "#475569",
//   accent: "#38bdf8",
//   accentSoft: "rgba(14,165,233,0.1)",
//   emerald: "#10b981",
//   orange: "#fb923c",
//   red: "#f87171",
// };

// const COULEURS_GRAPHIQUE = ["#38bdf8", "#22d3ee", "#fb923c", "#f87171", "#10b981", "#a78bfa", "#eab308"];

// // -----------------------------------------------------------------------
// // Types
// // -----------------------------------------------------------------------
// type Periode = "today" | "week" | "month" | "year" | "custom";
// type Onglet = "vue" | "rapports" | "historique";
// type Format = "pdf" | "excel" | "csv";

// interface Overview {
//   cartes: {
//     valeurTotale: number;
//     totalBiens: number;
//     biensActifs: number;
//     biensMaintenance: number;
//     biensInactifs: number;
//     alertesActives: number;
//   };
//   graphiques: {
//     acquisitionsParMois: { label: string; value: number }[];
//     parCategorie: { label: string; value: number }[];
//     parDepartement: { label: string; biens: number; valeur: number }[];
//     parStatut: { label: string; value: number }[];
//     evolutionValeur: { label: string; value: number }[];
//     coutsMaintenance: { label: string; value: number }[];
//   };
//   generatedAt: string;
// }

// interface Meta {
//   departements: { id: string; nom: string }[];
//   categories: string[];
//   statuts: string[];
// }

// interface RapportHistorique {
//   id: string;
//   nom: string;
//   type: string;
//   format: string;
//   createdAt: string;
//   utilisateur: string;
//   periodeDebut: string | null;
//   periodeFin: string | null;
// }

// const TYPES_RAPPORT: { id: string; nom: string; description: string }[] = [
//   { id: "inventaire", nom: "Inventaire des biens", description: "Liste complète des biens avec code, catégorie, valeur, statut et fournisseur." },
//   { id: "financier", nom: "Rapport financier", description: "Valeur du patrimoine par département, par catégorie et son évolution." },
//   { id: "maintenance", nom: "Maintenance", description: "Suivi des interventions, coûts, biens les plus sollicités et prochaines échéances." },
//   { id: "affectations", nom: "Affectations", description: "Biens affectés, utilisateurs concernés et historique des retours." },
//   { id: "departements", nom: "Par département", description: "Comparaison des départements : biens, valeur, effectifs." },
//   { id: "alertes", nom: "Alertes et garanties", description: "Garanties expirées ou proches, maintenances en retard, biens inactifs." },
// ];

// function formatXOF(valeur: number) {
//   return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(valeur || 0);
// }

// function formatDate(d?: string | Date | null) {
//   if (!d) return "-";
//   return new Date(d).toLocaleDateString("fr-FR");
// }

// // -----------------------------------------------------------------------
// // Composant principal
// // -----------------------------------------------------------------------
// export default function Rapport() {
//   const [onglet, setOnglet] = useState<Onglet>("vue");
//   const [periode, setPeriode] = useState<Periode>("month");
//   const [dateDebutPerso, setDateDebutPerso] = useState("");
//   const [dateFinPerso, setDateFinPerso] = useState("");

//   const [overview, setOverview] = useState<Overview | null>(null);
//   const [connecteTempsReel, setConnecteTempsReel] = useState(false);
//   const [chargementOverview, setChargementOverview] = useState(true);

//   const [meta, setMeta] = useState<Meta>({ departements: [], categories: [], statuts: [] });
//   const [historique, setHistorique] = useState<RapportHistorique[]>([]);
//   const [chargementHistorique, setChargementHistorique] = useState(false);

//   const [typeSelectionne, setTypeSelectionne] = useState<string | null>(null);
//   const [filtreDepartement, setFiltreDepartement] = useState("");
//   const [filtreCategorie, setFiltreCategorie] = useState("");
//   const [filtreStatut, setFiltreStatut] = useState("");
//   const [formatExport, setFormatExport] = useState<Format>("pdf");
//   const [generationEnCours, setGenerationEnCours] = useState(false);
//   const [erreur, setErreur] = useState<string | null>(null);

//   const eventSourceRef = useRef<EventSource | null>(null);
//   const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const paramsPeriode = useMemo(() => {
//     const p = new URLSearchParams({ periode });
//     if (periode === "custom") {
//       if (dateDebutPerso) p.set("debut", dateDebutPerso);
//       if (dateFinPerso) p.set("fin", dateFinPerso);
//     }
//     return p;
//   }, [periode, dateDebutPerso, dateFinPerso]);

//   // Vue d'ensemble en temps réel : SSE avec repli sur polling
//   useEffect(() => {
//     if (onglet !== "vue") return;

//     setChargementOverview(true);
//     let annule = false;

//     const demarrerPolling = () => {
//       const recharger = async () => {
//         try {
//           const res = await fetch(`/api/rapports/overview?${paramsPeriode.toString()}`);
//           if (!res.ok) throw new Error();
//           const data = await res.json();
//           if (!annule) {
//             setOverview(data);
//             setChargementOverview(false);
//           }
//         } catch {
//           if (!annule) setErreur("Impossible de charger les statistiques.");
//         }
//       };
//       recharger();
//       pollingRef.current = setInterval(recharger, 20000);
//     };

//     try {
//       const es = new EventSource(`/api/rapports/stream?${paramsPeriode.toString()}`);
//       eventSourceRef.current = es;

//       es.onmessage = (event) => {
//         if (annule) return;
//         setOverview(JSON.parse(event.data));
//         setChargementOverview(false);
//         setConnecteTempsReel(true);
//         setErreur(null);
//       };

//       es.onerror = () => {
//         es.close();
//         eventSourceRef.current = null;
//         setConnecteTempsReel(false);
//         demarrerPolling();
//       };
//     } catch {
//       demarrerPolling();
//     }

//     return () => {
//       annule = true;
//       eventSourceRef.current?.close();
//       eventSourceRef.current = null;
//       if (pollingRef.current) clearInterval(pollingRef.current);
//       setConnecteTempsReel(false);
//     };
//   }, [onglet, paramsPeriode]);

//   useEffect(() => {
//     fetch("/api/rapports/meta")
//       .then((r) => r.json())
//       .then(setMeta)
//       .catch(() => setErreur("Impossible de charger les filtres."));
//   }, []);

//   const chargerHistorique = useCallback(async () => {
//     setChargementHistorique(true);
//     try {
//       const res = await fetch("/api/rapports/historique");
//       const data = await res.json();
//       setHistorique(data);
//     } catch {
//       setErreur("Impossible de charger l'historique.");
//     } finally {
//       setChargementHistorique(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (onglet === "historique") chargerHistorique();
//   }, [onglet, chargerHistorique]);

//   async function genererRapport() {
//     if (!typeSelectionne) return;
//     setGenerationEnCours(true);
//     setErreur(null);
//     try {
//       const res = await fetch("/api/rapports/generate", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           type: typeSelectionne,
//           format: formatExport,
//           departementId: filtreDepartement || undefined,
//           categorie: filtreCategorie || undefined,
//           statut: filtreStatut || undefined,
//           periodeDebut: periode === "custom" ? dateDebutPerso || undefined : undefined,
//           periodeFin: periode === "custom" ? dateFinPerso || undefined : undefined,
//         }),
//       });

//       if (!res.ok) {
//         const data = await res.json().catch(() => ({}));
//         throw new Error(data.error || "Échec de la génération du rapport");
//       }

//       const blob = await res.blob();
//       const nom = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "rapport";
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = nom;
//       a.click();
//       URL.revokeObjectURL(url);

//       setTypeSelectionne(null);
//       if (onglet === "historique") chargerHistorique();
//     } catch (e: any) {
//       setErreur(e.message || "Erreur lors de la génération du rapport");
//     } finally {
//       setGenerationEnCours(false);
//     }
//   }

//   async function telechargerDepuisHistorique(id: string, nom: string) {
//     try {
//       const res = await fetch(`/api/rapports/historique/${id}/download`);
//       if (!res.ok) throw new Error();
//       const blob = await res.blob();
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = nom;
//       a.click();
//       URL.revokeObjectURL(url);
//     } catch {
//       setErreur("Impossible de télécharger ce rapport.");
//     }
//   }

//   async function supprimerRapport(id: string) {
//     try {
//       await fetch(`/api/rapports/historique/${id}`, { method: "DELETE" });
//       setHistorique((h) => h.filter((r) => r.id !== id));
//     } catch {
//       setErreur("Impossible de supprimer ce rapport.");
//     }
//   }

//   // -----------------------------------------------------------------------
//   // Rendu — pensé comme zone de contenu à côté du Sidebar (pas de min-h-screen)
//   // -----------------------------------------------------------------------
//   return (
//     <div className="w-full h-full overflow-y-auto p-6 space-y-6" style={{ background: COL.pageBg, color: COL.textPrimary }}>
//       {/* En-tête */}
//       <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold text-white">Rapports et Analyses</h1>
//           <p className="text-sm mt-1" style={{ color: COL.textMuted }}>
//             Analysez, consultez et exportez les données du patrimoine de votre entreprise.
//           </p>
//         </div>

//         <div className="flex flex-wrap items-center gap-2">
//           <select
//             value={periode}
//             onChange={(e) => setPeriode(e.target.value as Periode)}
//             className="rounded-xl px-3 py-2 text-sm"
//             style={{ background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary }}
//           >
//             <option value="today">Aujourd'hui</option>
//             <option value="week">Cette semaine</option>
//             <option value="month">Ce mois</option>
//             <option value="year">Cette année</option>
//             <option value="custom">Période personnalisée</option>
//           </select>

//           {periode === "custom" && (
//             <>
//               <input
//                 type="date"
//                 value={dateDebutPerso}
//                 onChange={(e) => setDateDebutPerso(e.target.value)}
//                 className="rounded-xl px-3 py-2 text-sm"
//                 style={{ background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary }}
//               />
//               <input
//                 type="date"
//                 value={dateFinPerso}
//                 onChange={(e) => setDateFinPerso(e.target.value)}
//                 className="rounded-xl px-3 py-2 text-sm"
//                 style={{ background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary }}
//               />
//             </>
//           )}

//           <span
//             className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"
//             style={{
//               border: `1px solid ${connecteTempsReel ? "rgba(16,185,129,0.35)" : COL.cardBorder}`,
//               color: connecteTempsReel ? COL.emerald : COL.textMuted,
//               background: connecteTempsReel ? "rgba(16,185,129,0.08)" : COL.inputBg,
//             }}
//           >
//             <span
//               className="w-1.5 h-1.5 rounded-full"
//               style={{ background: connecteTempsReel ? COL.emerald : COL.textFaint }}
//             />
//             {connecteTempsReel ? "Temps réel actif" : "Mise à jour périodique"}
//           </span>
//         </div>
//       </div>

//       {erreur && (
//         <div
//           className="text-sm rounded-xl px-4 py-2.5"
//           style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: COL.red }}
//         >
//           {erreur}
//         </div>
//       )}

//       {/* Onglets */}
//       <div className="flex gap-1" style={{ borderBottom: `1px solid ${COL.cardBorder}` }}>
//         {[
//           { id: "vue", label: "Vue d'ensemble" },
//           { id: "rapports", label: "Rapports" },
//           { id: "historique", label: "Historique" },
//         ].map((t) => {
//           const actif = onglet === t.id;
//           return (
//             <button
//               key={t.id}
//               onClick={() => setOnglet(t.id as Onglet)}
//               className="px-4 py-2 text-sm font-medium transition-colors"
//               style={{
//                 color: actif ? "#fff" : COL.textMuted,
//                 borderBottom: `2px solid ${actif ? COL.accent : "transparent"}`,
//               }}
//             >
//               {t.label}
//             </button>
//           );
//         })}
//       </div>

//       {onglet === "vue" && <VueEnsemble overview={overview} chargement={chargementOverview} />}

//       {onglet === "rapports" && (
//         <RapportsOnglet
//           meta={meta}
//           typeSelectionne={typeSelectionne}
//           setTypeSelectionne={setTypeSelectionne}
//           filtreDepartement={filtreDepartement}
//           setFiltreDepartement={setFiltreDepartement}
//           filtreCategorie={filtreCategorie}
//           setFiltreCategorie={setFiltreCategorie}
//           filtreStatut={filtreStatut}
//           setFiltreStatut={setFiltreStatut}
//           formatExport={formatExport}
//           setFormatExport={setFormatExport}
//           generationEnCours={generationEnCours}
//           genererRapport={genererRapport}
//         />
//       )}

//       {onglet === "historique" && (
//         <HistoriqueOnglet
//           historique={historique}
//           chargement={chargementHistorique}
//           onTelecharger={telechargerDepuisHistorique}
//           onSupprimer={supprimerRapport}
//         />
//       )}
//     </div>
//   );
// }

// // -----------------------------------------------------------------------
// // Vue d'ensemble
// // -----------------------------------------------------------------------
// function CarteStat({ label, valeur, accent }: { label: string; valeur: string; accent?: string }) {
//   return (
//     <div className="rounded-xl p-4" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
//       <p className="text-xs" style={{ color: COL.textMuted }}>{label}</p>
//       <p className="text-2xl font-semibold mt-1" style={{ color: accent || "#fff" }}>{valeur}</p>
//     </div>
//   );
// }

// function Panneau({ titre, children }: { titre: string; children: React.ReactNode }) {
//   return (
//     <div className="rounded-xl p-4" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
//       <h3 className="text-sm font-medium mb-3" style={{ color: "#cbd5e1" }}>{titre}</h3>
//       <div className="h-64">{children}</div>
//     </div>
//   );
// }

// function VueEnsemble({ overview, chargement }: { overview: Overview | null; chargement: boolean }) {
//   if (chargement && !overview) {
//     return <p className="text-sm py-8" style={{ color: COL.textMuted }}>Chargement des statistiques…</p>;
//   }
//   if (!overview) return null;

//   const { cartes, graphiques } = overview;
//   const grille = { stroke: "rgba(255,255,255,0.06)" };
//   const axe = { stroke: COL.textFaint, fontSize: 11 };
//   const infoBulle = { contentStyle: { background: "#0f1824", border: `1px solid ${COL.cardBorder}`, borderRadius: 8, color: "#e2e8f0" } };

//   return (
//     <div className="space-y-6">
//       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
//         <CarteStat label="Valeur totale" valeur={formatXOF(cartes.valeurTotale)} accent={COL.accent} />
//         <CarteStat label="Total biens" valeur={String(cartes.totalBiens)} />
//         <CarteStat label="Biens actifs" valeur={String(cartes.biensActifs)} accent={COL.emerald} />
//         <CarteStat label="En maintenance" valeur={String(cartes.biensMaintenance)} accent={COL.orange} />
//         <CarteStat label="Inactifs / réformés" valeur={String(cartes.biensInactifs)} accent={COL.textMuted} />
//         <CarteStat label="Alertes actives" valeur={String(cartes.alertesActives)} accent={COL.red} />
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         <Panneau titre="Acquisitions par mois">
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={graphiques.acquisitionsParMois}>
//               <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
//               <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
//               <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
//               <Tooltip {...infoBulle} />
//               <Bar dataKey="value" fill={COL.accent} radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </Panneau>

//         <Panneau titre="Répartition par catégorie">
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart>
//               <Pie data={graphiques.parCategorie} dataKey="value" nameKey="label" outerRadius={90} label>
//                 {graphiques.parCategorie.map((_, i) => (
//                   <Cell key={i} fill={COULEURS_GRAPHIQUE[i % COULEURS_GRAPHIQUE.length]} />
//                 ))}
//               </Pie>
//               <Tooltip {...infoBulle} />
//               <Legend wrapperStyle={{ fontSize: 11, color: COL.textMuted }} />
//             </PieChart>
//           </ResponsiveContainer>
//         </Panneau>

//         <Panneau titre="Répartition par département">
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={graphiques.parDepartement}>
//               <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
//               <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
//               <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
//               <Tooltip {...infoBulle} />
//               <Bar dataKey="biens" fill="#22d3ee" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </Panneau>

//         <Panneau titre="Répartition par statut">
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart>
//               <Pie data={graphiques.parStatut} dataKey="value" nameKey="label" outerRadius={90} label>
//                 {graphiques.parStatut.map((_, i) => (
//                   <Cell key={i} fill={COULEURS_GRAPHIQUE[i % COULEURS_GRAPHIQUE.length]} />
//                 ))}
//               </Pie>
//               <Tooltip {...infoBulle} />
//               <Legend wrapperStyle={{ fontSize: 11, color: COL.textMuted }} />
//             </PieChart>
//           </ResponsiveContainer>
//         </Panneau>

//         <Panneau titre="Évolution de la valeur du patrimoine">
//           <ResponsiveContainer width="100%" height="100%">
//             <LineChart data={graphiques.evolutionValeur}>
//               <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
//               <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
//               <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
//               <Tooltip {...infoBulle} />
//               <Line type="monotone" dataKey="value" stroke={COL.emerald} strokeWidth={2} dot={false} />
//             </LineChart>
//           </ResponsiveContainer>
//         </Panneau>

//         <Panneau titre="Coûts de maintenance">
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={graphiques.coutsMaintenance}>
//               <CartesianGrid strokeDasharray="3 3" stroke={grille.stroke} />
//               <XAxis dataKey="label" stroke={axe.stroke} fontSize={axe.fontSize} />
//               <YAxis stroke={axe.stroke} fontSize={axe.fontSize} />
//               <Tooltip {...infoBulle} />
//               <Bar dataKey="value" fill={COL.orange} radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </Panneau>
//       </div>
//     </div>
//   );
// }

// // -----------------------------------------------------------------------
// // Onglet Rapports
// // -----------------------------------------------------------------------
// function RapportsOnglet(props: {
//   meta: Meta;
//   typeSelectionne: string | null;
//   setTypeSelectionne: (v: string | null) => void;
//   filtreDepartement: string;
//   setFiltreDepartement: (v: string) => void;
//   filtreCategorie: string;
//   setFiltreCategorie: (v: string) => void;
//   filtreStatut: string;
//   setFiltreStatut: (v: string) => void;
//   formatExport: Format;
//   setFormatExport: (v: Format) => void;
//   generationEnCours: boolean;
//   genererRapport: () => void;
// }) {
//   const {
//     meta,
//     typeSelectionne,
//     setTypeSelectionne,
//     filtreDepartement,
//     setFiltreDepartement,
//     filtreCategorie,
//     setFiltreCategorie,
//     filtreStatut,
//     setFiltreStatut,
//     formatExport,
//     setFormatExport,
//     generationEnCours,
//     genererRapport,
//   } = props;

//   const selectStyle = { background: COL.inputBg, border: `1px solid ${COL.cardBorder}`, color: COL.textPrimary };

//   return (
//     <div className="space-y-6">
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {TYPES_RAPPORT.map((t) => {
//           const actif = typeSelectionne === t.id;
//           return (
//             <button
//               key={t.id}
//               onClick={() => setTypeSelectionne(t.id)}
//               className="text-left rounded-xl p-4 transition-colors"
//               style={{
//                 background: COL.card,
//                 border: `1px solid ${actif ? COL.cardBorderActive : COL.cardBorder}`,
//               }}
//             >
//               <p className="font-medium text-white">{t.nom}</p>
//               <p className="text-xs mt-1" style={{ color: COL.textMuted }}>{t.description}</p>
//             </button>
//           );
//         })}
//       </div>

//       {typeSelectionne && (
//         <div className="rounded-xl p-5 space-y-4" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
//           <h3 className="text-sm font-medium text-white">
//             Générer : {TYPES_RAPPORT.find((t) => t.id === typeSelectionne)?.nom}
//           </h3>

//           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//             <select value={filtreDepartement} onChange={(e) => setFiltreDepartement(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
//               <option value="">Tous les départements</option>
//               {meta.departements.map((d) => (
//                 <option key={d.id} value={d.id}>{d.nom}</option>
//               ))}
//             </select>

//             <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
//               <option value="">Toutes les catégories</option>
//               {meta.categories.map((c) => (
//                 <option key={c} value={c}>{c}</option>
//               ))}
//             </select>

//             <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
//               <option value="">Tous les statuts</option>
//               {meta.statuts.map((s) => (
//                 <option key={s} value={s}>{s}</option>
//               ))}
//             </select>

//             <select value={formatExport} onChange={(e) => setFormatExport(e.target.value as Format)} className="rounded-xl px-3 py-2 text-sm" style={selectStyle}>
//               <option value="pdf">PDF</option>
//               <option value="excel">Excel</option>
//               <option value="csv">CSV</option>
//             </select>
//           </div>

//           <div className="flex justify-end gap-2">
//             <button
//               onClick={() => setTypeSelectionne(null)}
//               className="px-4 py-2 text-sm rounded-xl"
//               style={{ border: `1px solid ${COL.cardBorder}`, color: "#cbd5e1" }}
//             >
//               Annuler
//             </button>
//             <button
//               onClick={genererRapport}
//               disabled={generationEnCours}
//               className="px-4 py-2 text-sm rounded-xl text-white disabled:opacity-50"
//               style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
//             >
//               {generationEnCours ? "Génération…" : "Générer le rapport"}
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // -----------------------------------------------------------------------
// // Onglet Historique
// // -----------------------------------------------------------------------
// function HistoriqueOnglet({
//   historique,
//   chargement,
//   onTelecharger,
//   onSupprimer,
// }: {
//   historique: RapportHistorique[];
//   chargement: boolean;
//   onTelecharger: (id: string, nom: string) => void;
//   onSupprimer: (id: string) => void;
// }) {
//   if (chargement) return <p className="text-sm py-8" style={{ color: COL.textMuted }}>Chargement de l'historique…</p>;
//   if (historique.length === 0)
//     return <p className="text-sm py-8" style={{ color: COL.textMuted }}>Aucun rapport généré pour le moment.</p>;

//   return (
//     <div className="rounded-xl overflow-hidden" style={{ background: COL.card, border: `1px solid ${COL.cardBorder}` }}>
//       <table className="w-full text-sm">
//         <thead style={{ background: COL.inputBg, color: COL.textMuted }}>
//           <tr>
//             <th className="text-left px-4 py-3 font-medium">Nom du rapport</th>
//             <th className="text-left px-4 py-3 font-medium">Format</th>
//             <th className="text-left px-4 py-3 font-medium">Généré le</th>
//             <th className="text-left px-4 py-3 font-medium">Par</th>
//             <th className="text-right px-4 py-3 font-medium">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {historique.map((r) => (
//             <tr key={r.id} style={{ borderTop: `1px solid ${COL.cardBorder}` }}>
//               <td className="px-4 py-3 text-white">{r.nom}</td>
//               <td className="px-4 py-3 uppercase" style={{ color: COL.textMuted }}>{r.format}</td>
//               <td className="px-4 py-3" style={{ color: COL.textMuted }}>{formatDate(r.createdAt)}</td>
//               <td className="px-4 py-3" style={{ color: COL.textMuted }}>{r.utilisateur}</td>
//               <td className="px-4 py-3 text-right space-x-3">
//                 <button onClick={() => onTelecharger(r.id, r.nom)} className="text-xs" style={{ color: COL.accent }}>
//                   Télécharger
//                 </button>
//                 <button onClick={() => onSupprimer(r.id)} className="text-xs" style={{ color: COL.red }}>
//                   Supprimer
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }