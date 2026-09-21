"use client";

// components/Historique.tsx
//
// Page "Historique" de PatrimoineX — journal de traçabilité de toute
// l'application. Branchée sur les API suivantes :
//   GET /api/historique          liste paginée + filtrée
//   GET /api/historique/stats    cartes statistiques
//   GET /api/historique/meta     options de filtres (modules, actions, utilisateurs)
//   GET /api/historique/[id]     détail (diff avant/après)
//   GET /api/historique/export   export CSV
//
// Toute autre page (Biens, Utilisateurs, Affectations, Maintenance,
// Départements, Fournisseurs) qui appelle `logHistorique(...)` (voir
// lib/historique.ts) alimente automatiquement cette page en temps réel via
// le bouton "Actualiser" — aucune configuration supplémentaire requise.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    RefreshCw,
    Download,
    Search,
    ScrollText,
    CalendarDays,
    TrendingUp,
    Users,
    ChevronLeft,
    ChevronRight,
    X,
    List,
    GanttChartSquare,
    Plus,
    Pencil,
    Trash2,
    Archive,
    ArrowLeftRight,
    Wrench,
    ShieldCheck,
    KeyRound,
    LogIn,
    Undo2,
    Ban,
    CheckCircle2,
    Package,
    UserCog,
    Building2,
    Truck,
    Loader2,
} from "lucide-react";
import {
    ACTION_LABELS,
    ACTION_TONE,
    CHAMPS_MONETAIRES,
    ENTITE_EMOJI,
    ENTITE_LABELS,
    formatXOF,
    PERIODE_LABELS,
    type HistoriqueAction,
    type HistoriqueEntite,
    type PeriodeFiltre,
} from "@/app/lib/historique-labels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntreeHistorique {
    id: string;
    date: string;
    action: string;
    entite: string;
    entiteId: string | null;
    nomElement: string | null;
    utilisateur: {
        id: string;
        nomComplet: string;
        email: string;
        role: string;
    } | null;
}

interface Stats {
    total: number;
    aujourdHui: number;
    cetteSemaine: number;
    utilisateursActifs: number;
}

interface Meta {
    modules: { valeur: string; libelle: string }[];
    actions: { valeur: string; libelle: string }[];
    utilisateurs: { id: string; nomComplet: string }[];
}

interface DetailEntree extends EntreeHistorique {
    champsModifies: { champ: string; avant: unknown; apres: unknown }[];
}

const TAILLE_PAGE = 20;

// ---------------------------------------------------------------------------
// Icônes par action / module
// ---------------------------------------------------------------------------

const ICONE_ACTION: Record<string, React.ElementType> = {
    CREATION: Plus,
    MODIFICATION: Pencil,
    SUPPRESSION: Trash2,
    ARCHIVAGE: Archive,
    AFFECTATION: ArrowLeftRight,
    RETOUR: Undo2,
    ANNULATION: Ban,
    MAINTENANCE_DEMARREE: Wrench,
    MAINTENANCE_TERMINEE: CheckCircle2,
    STATUT_MODIFIE: RefreshCw,
    VALEUR_MODIFIEE: TrendingUp,
    ROLE_MODIFIE: ShieldCheck,
    MOT_DE_PASSE_MODIFIE: KeyRound,
    COMPTE_DESACTIVE: Ban,
    CONNEXION: LogIn,
};

const ICONE_MODULE: Record<string, React.ElementType> = {
    Bien: Package,
    Utilisateur: UserCog,
    Departement: Building2,
    Fournisseur: Truck,
    Maintenance: Wrench,
    Affectation: ArrowLeftRight,
};

const TON_CLASSES: Record<string, string> = {
    success: "bg-[rgba(16,185,129,0.12)] text-[#10b981] ring-[rgba(16,185,129,0.25)]",
    info: "bg-[rgba(14,165,233,0.12)] text-[#38bdf8] ring-[rgba(14,165,233,0.25)]",
    danger: "bg-[rgba(239,68,68,0.12)] text-[#f87171] ring-[rgba(239,68,68,0.25)]",
    warning: "bg-[rgba(245,158,11,0.12)] text-[#fbbf24] ring-[rgba(245,158,11,0.25)]",
    neutral: "bg-[rgba(148,163,184,0.12)] text-[#94a3b8] ring-[rgba(148,163,184,0.2)]",
};

// ---------------------------------------------------------------------------
// Utilitaires d'affichage
// ---------------------------------------------------------------------------

function formatHeure(date: string) {
    return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function libelleJour(date: string): string {
    const d = new Date(date);
    const aujourdHui = new Date();
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    const memeJour = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    if (memeJour(d, aujourdHui)) return "Aujourd'hui";
    if (memeJour(d, hier)) return "Hier";
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function formatValeurChamp(champ: string, valeur: unknown): string {
    if (valeur === null || valeur === undefined || valeur === "") return "—";
    if (typeof valeur === "number" && CHAMPS_MONETAIRES.has(champ)) return formatXOF(valeur);
    if (typeof valeur === "boolean") return valeur ? "Oui" : "Non";
    return String(valeur);
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function Historique() {
    const [vue, setVue] = useState<"timeline" | "tableau">("timeline");

    const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: TAILLE_PAGE, total: 0, totalPages: 1 });
    const [chargementListe, setChargementListe] = useState(true);

    const [stats, setStats] = useState<Stats | null>(null);
    const [meta, setMeta] = useState<Meta>({ modules: [], actions: [], utilisateurs: [] });

    const [rechercheInput, setRechercheInput] = useState("");
    const [recherche, setRecherche] = useState("");
    const [filtreModule, setFiltreModule] = useState("tous");
    const [filtreAction, setFiltreAction] = useState("toutes");
    const [filtreUtilisateur, setFiltreUtilisateur] = useState("tous");
    const [filtrePeriode, setFiltrePeriode] = useState<PeriodeFiltre>("tout");
    const [dateDebut, setDateDebut] = useState("");
    const [dateFin, setDateFin] = useState("");
    const [page, setPage] = useState(1);

    const [entreeSelectionnee, setEntreeSelectionnee] = useState<DetailEntree | null>(null);
    const [chargementDetail, setChargementDetail] = useState(false);
    const [exportEnCours, setExportEnCours] = useState(false);

    //   const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce de la recherche : 400ms après la dernière frappe
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setRecherche(rechercheInput);
            setPage(1);
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [rechercheInput]);

    const construireParams = useCallback(
        (pageCourante: number) => {
            const params = new URLSearchParams();
            params.set("page", String(pageCourante));
            params.set("pageSize", String(TAILLE_PAGE));
            if (recherche) params.set("search", recherche);
            if (filtreModule !== "tous") params.set("module", filtreModule);
            if (filtreAction !== "toutes") params.set("action", filtreAction);
            if (filtreUtilisateur !== "tous") params.set("userId", filtreUtilisateur);
            params.set("periode", filtrePeriode);
            if (filtrePeriode === "personnalisee" && dateDebut && dateFin) {
                params.set("dateDebut", dateDebut);
                params.set("dateFin", dateFin);
            }
            return params;
        },
        [recherche, filtreModule, filtreAction, filtreUtilisateur, filtrePeriode, dateDebut, dateFin]
    );

    const chargerListe = useCallback(
        async (pageCourante: number) => {
            setChargementListe(true);
            try {
                const params = construireParams(pageCourante);
                const res = await fetch(`/api/historique?${params.toString()}`);
                if (!res.ok) throw new Error("Échec du chargement de l'historique");
                const json = await res.json();
                setEntrees(json.data);
                setPagination(json.pagination);
            } catch (error) {
                console.error(error);
            } finally {
                setChargementListe(false);
            }
        },
        [construireParams]
    );

    const chargerStats = useCallback(async () => {
        try {
            const res = await fetch("/api/historique/stats");
            if (!res.ok) throw new Error("Échec du chargement des statistiques");
            setStats(await res.json());
        } catch (error) {
            console.error(error);
        }
    }, []);

    const chargerMeta = useCallback(async () => {
        try {
            const res = await fetch("/api/historique/meta");
            if (!res.ok) throw new Error("Échec du chargement des filtres");
            setMeta(await res.json());
        } catch (error) {
            console.error(error);
        }
    }, []);

    // Chargement initial
    useEffect(() => {
        chargerMeta();
        chargerStats();
    }, [chargerMeta, chargerStats]);

    // Rechargement de la liste à chaque changement de filtre / page
    useEffect(() => {
        chargerListe(page);
    }, [page, chargerListe]);

    // Revenir à la page 1 quand un filtre change (hors pagination directe)
    useEffect(() => {
        setPage(1);
    }, [recherche, filtreModule, filtreAction, filtreUtilisateur, filtrePeriode, dateDebut, dateFin]);

    const actualiserTout = () => {
        chargerStats();
        chargerMeta();
        chargerListe(page);
    };

    const ouvrirDetail = async (id: string) => {
        setChargementDetail(true);
        setEntreeSelectionnee(null);
        try {
            const res = await fetch(`/api/historique/${id}`);
            if (!res.ok) throw new Error("Échec du chargement du détail");
            setEntreeSelectionnee(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setChargementDetail(false);
        }
    };

    const exporter = async () => {
        setExportEnCours(true);
        try {
            const params = construireParams(1);
            const res = await fetch(`/api/historique/export?${params.toString()}`);
            if (!res.ok) throw new Error("Échec de l'export");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const lien = document.createElement("a");
            lien.href = url;
            lien.download = `historique-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(lien);
            lien.click();
            lien.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
        } finally {
            setExportEnCours(false);
        }
    };

    const filtresActifs =
        filtreModule !== "tous" ||
        filtreAction !== "toutes" ||
        filtreUtilisateur !== "tous" ||
        filtrePeriode !== "tout" ||
        recherche !== "";

    const reinitialiserFiltres = () => {
        setRechercheInput("");
        setRecherche("");
        setFiltreModule("tous");
        setFiltreAction("toutes");
        setFiltreUtilisateur("tous");
        setFiltrePeriode("tout");
        setDateDebut("");
        setDateFin("");
    };

    // Regroupement par jour pour la vue Timeline
    const groupesParJour = useMemo(() => {
        const groupes: { jour: string; entrees: EntreeHistorique[] }[] = [];
        for (const entree of entrees) {
            const jour = libelleJour(entree.date);
            const dernierGroupe = groupes[groupes.length - 1];
            if (dernierGroupe && dernierGroupe.jour === jour) {
                dernierGroupe.entrees.push(entree);
            } else {
                groupes.push({ jour, entrees: [entree] });
            }
        }
        return groupes;
    }, [entrees]);

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-6">
            {/* En-tête */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Historique</h1>
                    <p className="text-sm text-[#475569]">
                        Consultez et suivez toutes les activités réalisées sur le patrimoine de l'entreprise.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={actualiserTout}
                        className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0f1824] px-3 py-2 text-sm font-medium text-[#94a3b8] shadow-sm transition hover:bg-[rgba(255,255,255,0.05)]"
                    >
                        <RefreshCw className={`h-4 w-4 ${chargementListe ? "animate-spin" : ""}`} />
                        Actualiser
                    </button>
                    <button
                        onClick={exporter}
                        disabled={exportEnCours}
                        className="flex items-center gap-2 rounded-lg bg-[linear-gradient(135deg,#0891b2,#0e7490)] px-3 py-2 text-sm font-medium text-white shadow-[0_4px_16px_rgba(8,145,178,0.3)] transition hover:opacity-90 disabled:opacity-60"
                    >
                        {exportEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Exporter
                    </button>
                </div>
            </div>

            {/* Cartes statistiques */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <CarteStat icone={ScrollText} libelle="Activités enregistrées" valeur={stats?.total} />
                <CarteStat icone={CalendarDays} libelle="Actions aujourd'hui" valeur={stats?.aujourdHui} />
                <CarteStat icone={TrendingUp} libelle="Actions cette semaine" valeur={stats?.cetteSemaine} />
                <CarteStat icone={Users} libelle="Utilisateurs actifs" valeur={stats?.utilisateursActifs} />
            </div>

            {/* Recherche + filtres */}
            <div className="space-y-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f1824] p-4 shadow-sm">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                    <input
                        value={rechercheInput}
                        onChange={(e) => setRechercheInput(e.target.value)}
                        placeholder="Rechercher une activité (utilisateur, bien, action...)"
                        className="w-full rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0a0f1a] py-2 pl-9 pr-3 text-sm text-[#e2e8f0] placeholder:text-[#334155] outline-none ring-[rgba(14,165,233,0.15)] focus:border-[rgba(14,165,233,0.4)] focus:ring"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <Selecteur
                        valeur={filtreModule}
                        onChange={setFiltreModule}
                        options={[{ valeur: "tous", libelle: "Tous les modules" }, ...meta.modules]}
                    />
                    <Selecteur
                        valeur={filtreAction}
                        onChange={setFiltreAction}
                        options={[{ valeur: "toutes", libelle: "Toutes les actions" }, ...meta.actions]}
                    />
                    <Selecteur
                        valeur={filtreUtilisateur}
                        onChange={setFiltreUtilisateur}
                        options={[
                            { valeur: "tous", libelle: "Tous les utilisateurs" },
                            ...meta.utilisateurs.map((u) => ({ valeur: u.id, libelle: u.nomComplet })),
                        ]}
                    />
                    <Selecteur
                        valeur={filtrePeriode}
                        onChange={(v) => setFiltrePeriode(v as PeriodeFiltre)}
                        options={Object.entries(PERIODE_LABELS).map(([valeur, libelle]) => ({ valeur, libelle }))}
                    />

                    {filtrePeriode === "personnalisee" && (
                        <>
                            <input
                                type="date"
                                value={dateDebut}
                                onChange={(e) => setDateDebut(e.target.value)}
                                className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0a0f1a] px-2 py-1.5 text-sm text-[#e2e8f0] [color-scheme:dark]"
                            />
                            <input
                                type="date"
                                value={dateFin}
                                onChange={(e) => setDateFin(e.target.value)}
                                className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0a0f1a] px-2 py-1.5 text-sm text-[#e2e8f0] [color-scheme:dark]"
                            />
                        </>
                    )}

                    {filtresActifs && (
                        <button
                            onClick={reinitialiserFiltres}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[#64748b] hover:text-[#e2e8f0]"
                        >
                            <X className="h-3.5 w-3.5" /> Réinitialiser
                        </button>
                    )}

                    <div className="ml-auto flex overflow-hidden rounded-lg border border-[rgba(255,255,255,0.06)]">
                        <button
                            onClick={() => setVue("timeline")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${vue === "timeline" ? "bg-[rgba(14,165,233,0.2)] text-[#38bdf8]" : "bg-[#0f1824] text-[#475569]"
                                }`}
                        >
                            <GanttChartSquare className="h-4 w-4" /> Timeline
                        </button>
                        <button
                            onClick={() => setVue("tableau")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${vue === "tableau" ? "bg-[rgba(14,165,233,0.2)] text-[#38bdf8]" : "bg-[#0f1824] text-[#475569]"
                                }`}
                        >
                            <List className="h-4 w-4" /> Tableau
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenu : timeline ou tableau */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f1824] shadow-sm">
                <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
                    <h2 className="text-sm font-semibold text-[#94a3b8]">Activités récentes</h2>
                </div>

                {chargementListe ? (
                    <div className="flex items-center justify-center py-16 text-[#475569]">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : entrees.length === 0 ? (
                    <div className="py-16 text-center text-sm text-[#475569]">Aucune activité trouvée.</div>
                ) : vue === "timeline" ? (
                    <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                        {groupesParJour.map((groupe) => (
                            <div key={groupe.jour} className="px-4 py-3">
                                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#475569]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#475569]" />
                                    {groupe.jour}
                                </div>
                                <div className="space-y-1">
                                    {groupe.entrees.map((entree) => (
                                        <LigneTimeline key={entree.id} entree={entree} onClic={() => ouvrirDetail(entree.id)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-xs uppercase tracking-wide text-[#475569]">
                                    <th className="px-4 py-2 font-medium">Date</th>
                                    <th className="px-4 py-2 font-medium">Utilisateur</th>
                                    <th className="px-4 py-2 font-medium">Action</th>
                                    <th className="px-4 py-2 font-medium">Module</th>
                                    <th className="px-4 py-2 font-medium">Élément</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                                {entrees.map((entree) => (
                                    <tr
                                        key={entree.id}
                                        onClick={() => ouvrirDetail(entree.id)}
                                        className="cursor-pointer hover:bg-[rgba(255,255,255,0.025)]"
                                    >
                                        <td className="whitespace-nowrap px-4 py-2.5 text-[#64748b]">
                                            {new Date(entree.date).toLocaleDateString("fr-FR")} · {formatHeure(entree.date)}
                                        </td>
                                        <td className="px-4 py-2.5 font-medium text-white">
                                            {entree.utilisateur?.nomComplet ?? "—"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <BadgeAction action={entree.action} />
                                        </td>
                                        <td className="px-4 py-2.5 text-[#94a3b8]">
                                            {ENTITE_EMOJI[entree.entite as HistoriqueEntite] ?? "📄"}{" "}
                                            {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
                                        </td>
                                        <td className="px-4 py-2.5 text-[#94a3b8]">{entree.nomElement ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] bg-[#0c1520] px-4 py-3 text-sm text-[#475569]">
                        <span>
                            Page {pagination.page} sur {pagination.totalPages} · {pagination.total} activités
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1}
                                className="rounded-lg border border-[rgba(255,255,255,0.06)] p-1.5 text-[#475569] disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="rounded-lg border border-[rgba(255,255,255,0.06)] p-1.5 text-[#475569] disabled:opacity-40"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de détail */}
            {(entreeSelectionnee || chargementDetail) && (
                <ModalDetail
                    entree={entreeSelectionnee}
                    chargement={chargementDetail}
                    onFermer={() => setEntreeSelectionnee(null)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function CarteStat({
    icone: Icone,
    libelle,
    valeur,
}: {
    icone: React.ElementType;
    libelle: string;
    valeur: number | undefined;
}) {
    return (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f1824] p-4 shadow-sm">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.05)] text-[#94a3b8]">
                <Icone className="h-4.5 w-4.5" />
            </div>
            <div className="text-2xl font-bold text-white">
                {valeur === undefined ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" /> : valeur}
            </div>
            <div className="text-xs text-[#475569]">{libelle}</div>
        </div>
    );
}

function Selecteur({
    valeur,
    onChange,
    options,
}: {
    valeur: string;
    onChange: (v: string) => void;
    options: { valeur: string; libelle: string }[];
}) {
    return (
        <select
            value={valeur}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[#0a0f1a] px-2.5 py-1.5 text-sm text-[#e2e8f0] outline-none focus:border-[rgba(14,165,233,0.4)]"
        >
            {options.map((o) => (
                <option key={o.valeur} value={o.valeur} className="bg-[#0f1824] text-[#e2e8f0]">
                    {o.libelle}
                </option>
            ))}
        </select>
    );
}

function BadgeAction({ action }: { action: string }) {
    const ton = ACTION_TONE[action as HistoriqueAction] ?? "neutral";
    const libelle = ACTION_LABELS[action as HistoriqueAction] ?? action;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TON_CLASSES[ton]}`}
        >
            {libelle}
        </span>
    );
}

function LigneTimeline({ entree, onClic }: { entree: EntreeHistorique; onClic: () => void }) {
    const IconeAction = ICONE_ACTION[entree.action] ?? ScrollText;
    const ton = ACTION_TONE[entree.action as HistoriqueAction] ?? "neutral";

    return (
        <button
            onClick={onClic}
            className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-[rgba(255,255,255,0.03)]"
        >
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${TON_CLASSES[ton]}`}>
                <IconeAction className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">
                        {ACTION_LABELS[entree.action as HistoriqueAction] ?? entree.action}
                    </span>
                    <span className="text-xs text-[#475569]">
                        {ENTITE_EMOJI[entree.entite as HistoriqueEntite] ?? "📄"}{" "}
                        {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
                    </span>
                </div>
                <div className="truncate text-sm text-[#94a3b8]">{entree.nomElement ?? "—"}</div>
                <div className="text-xs text-[#475569]">{entree.utilisateur?.nomComplet ?? "Système"}</div>
            </div>
            <span className="shrink-0 text-xs text-[#475569]">{formatHeure(entree.date)}</span>
        </button>
    );
}

function ModalDetail({
    entree,
    chargement,
    onFermer,
}: {
    entree: DetailEntree | null;
    chargement: boolean;
    onFermer: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[4px]"
            onClick={onFermer}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg overflow-hidden rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0f1824] shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
            >
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-5 py-4">
                    <h3 className="text-sm font-semibold text-white">Détail de l'activité</h3>
                    <button onClick={onFermer} className="text-[#475569] hover:text-[#e2e8f0]">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {chargement || !entree ? (
                    <div className="flex items-center justify-center py-16 text-[#475569]">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4 px-5 py-4">
                        <div className="flex items-center justify-between">
                            <BadgeAction action={entree.action} />
                            <span className="text-xs text-[#475569]">
                                {new Date(entree.date).toLocaleDateString("fr-FR")} — {formatHeure(entree.date)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-xs text-[#475569]">Utilisateur</div>
                                <div className="font-medium text-white">{entree.utilisateur?.nomComplet ?? "Système"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-[#475569]">Module</div>
                                <div className="font-medium text-white">
                                    {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
                                </div>
                            </div>
                            {entree.nomElement && (
                                <div className="col-span-2">
                                    <div className="text-xs text-[#475569]">Élément concerné</div>
                                    <div className="font-medium text-white">{entree.nomElement}</div>
                                </div>
                            )}
                        </div>

                        {entree.champsModifies.length > 0 && (
                            <div className="space-y-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
                                <div className="text-xs font-medium uppercase tracking-wide text-[#475569]">Modifications</div>
                                {entree.champsModifies.map((c) => (
                                    <div key={c.champ} className="rounded-lg border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3">
                                        <div className="mb-1 text-xs capitalize text-[#64748b]">{c.champ}</div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="rounded bg-[rgba(239,68,68,0.12)] px-2 py-0.5 text-[#f87171]">
                                                {formatValeurChamp(c.champ, c.avant)}
                                            </span>
                                            <span className="text-[#475569]">→</span>
                                            <span className="rounded bg-[rgba(16,185,129,0.12)] px-2 py-0.5 text-[#10b981]">
                                                {formatValeurChamp(c.champ, c.apres)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}







// "use client";

// // components/Historique.tsx
// //
// // Page "Historique" de PatrimoineX — journal de traçabilité de toute
// // l'application. Branchée sur les API suivantes :
// //   GET /api/historique          liste paginée + filtrée
// //   GET /api/historique/stats    cartes statistiques
// //   GET /api/historique/meta     options de filtres (modules, actions, utilisateurs)
// //   GET /api/historique/[id]     détail (diff avant/après)
// //   GET /api/historique/export   export CSV
// //
// // Toute autre page (Biens, Utilisateurs, Affectations, Maintenance,
// // Départements, Fournisseurs) qui appelle `logHistorique(...)` (voir
// // lib/historique.ts) alimente automatiquement cette page en temps réel via
// // le bouton "Actualiser" — aucune configuration supplémentaire requise.

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//     RefreshCw,
//     Download,
//     Search,
//     ScrollText,
//     CalendarDays,
//     TrendingUp,
//     Users,
//     ChevronLeft,
//     ChevronRight,
//     X,
//     List,
//     GanttChartSquare,
//     Plus,
//     Pencil,
//     Trash2,
//     Archive,
//     ArrowLeftRight,
//     Wrench,
//     ShieldCheck,
//     KeyRound,
//     LogIn,
//     Undo2,
//     Ban,
//     CheckCircle2,
//     Package,
//     UserCog,
//     Building2,
//     Truck,
//     Loader2,
// } from "lucide-react";
// import {
//     ACTION_LABELS,
//     ACTION_TONE,
//     CHAMPS_MONETAIRES,
//     ENTITE_EMOJI,
//     ENTITE_LABELS,
//     formatXOF,
//     PERIODE_LABELS,
//     type HistoriqueAction,
//     type HistoriqueEntite,
//     type PeriodeFiltre,
// } from "@/app/lib/historique-labels";

// // ---------------------------------------------------------------------------
// // Types
// // ---------------------------------------------------------------------------

// interface EntreeHistorique {
//     id: string;
//     date: string;
//     action: string;
//     entite: string;
//     entiteId: string | null;
//     nomElement: string | null;
//     utilisateur: {
//         id: string;
//         nomComplet: string;
//         email: string;
//         role: string;
//     } | null;
// }

// interface Stats {
//     total: number;
//     aujourdHui: number;
//     cetteSemaine: number;
//     utilisateursActifs: number;
// }

// interface Meta {
//     modules: { valeur: string; libelle: string }[];
//     actions: { valeur: string; libelle: string }[];
//     utilisateurs: { id: string; nomComplet: string }[];
// }

// interface DetailEntree extends EntreeHistorique {
//     champsModifies: { champ: string; avant: unknown; apres: unknown }[];
// }

// const TAILLE_PAGE = 20;

// // ---------------------------------------------------------------------------
// // Icônes par action / module
// // ---------------------------------------------------------------------------

// const ICONE_ACTION: Record<string, React.ElementType> = {
//     CREATION: Plus,
//     MODIFICATION: Pencil,
//     SUPPRESSION: Trash2,
//     ARCHIVAGE: Archive,
//     AFFECTATION: ArrowLeftRight,
//     RETOUR: Undo2,
//     ANNULATION: Ban,
//     MAINTENANCE_DEMARREE: Wrench,
//     MAINTENANCE_TERMINEE: CheckCircle2,
//     STATUT_MODIFIE: RefreshCw,
//     VALEUR_MODIFIEE: TrendingUp,
//     ROLE_MODIFIE: ShieldCheck,
//     MOT_DE_PASSE_MODIFIE: KeyRound,
//     COMPTE_DESACTIVE: Ban,
//     CONNEXION: LogIn,
// };

// const ICONE_MODULE: Record<string, React.ElementType> = {
//     Bien: Package,
//     Utilisateur: UserCog,
//     Departement: Building2,
//     Fournisseur: Truck,
//     Maintenance: Wrench,
//     Affectation: ArrowLeftRight,
// };

// const TON_CLASSES: Record<string, string> = {
//     success: "bg-emerald-50 text-emerald-600 ring-emerald-200",
//     info: "bg-blue-50 text-blue-600 ring-blue-200",
//     danger: "bg-red-50 text-red-600 ring-red-200",
//     warning: "bg-amber-50 text-amber-600 ring-amber-200",
//     neutral: "bg-slate-100 text-slate-600 ring-slate-200",
// };

// // ---------------------------------------------------------------------------
// // Utilitaires d'affichage
// // ---------------------------------------------------------------------------

// function formatHeure(date: string) {
//     return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
// }

// function libelleJour(date: string): string {
//     const d = new Date(date);
//     const aujourdHui = new Date();
//     const hier = new Date();
//     hier.setDate(hier.getDate() - 1);

//     const memeJour = (a: Date, b: Date) =>
//         a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

//     if (memeJour(d, aujourdHui)) return "Aujourd'hui";
//     if (memeJour(d, hier)) return "Hier";
//     return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
// }

// function formatValeurChamp(champ: string, valeur: unknown): string {
//     if (valeur === null || valeur === undefined || valeur === "") return "—";
//     if (typeof valeur === "number" && CHAMPS_MONETAIRES.has(champ)) return formatXOF(valeur);
//     if (typeof valeur === "boolean") return valeur ? "Oui" : "Non";
//     return String(valeur);
// }

// // ---------------------------------------------------------------------------
// // Composant principal
// // ---------------------------------------------------------------------------

// export default function Historique() {
//     const [vue, setVue] = useState<"timeline" | "tableau">("timeline");

//     const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
//     const [pagination, setPagination] = useState({ page: 1, pageSize: TAILLE_PAGE, total: 0, totalPages: 1 });
//     const [chargementListe, setChargementListe] = useState(true);

//     const [stats, setStats] = useState<Stats | null>(null);
//     const [meta, setMeta] = useState<Meta>({ modules: [], actions: [], utilisateurs: [] });

//     const [rechercheInput, setRechercheInput] = useState("");
//     const [recherche, setRecherche] = useState("");
//     const [filtreModule, setFiltreModule] = useState("tous");
//     const [filtreAction, setFiltreAction] = useState("toutes");
//     const [filtreUtilisateur, setFiltreUtilisateur] = useState("tous");
//     const [filtrePeriode, setFiltrePeriode] = useState<PeriodeFiltre>("tout");
//     const [dateDebut, setDateDebut] = useState("");
//     const [dateFin, setDateFin] = useState("");
//     const [page, setPage] = useState(1);

//     const [entreeSelectionnee, setEntreeSelectionnee] = useState<DetailEntree | null>(null);
//     const [chargementDetail, setChargementDetail] = useState(false);
//     const [exportEnCours, setExportEnCours] = useState(false);

//     //   const debounceRef = useRef<ReturnType<typeof setTimeout>>();

//     const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//     // Debounce de la recherche : 400ms après la dernière frappe
//     useEffect(() => {
//         if (debounceRef.current) clearTimeout(debounceRef.current);
//         debounceRef.current = setTimeout(() => {
//             setRecherche(rechercheInput);
//             setPage(1);
//         }, 400);
//         return () => {
//             if (debounceRef.current) clearTimeout(debounceRef.current);
//         };
//     }, [rechercheInput]);

//     const construireParams = useCallback(
//         (pageCourante: number) => {
//             const params = new URLSearchParams();
//             params.set("page", String(pageCourante));
//             params.set("pageSize", String(TAILLE_PAGE));
//             if (recherche) params.set("search", recherche);
//             if (filtreModule !== "tous") params.set("module", filtreModule);
//             if (filtreAction !== "toutes") params.set("action", filtreAction);
//             if (filtreUtilisateur !== "tous") params.set("userId", filtreUtilisateur);
//             params.set("periode", filtrePeriode);
//             if (filtrePeriode === "personnalisee" && dateDebut && dateFin) {
//                 params.set("dateDebut", dateDebut);
//                 params.set("dateFin", dateFin);
//             }
//             return params;
//         },
//         [recherche, filtreModule, filtreAction, filtreUtilisateur, filtrePeriode, dateDebut, dateFin]
//     );

//     const chargerListe = useCallback(
//         async (pageCourante: number) => {
//             setChargementListe(true);
//             try {
//                 const params = construireParams(pageCourante);
//                 const res = await fetch(`/api/historique?${params.toString()}`);
//                 if (!res.ok) throw new Error("Échec du chargement de l'historique");
//                 const json = await res.json();
//                 setEntrees(json.data);
//                 setPagination(json.pagination);
//             } catch (error) {
//                 console.error(error);
//             } finally {
//                 setChargementListe(false);
//             }
//         },
//         [construireParams]
//     );

//     const chargerStats = useCallback(async () => {
//         try {
//             const res = await fetch("/api/historique/stats");
//             if (!res.ok) throw new Error("Échec du chargement des statistiques");
//             setStats(await res.json());
//         } catch (error) {
//             console.error(error);
//         }
//     }, []);

//     const chargerMeta = useCallback(async () => {
//         try {
//             const res = await fetch("/api/historique/meta");
//             if (!res.ok) throw new Error("Échec du chargement des filtres");
//             setMeta(await res.json());
//         } catch (error) {
//             console.error(error);
//         }
//     }, []);

//     // Chargement initial
//     useEffect(() => {
//         chargerMeta();
//         chargerStats();
//     }, [chargerMeta, chargerStats]);

//     // Rechargement de la liste à chaque changement de filtre / page
//     useEffect(() => {
//         chargerListe(page);
//     }, [page, chargerListe]);

//     // Revenir à la page 1 quand un filtre change (hors pagination directe)
//     useEffect(() => {
//         setPage(1);
//     }, [recherche, filtreModule, filtreAction, filtreUtilisateur, filtrePeriode, dateDebut, dateFin]);

//     const actualiserTout = () => {
//         chargerStats();
//         chargerMeta();
//         chargerListe(page);
//     };

//     const ouvrirDetail = async (id: string) => {
//         setChargementDetail(true);
//         setEntreeSelectionnee(null);
//         try {
//             const res = await fetch(`/api/historique/${id}`);
//             if (!res.ok) throw new Error("Échec du chargement du détail");
//             setEntreeSelectionnee(await res.json());
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setChargementDetail(false);
//         }
//     };

//     const exporter = async () => {
//         setExportEnCours(true);
//         try {
//             const params = construireParams(1);
//             const res = await fetch(`/api/historique/export?${params.toString()}`);
//             if (!res.ok) throw new Error("Échec de l'export");
//             const blob = await res.blob();
//             const url = window.URL.createObjectURL(blob);
//             const lien = document.createElement("a");
//             lien.href = url;
//             lien.download = `historique-${new Date().toISOString().slice(0, 10)}.csv`;
//             document.body.appendChild(lien);
//             lien.click();
//             lien.remove();
//             window.URL.revokeObjectURL(url);
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setExportEnCours(false);
//         }
//     };

//     const filtresActifs =
//         filtreModule !== "tous" ||
//         filtreAction !== "toutes" ||
//         filtreUtilisateur !== "tous" ||
//         filtrePeriode !== "tout" ||
//         recherche !== "";

//     const reinitialiserFiltres = () => {
//         setRechercheInput("");
//         setRecherche("");
//         setFiltreModule("tous");
//         setFiltreAction("toutes");
//         setFiltreUtilisateur("tous");
//         setFiltrePeriode("tout");
//         setDateDebut("");
//         setDateFin("");
//     };

//     // Regroupement par jour pour la vue Timeline
//     const groupesParJour = useMemo(() => {
//         const groupes: { jour: string; entrees: EntreeHistorique[] }[] = [];
//         for (const entree of entrees) {
//             const jour = libelleJour(entree.date);
//             const dernierGroupe = groupes[groupes.length - 1];
//             if (dernierGroupe && dernierGroupe.jour === jour) {
//                 dernierGroupe.entrees.push(entree);
//             } else {
//                 groupes.push({ jour, entrees: [entree] });
//             }
//         }
//         return groupes;
//     }, [entrees]);

//     return (
//         <div className="mx-auto max-w-6xl space-y-6 p-6">
//             {/* En-tête */}
//             <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold text-slate-900">Historique</h1>
//                     <p className="text-sm text-slate-500">
//                         Consultez et suivez toutes les activités réalisées sur le patrimoine de l'entreprise.
//                     </p>
//                 </div>
//                 <div className="flex gap-2">
//                     <button
//                         onClick={actualiserTout}
//                         className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
//                     >
//                         <RefreshCw className={`h-4 w-4 ${chargementListe ? "animate-spin" : ""}`} />
//                         Actualiser
//                     </button>
//                     <button
//                         onClick={exporter}
//                         disabled={exportEnCours}
//                         className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
//                     >
//                         {exportEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
//                         Exporter
//                     </button>
//                 </div>
//             </div>

//             {/* Cartes statistiques */}
//             <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
//                 <CarteStat icone={ScrollText} libelle="Activités enregistrées" valeur={stats?.total} />
//                 <CarteStat icone={CalendarDays} libelle="Actions aujourd'hui" valeur={stats?.aujourdHui} />
//                 <CarteStat icone={TrendingUp} libelle="Actions cette semaine" valeur={stats?.cetteSemaine} />
//                 <CarteStat icone={Users} libelle="Utilisateurs actifs" valeur={stats?.utilisateursActifs} />
//             </div>

//             {/* Recherche + filtres */}
//             <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//                 <div className="relative">
//                     <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                     <input
//                         value={rechercheInput}
//                         onChange={(e) => setRechercheInput(e.target.value)}
//                         placeholder="Rechercher une activité (utilisateur, bien, action...)"
//                         className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-slate-900/5 focus:border-slate-400 focus:ring"
//                     />
//                 </div>

//                 <div className="flex flex-wrap gap-2">
//                     <Selecteur
//                         valeur={filtreModule}
//                         onChange={setFiltreModule}
//                         options={[{ valeur: "tous", libelle: "Tous les modules" }, ...meta.modules]}
//                     />
//                     <Selecteur
//                         valeur={filtreAction}
//                         onChange={setFiltreAction}
//                         options={[{ valeur: "toutes", libelle: "Toutes les actions" }, ...meta.actions]}
//                     />
//                     <Selecteur
//                         valeur={filtreUtilisateur}
//                         onChange={setFiltreUtilisateur}
//                         options={[
//                             { valeur: "tous", libelle: "Tous les utilisateurs" },
//                             ...meta.utilisateurs.map((u) => ({ valeur: u.id, libelle: u.nomComplet })),
//                         ]}
//                     />
//                     <Selecteur
//                         valeur={filtrePeriode}
//                         onChange={(v) => setFiltrePeriode(v as PeriodeFiltre)}
//                         options={Object.entries(PERIODE_LABELS).map(([valeur, libelle]) => ({ valeur, libelle }))}
//                     />

//                     {filtrePeriode === "personnalisee" && (
//                         <>
//                             <input
//                                 type="date"
//                                 value={dateDebut}
//                                 onChange={(e) => setDateDebut(e.target.value)}
//                                 className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
//                             />
//                             <input
//                                 type="date"
//                                 value={dateFin}
//                                 onChange={(e) => setDateFin(e.target.value)}
//                                 className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
//                             />
//                         </>
//                     )}

//                     {filtresActifs && (
//                         <button
//                             onClick={reinitialiserFiltres}
//                             className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-slate-800"
//                         >
//                             <X className="h-3.5 w-3.5" /> Réinitialiser
//                         </button>
//                     )}

//                     <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-200">
//                         <button
//                             onClick={() => setVue("timeline")}
//                             className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${vue === "timeline" ? "bg-slate-900 text-white" : "bg-white text-slate-600"
//                                 }`}
//                         >
//                             <GanttChartSquare className="h-4 w-4" /> Timeline
//                         </button>
//                         <button
//                             onClick={() => setVue("tableau")}
//                             className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${vue === "tableau" ? "bg-slate-900 text-white" : "bg-white text-slate-600"
//                                 }`}
//                         >
//                             <List className="h-4 w-4" /> Tableau
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Contenu : timeline ou tableau */}
//             <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
//                 <div className="border-b border-slate-100 px-4 py-3">
//                     <h2 className="text-sm font-semibold text-slate-700">Activités récentes</h2>
//                 </div>

//                 {chargementListe ? (
//                     <div className="flex items-center justify-center py-16 text-slate-400">
//                         <Loader2 className="h-6 w-6 animate-spin" />
//                     </div>
//                 ) : entrees.length === 0 ? (
//                     <div className="py-16 text-center text-sm text-slate-400">Aucune activité trouvée.</div>
//                 ) : vue === "timeline" ? (
//                     <div className="divide-y divide-slate-100">
//                         {groupesParJour.map((groupe) => (
//                             <div key={groupe.jour} className="px-4 py-3">
//                                 <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
//                                     <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
//                                     {groupe.jour}
//                                 </div>
//                                 <div className="space-y-1">
//                                     {groupe.entrees.map((entree) => (
//                                         <LigneTimeline key={entree.id} entree={entree} onClic={() => ouvrirDetail(entree.id)} />
//                                     ))}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 ) : (
//                     <div className="overflow-x-auto">
//                         <table className="w-full text-sm">
//                             <thead>
//                                 <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
//                                     <th className="px-4 py-2 font-medium">Date</th>
//                                     <th className="px-4 py-2 font-medium">Utilisateur</th>
//                                     <th className="px-4 py-2 font-medium">Action</th>
//                                     <th className="px-4 py-2 font-medium">Module</th>
//                                     <th className="px-4 py-2 font-medium">Élément</th>
//                                 </tr>
//                             </thead>
//                             <tbody className="divide-y divide-slate-100">
//                                 {entrees.map((entree) => (
//                                     <tr
//                                         key={entree.id}
//                                         onClick={() => ouvrirDetail(entree.id)}
//                                         className="cursor-pointer hover:bg-slate-50"
//                                     >
//                                         <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
//                                             {new Date(entree.date).toLocaleDateString("fr-FR")} · {formatHeure(entree.date)}
//                                         </td>
//                                         <td className="px-4 py-2.5 font-medium text-slate-800">
//                                             {entree.utilisateur?.nomComplet ?? "—"}
//                                         </td>
//                                         <td className="px-4 py-2.5">
//                                             <BadgeAction action={entree.action} />
//                                         </td>
//                                         <td className="px-4 py-2.5 text-slate-600">
//                                             {ENTITE_EMOJI[entree.entite as HistoriqueEntite] ?? "📄"}{" "}
//                                             {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
//                                         </td>
//                                         <td className="px-4 py-2.5 text-slate-600">{entree.nomElement ?? "—"}</td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}

//                 {/* Pagination */}
//                 {pagination.totalPages > 1 && (
//                     <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
//                         <span>
//                             Page {pagination.page} sur {pagination.totalPages} · {pagination.total} activités
//                         </span>
//                         <div className="flex gap-1">
//                             <button
//                                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//                                 disabled={pagination.page <= 1}
//                                 className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
//                             >
//                                 <ChevronLeft className="h-4 w-4" />
//                             </button>
//                             <button
//                                 onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
//                                 disabled={pagination.page >= pagination.totalPages}
//                                 className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
//                             >
//                                 <ChevronRight className="h-4 w-4" />
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {/* Modal de détail */}
//             {(entreeSelectionnee || chargementDetail) && (
//                 <ModalDetail
//                     entree={entreeSelectionnee}
//                     chargement={chargementDetail}
//                     onFermer={() => setEntreeSelectionnee(null)}
//                 />
//             )}
//         </div>
//     );
// }

// // ---------------------------------------------------------------------------
// // Sous-composants
// // ---------------------------------------------------------------------------

// function CarteStat({
//     icone: Icone,
//     libelle,
//     valeur,
// }: {
//     icone: React.ElementType;
//     libelle: string;
//     valeur: number | undefined;
// }) {
//     return (
//         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//             <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
//                 <Icone className="h-4.5 w-4.5" />
//             </div>
//             <div className="text-2xl font-bold text-slate-900">
//                 {valeur === undefined ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" /> : valeur}
//             </div>
//             <div className="text-xs text-slate-500">{libelle}</div>
//         </div>
//     );
// }

// function Selecteur({
//     valeur,
//     onChange,
//     options,
// }: {
//     valeur: string;
//     onChange: (v: string) => void;
//     options: { valeur: string; libelle: string }[];
// }) {
//     return (
//         <select
//             value={valeur}
//             onChange={(e) => onChange(e.target.value)}
//             className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400"
//         >
//             {options.map((o) => (
//                 <option key={o.valeur} value={o.valeur}>
//                     {o.libelle}
//                 </option>
//             ))}
//         </select>
//     );
// }

// function BadgeAction({ action }: { action: string }) {
//     const ton = ACTION_TONE[action as HistoriqueAction] ?? "neutral";
//     const libelle = ACTION_LABELS[action as HistoriqueAction] ?? action;
//     return (
//         <span
//             className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TON_CLASSES[ton]}`}
//         >
//             {libelle}
//         </span>
//     );
// }

// function LigneTimeline({ entree, onClic }: { entree: EntreeHistorique; onClic: () => void }) {
//     const IconeAction = ICONE_ACTION[entree.action] ?? ScrollText;
//     const ton = ACTION_TONE[entree.action as HistoriqueAction] ?? "neutral";

//     return (
//         <button
//             onClick={onClic}
//             className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-slate-50"
//         >
//             <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${TON_CLASSES[ton]}`}>
//                 <IconeAction className="h-4 w-4" />
//             </div>
//             <div className="min-w-0 flex-1">
//                 <div className="flex flex-wrap items-center gap-2">
//                     <span className="text-sm font-medium text-slate-800">
//                         {ACTION_LABELS[entree.action as HistoriqueAction] ?? entree.action}
//                     </span>
//                     <span className="text-xs text-slate-400">
//                         {ENTITE_EMOJI[entree.entite as HistoriqueEntite] ?? "📄"}{" "}
//                         {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
//                     </span>
//                 </div>
//                 <div className="truncate text-sm text-slate-600">{entree.nomElement ?? "—"}</div>
//                 <div className="text-xs text-slate-400">{entree.utilisateur?.nomComplet ?? "Système"}</div>
//             </div>
//             <span className="shrink-0 text-xs text-slate-400">{formatHeure(entree.date)}</span>
//         </button>
//     );
// }

// function ModalDetail({
//     entree,
//     chargement,
//     onFermer,
// }: {
//     entree: DetailEntree | null;
//     chargement: boolean;
//     onFermer: () => void;
// }) {
//     return (
//         <div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
//             onClick={onFermer}
//         >
//             <div
//                 onClick={(e) => e.stopPropagation()}
//                 className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
//             >
//                 <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
//                     <h3 className="text-sm font-semibold text-slate-800">Détail de l'activité</h3>
//                     <button onClick={onFermer} className="text-slate-400 hover:text-slate-700">
//                         <X className="h-4 w-4" />
//                     </button>
//                 </div>

//                 {chargement || !entree ? (
//                     <div className="flex items-center justify-center py-16 text-slate-400">
//                         <Loader2 className="h-6 w-6 animate-spin" />
//                     </div>
//                 ) : (
//                     <div className="space-y-4 px-5 py-4">
//                         <div className="flex items-center justify-between">
//                             <BadgeAction action={entree.action} />
//                             <span className="text-xs text-slate-400">
//                                 {new Date(entree.date).toLocaleDateString("fr-FR")} — {formatHeure(entree.date)}
//                             </span>
//                         </div>

//                         <div className="grid grid-cols-2 gap-3 text-sm">
//                             <div>
//                                 <div className="text-xs text-slate-400">Utilisateur</div>
//                                 <div className="font-medium text-slate-800">{entree.utilisateur?.nomComplet ?? "Système"}</div>
//                             </div>
//                             <div>
//                                 <div className="text-xs text-slate-400">Module</div>
//                                 <div className="font-medium text-slate-800">
//                                     {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
//                                 </div>
//                             </div>
//                             {entree.nomElement && (
//                                 <div className="col-span-2">
//                                     <div className="text-xs text-slate-400">Élément concerné</div>
//                                     <div className="font-medium text-slate-800">{entree.nomElement}</div>
//                                 </div>
//                             )}
//                         </div>

//                         {entree.champsModifies.length > 0 && (
//                             <div className="space-y-2 border-t border-slate-100 pt-3">
//                                 <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Modifications</div>
//                                 {entree.champsModifies.map((c) => (
//                                     <div key={c.champ} className="rounded-lg bg-slate-50 p-3">
//                                         <div className="mb-1 text-xs capitalize text-slate-500">{c.champ}</div>
//                                         <div className="flex items-center gap-2 text-sm">
//                                             <span className="rounded bg-red-50 px-2 py-0.5 text-red-600">
//                                                 {formatValeurChamp(c.champ, c.avant)}
//                                             </span>
//                                             <span className="text-slate-400">→</span>
//                                             <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
//                                                 {formatValeurChamp(c.champ, c.apres)}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }





// "use client";

// // components/Historique.tsx
// //
// // Page "Historique" de PatrimoineX — journal de traçabilité de toute
// // l'application. Branchée sur les API suivantes :
// //   GET /api/historique          liste paginée + filtrée
// //   GET /api/historique/stats    cartes statistiques
// //   GET /api/historique/meta     options de filtres (modules, actions, utilisateurs)
// //   GET /api/historique/[id]     détail (diff avant/après)
// //   GET /api/historique/export   export CSV
// //
// // Toute autre page (Biens, Utilisateurs, Affectations, Maintenance,
// // Départements, Fournisseurs) qui appelle `logHistorique(...)` (voir
// // lib/historique.ts) alimente automatiquement cette page en temps réel via
// // le bouton "Actualiser" — aucune configuration supplémentaire requise.

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//     RefreshCw,
//     Download,
//     Search,
//     ScrollText,
//     CalendarDays,
//     TrendingUp,
//     Users,
//     ChevronLeft,
//     ChevronRight,
//     X,
//     List,
//     GanttChartSquare,
//     Plus,
//     Pencil,
//     Trash2,
//     Archive,
//     ArrowLeftRight,
//     Wrench,
//     ShieldCheck,
//     KeyRound,
//     LogIn,
//     Undo2,
//     Ban,
//     CheckCircle2,
//     Package,
//     UserCog,
//     Building2,
//     Truck,
//     Loader2,
// } from "lucide-react";
// import {
//     ACTION_LABELS,
//     ACTION_TONE,
//     CHAMPS_MONETAIRES,
//     ENTITE_EMOJI,
//     ENTITE_LABELS,
//     formatXOF,
//     PERIODE_LABELS,
//     type HistoriqueAction,
//     type HistoriqueEntite,
//     type PeriodeFiltre,
// } from "@/app/lib/historique-labels";

// // ---------------------------------------------------------------------------
// // Types
// // ---------------------------------------------------------------------------

// interface EntreeHistorique {
//     id: string;
//     date: string;
//     action: string;
//     entite: string;
//     entiteId: string | null;
//     nomElement: string | null;
//     utilisateur: {
//         id: string;
//         nomComplet: string;
//         email: string;
//         role: string;
//     } | null;
// }

// interface Stats {
//     total: number;
//     aujourdHui: number;
//     cetteSemaine: number;
//     utilisateursActifs: number;
// }

// interface Meta {
//     modules: { valeur: string; libelle: string }[];
//     actions: { valeur: string; libelle: string }[];
//     utilisateurs: { id: string; nomComplet: string }[];
// }

// interface DetailEntree extends EntreeHistorique {
//     champsModifies: { champ: string; avant: unknown; apres: unknown }[];
// }

// const TAILLE_PAGE = 20;

// // ---------------------------------------------------------------------------
// // Icônes par action / module
// // ---------------------------------------------------------------------------

// const ICONE_ACTION: Record<string, React.ElementType> = {
//     CREATION: Plus,
//     MODIFICATION: Pencil,
//     SUPPRESSION: Trash2,
//     ARCHIVAGE: Archive,
//     AFFECTATION: ArrowLeftRight,
//     RETOUR: Undo2,
//     ANNULATION: Ban,
//     MAINTENANCE_DEMARREE: Wrench,
//     MAINTENANCE_TERMINEE: CheckCircle2,
//     STATUT_MODIFIE: RefreshCw,
//     VALEUR_MODIFIEE: TrendingUp,
//     ROLE_MODIFIE: ShieldCheck,
//     MOT_DE_PASSE_MODIFIE: KeyRound,
//     COMPTE_DESACTIVE: Ban,
//     CONNEXION: LogIn,
// };

// const ICONE_MODULE: Record<string, React.ElementType> = {
//     Bien: Package,
//     Utilisateur: UserCog,
//     Departement: Building2,
//     Fournisseur: Truck,
//     Maintenance: Wrench,
//     Affectation: ArrowLeftRight,
// };

// const TON_CLASSES: Record<string, string> = {
//     success: "bg-emerald-50 text-emerald-600 ring-emerald-200",
//     info: "bg-blue-50 text-blue-600 ring-blue-200",
//     danger: "bg-red-50 text-red-600 ring-red-200",
//     warning: "bg-amber-50 text-amber-600 ring-amber-200",
//     neutral: "bg-slate-100 text-slate-600 ring-slate-200",
// };

// // ---------------------------------------------------------------------------
// // Utilitaires d'affichage
// // ---------------------------------------------------------------------------

// function formatHeure(date: string) {
//     return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
// }

// function libelleJour(date: string): string {
//     const d = new Date(date);
//     const aujourdHui = new Date();
//     const hier = new Date();
//     hier.setDate(hier.getDate() - 1);

//     const memeJour = (a: Date, b: Date) =>
//         a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

//     if (memeJour(d, aujourdHui)) return "Aujourd'hui";
//     if (memeJour(d, hier)) return "Hier";
//     return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
// }

// function formatValeurChamp(champ: string, valeur: unknown): string {
//     if (valeur === null || valeur === undefined || valeur === "") return "—";
//     if (typeof valeur === "number" && CHAMPS_MONETAIRES.has(champ)) return formatXOF(valeur);
//     if (typeof valeur === "boolean") return valeur ? "Oui" : "Non";
//     return String(valeur);
// }

// // ---------------------------------------------------------------------------
// // Composant principal
// // ---------------------------------------------------------------------------

// export default function Historique() {
//     const [vue, setVue] = useState<"timeline" | "tableau">("timeline");

//     const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
//     const [pagination, setPagination] = useState({ page: 1, pageSize: TAILLE_PAGE, total: 0, totalPages: 1 });
//     const [chargementListe, setChargementListe] = useState(true);

//     const [stats, setStats] = useState<Stats | null>(null);
//     const [meta, setMeta] = useState<Meta>({ modules: [], actions: [], utilisateurs: [] });

//     const [rechercheInput, setRechercheInput] = useState("");
//     const [recherche, setRecherche] = useState("");
//     const [filtreModule, setFiltreModule] = useState("tous");
//     const [filtreAction, setFiltreAction] = useState("toutes");
//     const [filtreUtilisateur, setFiltreUtilisateur] = useState("tous");
//     const [filtrePeriode, setFiltrePeriode] = useState<PeriodeFiltre>("tout");
//     const [dateDebut, setDateDebut] = useState("");
//     const [dateFin, setDateFin] = useState("");
//     const [page, setPage] = useState(1);

//     const [entreeSelectionnee, setEntreeSelectionnee] = useState<DetailEntree | null>(null);
//     const [chargementDetail, setChargementDetail] = useState(false);
//     const [exportEnCours, setExportEnCours] = useState(false);

//     //   const debounceRef = useRef<ReturnType<typeof setTimeout>>();

//     const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//     // Debounce de la recherche : 400ms après la dernière frappe
//     useEffect(() => {
//         if (debounceRef.current) clearTimeout(debounceRef.current);
//         debounceRef.current = setTimeout(() => {
//             setRecherche(rechercheInput);
//             setPage(1);
//         }, 400);
//         return () => {
//             if (debounceRef.current) clearTimeout(debounceRef.current);
//         };
//     }, [rechercheInput]);

//     const construireParams = useCallback(
//         (pageCourante: number) => {
//             const params = new URLSearchParams();
//             params.set("page", String(pageCourante));
//             params.set("pageSize", String(TAILLE_PAGE));
//             if (recherche) params.set("search", recherche);
//             if (filtreModule !== "tous") params.set("module", filtreModule);
//             if (filtreAction !== "toutes") params.set("action", filtreAction);
//             if (filtreUtilisateur !== "tous") params.set("userId", filtreUtilisateur);
//             params.set("periode", filtrePeriode);
//             if (filtrePeriode === "personnalisee" && dateDebut && dateFin) {
//                 params.set("dateDebut", dateDebut);
//                 params.set("dateFin", dateFin);
//             }
//             return params;
//         },
//         [recherche, filtreModule, filtreAction, filtreUtilisateur, filtrePeriode, dateDebut, dateFin]
//     );

//     const chargerListe = useCallback(
//         async (pageCourante: number) => {
//             setChargementListe(true);
//             try {
//                 const params = construireParams(pageCourante);
//                 const res = await fetch(`/api/historique?${params.toString()}`);
//                 if (!res.ok) throw new Error("Échec du chargement de l'historique");
//                 const json = await res.json();
//                 setEntrees(json.data);
//                 setPagination(json.pagination);
//             } catch (error) {
//                 console.error(error);
//             } finally {
//                 setChargementListe(false);
//             }
//         },
//         [construireParams]
//     );

//     const chargerStats = useCallback(async () => {
//         try {
//             const res = await fetch("/api/historique/stats");
//             if (!res.ok) throw new Error("Échec du chargement des statistiques");
//             setStats(await res.json());
//         } catch (error) {
//             console.error(error);
//         }
//     }, []);

//     const chargerMeta = useCallback(async () => {
//         try {
//             const res = await fetch("/api/historique/meta");
//             if (!res.ok) throw new Error("Échec du chargement des filtres");
//             setMeta(await res.json());
//         } catch (error) {
//             console.error(error);
//         }
//     }, []);

//     // Chargement initial
//     useEffect(() => {
//         chargerMeta();
//         chargerStats();
//     }, [chargerMeta, chargerStats]);

//     // Rechargement de la liste à chaque changement de filtre / page
//     useEffect(() => {
//         chargerListe(page);
//     }, [page, chargerListe]);

//     // Revenir à la page 1 quand un filtre change (hors pagination directe)
//     useEffect(() => {
//         setPage(1);
//     }, [recherche, filtreModule, filtreAction, filtreUtilisateur, filtrePeriode, dateDebut, dateFin]);

//     const actualiserTout = () => {
//         chargerStats();
//         chargerMeta();
//         chargerListe(page);
//     };

//     const ouvrirDetail = async (id: string) => {
//         setChargementDetail(true);
//         setEntreeSelectionnee(null);
//         try {
//             const res = await fetch(`/api/historique/${id}`);
//             if (!res.ok) throw new Error("Échec du chargement du détail");
//             setEntreeSelectionnee(await res.json());
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setChargementDetail(false);
//         }
//     };

//     const exporter = async () => {
//         setExportEnCours(true);
//         try {
//             const params = construireParams(1);
//             const res = await fetch(`/api/historique/export?${params.toString()}`);
//             if (!res.ok) throw new Error("Échec de l'export");
//             const blob = await res.blob();
//             const url = window.URL.createObjectURL(blob);
//             const lien = document.createElement("a");
//             lien.href = url;
//             lien.download = `historique-${new Date().toISOString().slice(0, 10)}.csv`;
//             document.body.appendChild(lien);
//             lien.click();
//             lien.remove();
//             window.URL.revokeObjectURL(url);
//         } catch (error) {
//             console.error(error);
//         } finally {
//             setExportEnCours(false);
//         }
//     };

//     const filtresActifs =
//         filtreModule !== "tous" ||
//         filtreAction !== "toutes" ||
//         filtreUtilisateur !== "tous" ||
//         filtrePeriode !== "tout" ||
//         recherche !== "";

//     const reinitialiserFiltres = () => {
//         setRechercheInput("");
//         setRecherche("");
//         setFiltreModule("tous");
//         setFiltreAction("toutes");
//         setFiltreUtilisateur("tous");
//         setFiltrePeriode("tout");
//         setDateDebut("");
//         setDateFin("");
//     };

//     // Regroupement par jour pour la vue Timeline
//     const groupesParJour = useMemo(() => {
//         const groupes: { jour: string; entrees: EntreeHistorique[] }[] = [];
//         for (const entree of entrees) {
//             const jour = libelleJour(entree.date);
//             const dernierGroupe = groupes[groupes.length - 1];
//             if (dernierGroupe && dernierGroupe.jour === jour) {
//                 dernierGroupe.entrees.push(entree);
//             } else {
//                 groupes.push({ jour, entrees: [entree] });
//             }
//         }
//         return groupes;
//     }, [entrees]);

//     return (
//         <div className="mx-auto max-w-6xl space-y-6 p-6">
//             {/* En-tête */}
//             <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold text-slate-900">Historique</h1>
//                     <p className="text-sm text-slate-500">
//                         Consultez et suivez toutes les activités réalisées sur le patrimoine de l'entreprise.
//                     </p>
//                 </div>
//                 <div className="flex gap-2">
//                     <button
//                         onClick={actualiserTout}
//                         className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
//                     >
//                         <RefreshCw className={`h-4 w-4 ${chargementListe ? "animate-spin" : ""}`} />
//                         Actualiser
//                     </button>
//                     <button
//                         onClick={exporter}
//                         disabled={exportEnCours}
//                         className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
//                     >
//                         {exportEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
//                         Exporter
//                     </button>
//                 </div>
//             </div>

//             {/* Cartes statistiques */}
//             <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
//                 <CarteStat icone={ScrollText} libelle="Activités enregistrées" valeur={stats?.total} />
//                 <CarteStat icone={CalendarDays} libelle="Actions aujourd'hui" valeur={stats?.aujourdHui} />
//                 <CarteStat icone={TrendingUp} libelle="Actions cette semaine" valeur={stats?.cetteSemaine} />
//                 <CarteStat icone={Users} libelle="Utilisateurs actifs" valeur={stats?.utilisateursActifs} />
//             </div>

//             {/* Recherche + filtres */}
//             <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//                 <div className="relative">
//                     <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                     <input
//                         value={rechercheInput}
//                         onChange={(e) => setRechercheInput(e.target.value)}
//                         placeholder="Rechercher une activité (utilisateur, bien, action...)"
//                         className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-slate-900/5 focus:border-slate-400 focus:ring"
//                     />
//                 </div>

//                 <div className="flex flex-wrap gap-2">
//                     <Selecteur
//                         valeur={filtreModule}
//                         onChange={setFiltreModule}
//                         options={[{ valeur: "tous", libelle: "Tous les modules" }, ...meta.modules]}
//                     />
//                     <Selecteur
//                         valeur={filtreAction}
//                         onChange={setFiltreAction}
//                         options={[{ valeur: "toutes", libelle: "Toutes les actions" }, ...meta.actions]}
//                     />
//                     <Selecteur
//                         valeur={filtreUtilisateur}
//                         onChange={setFiltreUtilisateur}
//                         options={[
//                             { valeur: "tous", libelle: "Tous les utilisateurs" },
//                             ...meta.utilisateurs.map((u) => ({ valeur: u.id, libelle: u.nomComplet })),
//                         ]}
//                     />
//                     <Selecteur
//                         valeur={filtrePeriode}
//                         onChange={(v) => setFiltrePeriode(v as PeriodeFiltre)}
//                         options={Object.entries(PERIODE_LABELS).map(([valeur, libelle]) => ({ valeur, libelle }))}
//                     />

//                     {filtrePeriode === "personnalisee" && (
//                         <>
//                             <input
//                                 type="date"
//                                 value={dateDebut}
//                                 onChange={(e) => setDateDebut(e.target.value)}
//                                 className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
//                             />
//                             <input
//                                 type="date"
//                                 value={dateFin}
//                                 onChange={(e) => setDateFin(e.target.value)}
//                                 className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
//                             />
//                         </>
//                     )}

//                     {filtresActifs && (
//                         <button
//                             onClick={reinitialiserFiltres}
//                             className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-slate-800"
//                         >
//                             <X className="h-3.5 w-3.5" /> Réinitialiser
//                         </button>
//                     )}

//                     <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-200">
//                         <button
//                             onClick={() => setVue("timeline")}
//                             className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${vue === "timeline" ? "bg-slate-900 text-white" : "bg-white text-slate-600"
//                                 }`}
//                         >
//                             <GanttChartSquare className="h-4 w-4" /> Timeline
//                         </button>
//                         <button
//                             onClick={() => setVue("tableau")}
//                             className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${vue === "tableau" ? "bg-slate-900 text-white" : "bg-white text-slate-600"
//                                 }`}
//                         >
//                             <List className="h-4 w-4" /> Tableau
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Contenu : timeline ou tableau */}
//             <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
//                 <div className="border-b border-slate-100 px-4 py-3">
//                     <h2 className="text-sm font-semibold text-slate-700">Activités récentes</h2>
//                 </div>

//                 {chargementListe ? (
//                     <div className="flex items-center justify-center py-16 text-slate-400">
//                         <Loader2 className="h-6 w-6 animate-spin" />
//                     </div>
//                 ) : entrees.length === 0 ? (
//                     <div className="py-16 text-center text-sm text-slate-400">Aucune activité trouvée.</div>
//                 ) : vue === "timeline" ? (
//                     <div className="divide-y divide-slate-100">
//                         {groupesParJour.map((groupe) => (
//                             <div key={groupe.jour} className="px-4 py-3">
//                                 <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
//                                     <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
//                                     {groupe.jour}
//                                 </div>
//                                 <div className="space-y-1">
//                                     {groupe.entrees.map((entree) => (
//                                         <LigneTimeline key={entree.id} entree={entree} onClic={() => ouvrirDetail(entree.id)} />
//                                     ))}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 ) : (
//                     <div className="overflow-x-auto">
//                         <table className="w-full text-sm">
//                             <thead>
//                                 <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
//                                     <th className="px-4 py-2 font-medium">Date</th>
//                                     <th className="px-4 py-2 font-medium">Utilisateur</th>
//                                     <th className="px-4 py-2 font-medium">Action</th>
//                                     <th className="px-4 py-2 font-medium">Module</th>
//                                     <th className="px-4 py-2 font-medium">Élément</th>
//                                 </tr>
//                             </thead>
//                             <tbody className="divide-y divide-slate-100">
//                                 {entrees.map((entree) => (
//                                     <tr
//                                         key={entree.id}
//                                         onClick={() => ouvrirDetail(entree.id)}
//                                         className="cursor-pointer hover:bg-slate-50"
//                                     >
//                                         <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
//                                             {new Date(entree.date).toLocaleDateString("fr-FR")} · {formatHeure(entree.date)}
//                                         </td>
//                                         <td className="px-4 py-2.5 font-medium text-slate-800">
//                                             {entree.utilisateur?.nomComplet ?? "—"}
//                                         </td>
//                                         <td className="px-4 py-2.5">
//                                             <BadgeAction action={entree.action} />
//                                         </td>
//                                         <td className="px-4 py-2.5 text-slate-600">
//                                             {ENTITE_EMOJI[entree.entite as HistoriqueEntite] ?? "📄"}{" "}
//                                             {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
//                                         </td>
//                                         <td className="px-4 py-2.5 text-slate-600">{entree.nomElement ?? "—"}</td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}

//                 {/* Pagination */}
//                 {pagination.totalPages > 1 && (
//                     <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
//                         <span>
//                             Page {pagination.page} sur {pagination.totalPages} · {pagination.total} activités
//                         </span>
//                         <div className="flex gap-1">
//                             <button
//                                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//                                 disabled={pagination.page <= 1}
//                                 className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
//                             >
//                                 <ChevronLeft className="h-4 w-4" />
//                             </button>
//                             <button
//                                 onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
//                                 disabled={pagination.page >= pagination.totalPages}
//                                 className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
//                             >
//                                 <ChevronRight className="h-4 w-4" />
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {/* Modal de détail */}
//             {(entreeSelectionnee || chargementDetail) && (
//                 <ModalDetail
//                     entree={entreeSelectionnee}
//                     chargement={chargementDetail}
//                     onFermer={() => setEntreeSelectionnee(null)}
//                 />
//             )}
//         </div>
//     );
// }

// // ---------------------------------------------------------------------------
// // Sous-composants
// // ---------------------------------------------------------------------------

// function CarteStat({
//     icone: Icone,
//     libelle,
//     valeur,
// }: {
//     icone: React.ElementType;
//     libelle: string;
//     valeur: number | undefined;
// }) {
//     return (
//         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//             <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
//                 <Icone className="h-4.5 w-4.5" />
//             </div>
//             <div className="text-2xl font-bold text-slate-900">
//                 {valeur === undefined ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" /> : valeur}
//             </div>
//             <div className="text-xs text-slate-500">{libelle}</div>
//         </div>
//     );
// }

// function Selecteur({
//     valeur,
//     onChange,
//     options,
// }: {
//     valeur: string;
//     onChange: (v: string) => void;
//     options: { valeur: string; libelle: string }[];
// }) {
//     return (
//         <select
//             value={valeur}
//             onChange={(e) => onChange(e.target.value)}
//             className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400"
//         >
//             {options.map((o) => (
//                 <option key={o.valeur} value={o.valeur}>
//                     {o.libelle}
//                 </option>
//             ))}
//         </select>
//     );
// }

// function BadgeAction({ action }: { action: string }) {
//     const ton = ACTION_TONE[action as HistoriqueAction] ?? "neutral";
//     const libelle = ACTION_LABELS[action as HistoriqueAction] ?? action;
//     return (
//         <span
//             className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TON_CLASSES[ton]}`}
//         >
//             {libelle}
//         </span>
//     );
// }

// function LigneTimeline({ entree, onClic }: { entree: EntreeHistorique; onClic: () => void }) {
//     const IconeAction = ICONE_ACTION[entree.action] ?? ScrollText;
//     const ton = ACTION_TONE[entree.action as HistoriqueAction] ?? "neutral";

//     return (
//         <button
//             onClick={onClic}
//             className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-slate-50"
//         >
//             <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${TON_CLASSES[ton]}`}>
//                 <IconeAction className="h-4 w-4" />
//             </div>
//             <div className="min-w-0 flex-1">
//                 <div className="flex flex-wrap items-center gap-2">
//                     <span className="text-sm font-medium text-slate-800">
//                         {ACTION_LABELS[entree.action as HistoriqueAction] ?? entree.action}
//                     </span>
//                     <span className="text-xs text-slate-400">
//                         {ENTITE_EMOJI[entree.entite as HistoriqueEntite] ?? "📄"}{" "}
//                         {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
//                     </span>
//                 </div>
//                 <div className="truncate text-sm text-slate-600">{entree.nomElement ?? "—"}</div>
//                 <div className="text-xs text-slate-400">{entree.utilisateur?.nomComplet ?? "Système"}</div>
//             </div>
//             <span className="shrink-0 text-xs text-slate-400">{formatHeure(entree.date)}</span>
//         </button>
//     );
// }

// function ModalDetail({
//     entree,
//     chargement,
//     onFermer,
// }: {
//     entree: DetailEntree | null;
//     chargement: boolean;
//     onFermer: () => void;
// }) {
//     return (
//         <div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
//             onClick={onFermer}
//         >
//             <div
//                 onClick={(e) => e.stopPropagation()}
//                 className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
//             >
//                 <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
//                     <h3 className="text-sm font-semibold text-slate-800">Détail de l'activité</h3>
//                     <button onClick={onFermer} className="text-slate-400 hover:text-slate-700">
//                         <X className="h-4 w-4" />
//                     </button>
//                 </div>

//                 {chargement || !entree ? (
//                     <div className="flex items-center justify-center py-16 text-slate-400">
//                         <Loader2 className="h-6 w-6 animate-spin" />
//                     </div>
//                 ) : (
//                     <div className="space-y-4 px-5 py-4">
//                         <div className="flex items-center justify-between">
//                             <BadgeAction action={entree.action} />
//                             <span className="text-xs text-slate-400">
//                                 {new Date(entree.date).toLocaleDateString("fr-FR")} — {formatHeure(entree.date)}
//                             </span>
//                         </div>

//                         <div className="grid grid-cols-2 gap-3 text-sm">
//                             <div>
//                                 <div className="text-xs text-slate-400">Utilisateur</div>
//                                 <div className="font-medium text-slate-800">{entree.utilisateur?.nomComplet ?? "Système"}</div>
//                             </div>
//                             <div>
//                                 <div className="text-xs text-slate-400">Module</div>
//                                 <div className="font-medium text-slate-800">
//                                     {ENTITE_LABELS[entree.entite as HistoriqueEntite] ?? entree.entite}
//                                 </div>
//                             </div>
//                             {entree.nomElement && (
//                                 <div className="col-span-2">
//                                     <div className="text-xs text-slate-400">Élément concerné</div>
//                                     <div className="font-medium text-slate-800">{entree.nomElement}</div>
//                                 </div>
//                             )}
//                         </div>

//                         {entree.champsModifies.length > 0 && (
//                             <div className="space-y-2 border-t border-slate-100 pt-3">
//                                 <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Modifications</div>
//                                 {entree.champsModifies.map((c) => (
//                                     <div key={c.champ} className="rounded-lg bg-slate-50 p-3">
//                                         <div className="mb-1 text-xs capitalize text-slate-500">{c.champ}</div>
//                                         <div className="flex items-center gap-2 text-sm">
//                                             <span className="rounded bg-red-50 px-2 py-0.5 text-red-600">
//                                                 {formatValeurChamp(c.champ, c.avant)}
//                                             </span>
//                                             <span className="text-slate-400">→</span>
//                                             <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
//                                                 {formatValeurChamp(c.champ, c.apres)}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }