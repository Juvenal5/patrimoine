"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AffStatut = "en_cours" | "retourne" | "en_attente" | "annule";
type ViewMode  = "table" | "grid";
type FormMode  = "create" | "edit" | null;
type SortDir   = "asc" | "desc";

interface UserLight {
  id:          string;
  nom:         string;
  prenom:      string;
  email:       string;
  telephone?:  string;
  role?:       string;
  departement: { id: string; nom: string } | null;
}

interface BienLight {
  id:             string;
  codeInventaire: string;
  nom:            string;
  categorie:      string;
  type:           string | null;
  etat?:          string;
  localisation?:  string;                          // ✅ FIX: champ utilisé dans DetailPanel mais absent de l'interface
  departement:    { id: string; nom: string } | null;
}

interface Affectation {
  id:                  string;
  bienId:              string;
  userId:              string;
  validateurId:        string | null;
  dateAffectation:     string;
  datePrevisionRetour: string | null;
  dateRetour:          string | null;
  statut:              AffStatut;
  commentaire:         string | null;
  bien:                BienLight;
  user:                UserLight;
  createdAt:           string;
}

interface FormData {
  bienId:              string;
  userId:              string;
  dateAffectation:     string;
  datePrevisionRetour: string;
  dateRetour:          string;
  statut:              AffStatut;
  commentaire:         string;
}

// ─── Raw API shapes (formats retournés par /api/biens et /api/Utilisateurs) ──

interface BienApiItem {
  id:              string;
  codeInventaire:  string;
  nom:             string;
  categorie:       string | null;
  type?:           string | null;
  etat:            string | null;
  localisation?:   string | null;
  departement:     { id: string; nom: string } | null;
  // champs supplémentaires ignorés
  dateAcquisition?: string | null;
  valeurAchat?:     number | null;
}

interface UserApiItem {
  id:          string;
  nom:         string;
  prenom:      string;
  email:       string;
  telephone?:  string | null;
  role?:       string | null;
  departement?: { id: string; nom: string } | null;
  // format alternatif possible
  department?:  { id: string; nom: string } | null;
}

// ─── Mappers API → types internes ────────────────────────────────────────────

/**
 * ✅ FIX: Convertit la réponse de /api/biens (BienApiItem) en BienLight.
 * Gère les noms de champs potentiellement différents.
 */
function mapBienLight(b: BienApiItem): BienLight {
  return {
    id:             b.id,
    codeInventaire: b.codeInventaire,
    nom:            b.nom,
    categorie:      b.categorie ?? "Autre",
    type:           b.type ?? null,
    etat:           b.etat ?? undefined,
    localisation:   b.localisation ?? undefined,
    departement:    b.departement ?? null,
  };
}

/**
 * ✅ FIX: Convertit la réponse de /api/Utilisateurs en UserLight.
 * Gère les deux formats possibles (departement / department).
 */
function mapUserLight(u: UserApiItem): UserLight {
  return {
    id:          u.id,
    nom:         u.nom,
    prenom:      u.prenom,
    email:       u.email,
    telephone:   u.telephone ?? undefined,
    role:        u.role ?? undefined,
    departement: u.departement ?? u.department ?? null,
  };
}

/**
 * ✅ FIX: Extrait un tableau depuis n'importe quelle forme de réponse API.
 * Gère : tableau direct, { data: [] }, { users: [] }, { biens: [] },
 * { utilisateurs: [] }, { items: [] }, etc.
 */
function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["data", "users", "utilisateurs", "biens", "items", "results", "affectations"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_ICONS: Record<string, string> = {
  Informatique:"💻", Mobilier:"🪑", Véhicule:"🚗", Équipement:"⚙️",
  Électroménager:"🔌", Télécommunication:"📡", Immobilier:"🏢", Autre:"📦",
};

const STATUT_MAP: Record<AffStatut, { label: string; bg: string; text: string; dot: string; border: string }> = {
  en_cours:   { label:"En cours",   bg:"rgba(14,165,233,0.12)",  text:"#38bdf8", dot:"#0ea5e9", border:"rgba(14,165,233,0.25)"  },
  retourne:   { label:"Retourné",   bg:"rgba(16,185,129,0.12)",  text:"#10b981", dot:"#10b981", border:"rgba(16,185,129,0.25)"  },
  en_attente: { label:"En attente", bg:"rgba(245,158,11,0.12)",  text:"#fbbf24", dot:"#f59e0b", border:"rgba(245,158,11,0.25)"  },
  annule:     { label:"Annulé",     bg:"rgba(239,68,68,0.12)",   text:"#f87171", dot:"#ef4444", border:"rgba(239,68,68,0.25)"   },
};

const EMPTY_FORM: FormData = {
  bienId:"", userId:"", dateAffectation: new Date().toISOString().split("T")[0],
  datePrevisionRetour:"", dateRetour:"", statut:"en_cours", commentaire:"",
};

const PAGE_SIZE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-CI", { day:"2-digit", month:"short", year:"numeric" }) : "—";

const fmtDateShort = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-CI", { day:"2-digit", month:"short" }) : "—";

function daysBetween(from: string, to?: string | null): number {
  const start = new Date(from).getTime();
  const end   = to ? new Date(to).getTime() : Date.now();
  return Math.floor((end - start) / 86400000);
}

function isOverdue(aff: Affectation): boolean {
  return (
    aff.statut === "en_cours" &&
    aff.datePrevisionRetour !== null &&
    new Date(aff.datePrevisionRetour) < new Date() &&
    !aff.dateRetour
  );
}

function mapAffApi(api: any): Affectation {
  return {
    id:                  api.id,
    bienId:              api.bienId,
    userId:              api.userId,
    validateurId:        api.validateurId        || null,
    dateAffectation:     api.dateAffectation,
    datePrevisionRetour: api.datePrevisionRetour || null,
    dateRetour:          api.dateRetour          || null,
    statut:              (api.statut as AffStatut) || "en_cours",
    commentaire:         api.commentaire         || null,
    bien:                api.bien,
    user:                api.user,
    createdAt:           api.createdAt,
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  Plus:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Table:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  Grid:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Edit:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Close:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Export:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  ChevDown: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Check:    ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  SortA:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  SortD:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  Sort:     ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  Info:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Return:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>,
  Refresh:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  PrevPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  NextPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Calendar: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Clock:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Warning:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Spinner:  ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation:"spin 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  Package:  ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
};

// ─── Highlight ────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((p, i) =>
        regex.test(p)
          ? <mark key={i} style={{ background:"rgba(56,189,248,0.25)", color:"#38bdf8", borderRadius:3, padding:"0 1px" }}>{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ affs, filter, setFilter, loading }: {
  affs:      Affectation[];
  filter:    "all" | AffStatut;
  setFilter: (s: "all" | AffStatut) => void;
  loading:   boolean;
}) {
  const counts = useMemo(() => ({
    all:        affs.length,
    en_cours:   affs.filter(a => a.statut === "en_cours").length,
    retourne:   affs.filter(a => a.statut === "retourne").length,
    en_attente: affs.filter(a => a.statut === "en_attente").length,
    annule:     affs.filter(a => a.statut === "annule").length,
    overdue:    affs.filter(isOverdue).length,
  }), [affs]);

  const stats = [
    { key:"all"        as const, label:"Total",      value:counts.all,        sub:`${counts.overdue} en retard`,   accent:"#94a3b8", bg:"rgba(148,163,184,0.08)", border:"rgba(148,163,184,0.2)" },
    { key:"en_cours"   as const, label:"En cours",   value:counts.en_cours,   sub:"Biens affectés",                accent:"#38bdf8", bg:"rgba(14,165,233,0.08)",  border:"rgba(14,165,233,0.2)"  },
    { key:"en_attente" as const, label:"En attente", value:counts.en_attente, sub:"À valider",                     accent:"#fbbf24", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.2)"  },
    { key:"retourne"   as const, label:"Retournés",  value:counts.retourne,   sub:"Clôturés",                      accent:"#10b981", bg:"rgba(16,185,129,0.08)",  border:"rgba(16,185,129,0.2)"  },
    { key:"annule"     as const, label:"Annulés",    value:counts.annule,     sub:"Sans suite",                    accent:"#f87171", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.2)"   },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(s => (
        <button key={s.key}
          onClick={() => setFilter(filter === s.key ? "all" : s.key)}
          disabled={loading}
          className="rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
          style={{
            background: filter === s.key ? s.bg : "#0f1824",
            border: filter === s.key ? `1.5px solid ${s.border}` : "1px solid rgba(255,255,255,0.06)",
            boxShadow: filter === s.key ? `0 0 24px ${s.bg}` : "none",
          }}>
          <p className="text-[26px] font-bold leading-none" style={{ color: filter===s.key?s.accent:"#fff" }}>
            {loading ? "—" : s.value}
          </p>
          <p className="text-[11px] font-semibold mt-1" style={{ color: filter===s.key?s.accent:"#475569" }}>{s.label}</p>
          <p className="text-[10px] mt-0.5" style={{ color: filter===s.key?s.accent+"80":"#334155" }}>{loading?"…":s.sub}</p>
          {filter===s.key && <div className="mt-2 h-0.5 rounded-full" style={{ background:s.accent }} />}
        </button>
      ))}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut, onChange, small }: { statut: AffStatut; onChange?: (s: AffStatut) => void; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s   = STATUT_MAP[statut];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
        style={{ background:s.bg, color:s.text, fontSize:small?9:10 }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:s.dot }} />{s.label}
      </span>
    );
  }

  return (
    <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o=>!o); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-all hover:opacity-80"
        style={{ background:s.bg, color:s.text, fontSize:10 }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background:s.dot }} />{s.label}<Ico.ChevDown />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 rounded-xl overflow-hidden"
          style={{ background:"#0a1219", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 16px 48px rgba(0,0,0,0.6)", minWidth:148, top:"100%" }}>
          {(Object.entries(STATUT_MAP) as [AffStatut, typeof STATUT_MAP[AffStatut]][]).map(([k, v]) => (
            <button key={k}
              onClick={(e) => { e.stopPropagation(); onChange(k); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-white/5"
              style={{ color: k===statut?v.text:"#94a3b8" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:v.dot }} />{v.label}
              {k===statut && <span className="ml-auto"><Ico.Check /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Duration bar ─────────────────────────────────────────────────────────────

function DurationBar({ aff }: { aff: Affectation }) {
  const elapsed = daysBetween(aff.dateAffectation, aff.dateRetour || undefined);
  const total   = aff.datePrevisionRetour
    ? daysBetween(aff.dateAffectation, aff.datePrevisionRetour)
    : null;
  const pct     = total ? Math.min(100, Math.round((elapsed / total) * 100)) : null;
  const overdue = isOverdue(aff);

  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
        {pct !== null && (
          <div className="h-full rounded-full transition-all"
            style={{
              width:`${pct}%`,
              background: overdue
                ? "linear-gradient(to right,#ef4444,#f97316)"
                : pct > 80
                ? "linear-gradient(to right,#f59e0b,#fbbf24)"
                : "linear-gradient(to right,#0ea5e9,#38bdf8)",
            }} />
        )}
      </div>
      <span className="text-[10px] font-medium whitespace-nowrap"
        style={{ color: overdue?"#f87171":pct && pct>80?"#fbbf24":"#475569" }}>
        {elapsed}j{total?`/${total}j`:""}
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows({ cols = 9 }: { cols?: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div className="rounded-lg" style={{
                height: 12,
                width: j === 1 ? "70%" : j === 2 ? "55%" : "50%",
                background:"rgba(255,255,255,0.04)",
                animation:`pulse 1.5s ease-in-out ${i*0.1}s infinite`,
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ aff, onClose, onEdit, onReturn }: {
  aff:      Affectation;
  onClose:  () => void;
  onEdit:   () => void;
  onReturn: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const s       = STATUT_MAP[aff.statut];
  const overdue = isOverdue(aff);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width:420, background:"#0a1120", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background:"rgba(255,255,255,0.05)" }}>
                {CAT_ICONS[aff.bien.categorie] ?? "📦"}
              </div>
              <div>
                <p className="text-xs font-mono text-slate-600">{aff.bien.codeInventaire}</p>
                <p className="text-sm font-bold text-white leading-snug">{aff.bien.nom}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <Ico.Edit /> Modifier
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <StatutBadge statut={aff.statut} />
            {overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background:"rgba(239,68,68,0.12)", color:"#f87171" }}>
                <Ico.Warning /> En retard
              </span>
            )}
          </div>
        </div>

        {/* Timeline strip */}
        <div className="mx-5 my-4 rounded-xl overflow-hidden shrink-0"
          style={{ border:`1px solid ${s.border}` }}>
          <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center" style={{ background:s.bg }}>
            {[
              ["Affecté le",   fmtDate(aff.dateAffectation),     "#94a3b8"],
              ["Retour prévu", fmtDate(aff.datePrevisionRetour),  overdue?"#f87171":"#fbbf24"],
              ["Retourné le",  fmtDate(aff.dateRetour),           "#10b981"],
            ].map(([k,v,c])=>(
              <div key={k}>
                <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">{k}</p>
                <p className="text-[12px] font-bold mt-0.5" style={{ color:c as string }}>{v}</p>
              </div>
            ))}
          </div>
          {aff.statut === "en_cours" && (
            <div className="px-4 py-2" style={{ background:"rgba(0,0,0,0.2)" }}>
              <DurationBar aff={aff} />
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">

          {/* Utilisateur */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Utilisateur</p>
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background:"rgba(255,255,255,0.02)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background:"rgba(14,165,233,0.15)", color:"#38bdf8" }}>
                  {aff.user.prenom[0]}{aff.user.nom[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{aff.user.prenom} {aff.user.nom}</p>
                  <p className="text-[11px] text-slate-500">{aff.user.departement?.nom || "—"}</p>
                </div>
              </div>
              {[
                ["Email",      aff.user.email      || "—"],
                ["Téléphone",  aff.user.telephone  || "—"],
              ].map(([k,v],i)=>(
                <div key={k} className="flex justify-between px-4 py-2.5"
                  style={{ borderTop:"1px solid rgba(255,255,255,0.04)", background:i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
                  <span className="text-[11px] text-slate-600">{k}</span>
                  <span className="text-[12px] text-slate-300 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bien */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Bien affecté</p>
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
              {[
                ["Référence",    aff.bien.codeInventaire],
                ["Catégorie",    `${CAT_ICONS[aff.bien.categorie]??""} ${aff.bien.categorie}`],
                ["Marque/Type",  aff.bien.type || "—"],
                ["Département",  aff.bien.departement?.nom || "—"],
                ["Localisation", aff.bien.localisation || "—"],       // ✅ FIX: maintenant typé dans BienLight
              ].map(([k,v],i)=>(
                <div key={k} className="flex justify-between px-4 py-2.5"
                  style={{ borderBottom:i<4?"1px solid rgba(255,255,255,0.04)":"none", background:i%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
                  <span className="text-[11px] text-slate-600">{k}</span>
                  <span className="text-[12px] text-slate-300 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commentaire */}
          {aff.commentaire && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Commentaire</p>
              <div className="rounded-xl px-4 py-3 text-[12px] text-slate-400 leading-relaxed"
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                {aff.commentaire}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 flex items-center gap-2" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
          {aff.statut === "en_cours" && (
            <button onClick={onReturn}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background:"linear-gradient(135deg,#059669,#047857)", color:"#fff" }}>
              <Ico.Return /> Enregistrer le retour
            </button>
          )}
          <button onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all"
            style={{ background:"rgba(255,255,255,0.05)" }}>
            <span className="font-mono text-[10px]">Esc</span> Fermer
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Form Drawer ──────────────────────────────────────────────────────────────

function AffectationDrawer({ mode, initial, biens, users, onClose, onSave, saving }: {
  mode:    "create" | "edit";
  initial: FormData;
  biens:   BienLight[];
  users:   UserLight[];
  onClose: () => void;
  onSave:  (data: FormData) => void;
  saving:  boolean;
}) {
  const [form,       setForm]       = useState<FormData>(initial);
  const [step,       setStep]       = useState<1|2>(1);
  const [bienSearch, setBienSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ✅ FIX: biens et users sont maintenant garantis tableaux grâce à extractArray() dans fetchAll
  const filteredBiens = useMemo(() =>
    biens.filter(b =>
      !bienSearch ||
      b.nom.toLowerCase().includes(bienSearch.toLowerCase()) ||
      b.codeInventaire.toLowerCase().includes(bienSearch.toLowerCase())
    ),
    [biens, bienSearch]
  );

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      !userSearch ||
      `${u.prenom} ${u.nom}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    ),
    [users, userSearch]
  );

  const selectedBien = biens.find(b => b.id === form.bienId);
  const selectedUser = users.find(u => u.id === form.userId);
  const valid        = form.bienId !== "" && form.userId !== "" && form.dateAffectation !== "";

  const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-150 bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width:560, background:"linear-gradient(180deg,#0f1824 0%,#0a1120 100%)", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-24px 0 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:mode==="create"?"rgba(14,165,233,0.15)":"rgba(139,92,246,0.15)" }}>
              <span style={{ color:mode==="create"?"#38bdf8":"#a78bfa", display:"flex" }}>
                {mode === "create" ? <Ico.Package /> : <Ico.Edit />}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">
                {mode === "create" ? "Nouvelle affectation" : "Modifier l'affectation"}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {mode === "create" ? "Assigner un bien à un utilisateur" : "Mise à jour des informations"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
        </div>

        {/* Step tabs */}
        <div className="flex px-6 pt-4 gap-1 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          {([1, 2] as const).map(s => (
            <button key={s} onClick={() => setStep(s)}
              className="flex items-center gap-2 px-4 pb-3 text-xs font-semibold transition-all relative"
              style={{ color:step===s?"#38bdf8":"#475569" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background:step===s?"rgba(14,165,233,0.2)":"rgba(255,255,255,0.05)", color:step===s?"#38bdf8":"#475569" }}>
                {s}
              </span>
              {s === 1 ? "Bien & Utilisateur" : "Dates & Détails"}
              {step===s && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background:"linear-gradient(to right,#0ea5e9,#38bdf8)" }} />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Bien picker */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Bien à affecter<span className="text-sky-400 ml-0.5">*</span>
                  {mode === "edit" && <span className="ml-2 text-slate-700 normal-case">(non modifiable)</span>}
                </label>
                {mode === "edit" && selectedBien ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-xl">{CAT_ICONS[selectedBien.categorie]??"📦"}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedBien.nom}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{selectedBien.codeInventaire}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Search /></span>
                      <input className={iBase + " pl-9"} placeholder="Rechercher un bien…"
                        value={bienSearch} onChange={e => setBienSearch(e.target.value)} />
                    </div>
                    <div className="rounded-xl overflow-hidden max-h-[220px] overflow-y-auto"
                      style={{ border:"1px solid rgba(255,255,255,0.07)" }}>
                      {filteredBiens.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-600">Aucun bien trouvé</div>
                      ) : filteredBiens.map(b => (
                        <button key={b.id}
                          onClick={() => set("bienId", b.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                          style={{
                            background: form.bienId===b.id ? "rgba(14,165,233,0.1)" : "transparent",
                            borderBottom:"1px solid rgba(255,255,255,0.04)",
                          }}>
                          <span className="text-lg shrink-0">{CAT_ICONS[b.categorie]??"📦"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{b.nom}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-slate-500">{b.codeInventaire} · {b.departement?.nom||"—"}</p>
                              {b.etat && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                                  style={{
                                    background: b.etat==="actif"?"rgba(16,185,129,0.15)":b.etat==="maintenance"?"rgba(249,115,22,0.15)":"rgba(100,116,139,0.15)",
                                    color:      b.etat==="actif"?"#10b981":b.etat==="maintenance"?"#f97316":"#64748b",
                                  }}>
                                  {b.etat}
                                </span>
                              )}
                            </div>
                          </div>
                          {form.bienId === b.id && (
                            <span className="text-sky-400 shrink-0"><Ico.Check /></span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User picker */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Utilisateur<span className="text-sky-400 ml-0.5">*</span>
                </label>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Search /></span>
                  <input className={iBase + " pl-9"} placeholder="Rechercher un utilisateur…"
                    value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <div className="rounded-xl overflow-hidden max-h-[200px] overflow-y-auto"
                  style={{ border:"1px solid rgba(255,255,255,0.07)" }}>
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-600">Aucun utilisateur trouvé</div>
                  ) : filteredUsers.map(u => (
                    <button key={u.id}
                      onClick={() => set("userId", u.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                      style={{
                        background: form.userId===u.id?"rgba(14,165,233,0.1)":"transparent",
                        borderBottom:"1px solid rgba(255,255,255,0.04)",
                      }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background:form.userId===u.id?"rgba(14,165,233,0.2)":"rgba(255,255,255,0.08)", color:form.userId===u.id?"#38bdf8":"#64748b" }}>
                        {u.prenom[0]}{u.nom[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{u.prenom} {u.nom}</p>
                        <p className="text-[10px] text-slate-500 truncate">{u.departement?.nom||"—"} · {u.email}</p>
                      </div>
                      {form.userId === u.id && <span className="text-sky-400 shrink-0"><Ico.Check /></span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Date d'affectation<span className="text-sky-400 ml-0.5">*</span>
                  </label>
                  <input type="date" className={iBase} style={{ colorScheme:"dark" }}
                    value={form.dateAffectation} onChange={e => set("dateAffectation", e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Retour prévu</label>
                  <input type="date" className={iBase} style={{ colorScheme:"dark" }}
                    value={form.datePrevisionRetour} onChange={e => set("datePrevisionRetour", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Statut</label>
                  <select className={iBase + " appearance-none cursor-pointer"} value={form.statut} onChange={e => set("statut", e.target.value as AffStatut)}>
                    {Object.entries(STATUT_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Date de retour réel</label>
                  <input type="date" className={iBase} style={{ colorScheme:"dark" }}
                    value={form.dateRetour} onChange={e => set("dateRetour", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Commentaire</label>
                <textarea className={iBase + " resize-none"} rows={3} placeholder="Notes, conditions d'utilisation…"
                  value={form.commentaire} onChange={e => set("commentaire", e.target.value)} />
              </div>

              {/* Récap */}
              {selectedBien && selectedUser && (
                <div className="rounded-xl p-4" style={{ background:"rgba(14,165,233,0.05)", border:"1px solid rgba(14,165,233,0.12)" }}>
                  <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-3">Récapitulatif</p>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-600 mb-0.5">Bien</p>
                      <p className="text-[12px] font-semibold text-white">{selectedBien.nom}</p>
                      <p className="text-[10px] font-mono text-slate-600">{selectedBien.codeInventaire}</p>
                    </div>
                    <div className="text-slate-700 mt-4">→</div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-600 mb-0.5">Utilisateur</p>
                      <p className="text-[12px] font-semibold text-white">{selectedUser.prenom} {selectedUser.nom}</p>
                      <p className="text-[10px] text-slate-600">{selectedUser.departement?.nom||"—"}</p>
                    </div>
                  </div>
                  {form.dateAffectation && (
                    <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop:"1px solid rgba(14,165,233,0.12)" }}>
                      <div>
                        <p className="text-[10px] text-slate-600">Affecté le</p>
                        <p className="text-[12px] text-sky-300 font-semibold">{fmtDate(form.dateAffectation)}</p>
                      </div>
                      {form.datePrevisionRetour && (
                        <div>
                          <p className="text-[10px] text-slate-600">Retour prévu</p>
                          <p className="text-[12px] text-amber-400 font-semibold">{fmtDate(form.datePrevisionRetour)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-slate-600">Statut</p>
                        <StatutBadge statut={form.statut} small />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 gap-3 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">Annuler</button>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>← Retour</button>
            )}
            {step === 1 ? (
              <button onClick={() => setStep(2)} disabled={!form.bienId || !form.userId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
                Suivant →
              </button>
            ) : (
              <button onClick={() => valid && onSave(form)} disabled={!valid || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
                {saving ? <Ico.Spinner /> : <Ico.Check />}
                {mode === "create" ? "Créer l'affectation" : "Sauvegarder"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ aff, onClose, onConfirm, loading }: {
  aff: Affectation; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }} onClick={loading?undefined:onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background:"#0f1824", border:"1px solid rgba(239,68,68,0.2)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(239,68,68,0.12)", color:"#f87171" }}><Ico.Trash /></div>
          <div>
            <h3 className="text-sm font-bold text-white">Supprimer l'affectation ?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{aff.bien.nom} → {aff.user.prenom} {aff.user.nom}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">Cette action supprimera définitivement l'enregistrement de cette affectation.</p>
        <div className="flex gap-3 pt-1">
          <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 disabled:opacity-50" style={{ background:"rgba(255,255,255,0.05)" }}>Annuler</button>
          <button disabled={loading} onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background:"linear-gradient(135deg,#dc2626,#b91c1c)" }}>
            {loading ? <><Ico.Spinner />Suppression…</> : "Supprimer"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Return Modal ─────────────────────────────────────────────────────────────

function ReturnModal({ aff, onClose, onConfirm, loading }: {
  aff: Affectation; onClose: () => void; onConfirm: (date: string, commentaire: string) => void; loading: boolean;
}) {
  const [date,        setDate]        = useState(new Date().toISOString().split("T")[0]);
  const [commentaire, setCommentaire] = useState("");
  const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }} onClick={loading?undefined:onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background:"#0f1824", border:"1px solid rgba(16,185,129,0.2)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(16,185,129,0.12)", color:"#10b981" }}><Ico.Return /></div>
          <div>
            <h3 className="text-sm font-bold text-white">Enregistrer le retour</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{aff.bien.nom}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Date de retour</label>
            <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Commentaire</label>
            <textarea className={iBase + " resize-none"} rows={2} placeholder="État du bien, observations…" value={commentaire} onChange={e => setCommentaire(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 disabled:opacity-50" style={{ background:"rgba(255,255,255,0.05)" }}>Annuler</button>
          <button disabled={loading || !date} onClick={() => onConfirm(date, commentaire)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background:"linear-gradient(135deg,#059669,#047857)" }}>
            {loading ? <><Ico.Spinner />…</> : <><Ico.Check />Confirmer</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AffectationsPage() {
  const [affectations,  setAffectations]  = useState<Affectation[]>([]);
  const [users,         setUsers]         = useState<UserLight[]>([]);    // ✅ initialisé tableau
  const [biensDispo,    setBiensDispo]    = useState<BienLight[]>([]);    // ✅ initialisé tableau
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [returning,     setReturning]     = useState(false);
  const [statusLoading, setStatusLoading] = useState<string|null>(null);

  const [search,        setSearch]        = useState("");
  const [filterStatut,  setFilterStatut]  = useState<"all"|AffStatut>("all");
  const [viewMode,      setViewMode]      = useState<ViewMode>("table");
  const [formMode,      setFormMode]      = useState<FormMode>(null);
  const [editTarget,    setEditTarget]    = useState<Affectation|null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Affectation|null>(null);
  const [returnTarget,  setReturnTarget]  = useState<Affectation|null>(null);
  const [detailAff,     setDetailAff]     = useState<Affectation|null>(null);
  const [sortKey,       setSortKey]       = useState<keyof Affectation>("dateAffectation");
  const [sortDir,       setSortDir]       = useState<SortDir>("desc");
  const [page,          setPage]          = useState(1);
  const [toast,         setToast]         = useState<{msg:string;type:"success"|"error"}|null>(null);

  const showToast = useCallback((msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatut !== "all") params.set("statut", filterStatut);

      const [affRes, userRes, bienRes] = await Promise.all([
        fetch(`/api/affectation?${params}`),
        fetch("/api/Utilisateurs"),
        // ✅ FIX: utilise /api/biens (même endpoint que le Dashboard)
        // au lieu de /api/biens/disponibles qui peut ne pas exister.
        // On charge tous les biens enregistrés — le formulaire les montre tous.
        fetch("/api/biens?limit=500"),
      ]);

      if (!affRes.ok)  throw new Error("Erreur chargement affectations");
      if (!userRes.ok) throw new Error("Erreur chargement utilisateurs");

      const [affRaw, userRaw, bienRaw] = await Promise.all([
        affRes.json(),
        userRes.json(),
        bienRes.ok ? bienRes.json() : [],
      ]);

      // ✅ FIX PRINCIPAL: extractArray() gère tous les formats de réponse possibles
      // ({ data:[] } / { users:[] } / tableau direct / etc.)
      // → users ne sera JAMAIS non-tableau, donc .filter() ne plantera plus jamais.
      const affArr  = extractArray<any>(affRaw);
      const userArr = extractArray<UserApiItem>(userRaw);
      const bienArr = extractArray<BienApiItem>(bienRaw);

      setAffectations(affArr.map(mapAffApi));
      setUsers(userArr.map(mapUserLight));
      setBiensDispo(bienArr.map(mapBienLight));

    } catch (err: any) {
      showToast(err.message || "Erreur de chargement", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatut, showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [search, filterStatut, sortKey, sortDir]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailAff)    { setDetailAff(null);    return; }
        if (formMode)     { setFormMode(null); setEditTarget(null); return; }
        if (deleteTarget) { setDeleteTarget(null); return; }
        if (returnTarget) { setReturnTarget(null); return; }
      }
      if (e.key === "n" && !formMode && !deleteTarget && !detailAff && !returnTarget) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") setFormMode("create");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [detailAff, formMode, deleteTarget, returnTarget]);

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = affectations.filter(a => {
      const q = search.toLowerCase();
      const matchQ = !q
        || a.bien.nom.toLowerCase().includes(q)
        || a.bien.codeInventaire.toLowerCase().includes(q)
        || `${a.user.prenom} ${a.user.nom}`.toLowerCase().includes(q)
        || (a.user.departement?.nom||"").toLowerCase().includes(q);
      const matchS = filterStatut === "all" || a.statut === filterStatut;
      return matchQ && matchS;
    });

    list = [...list].sort((a, b) => {
      let av: any = a[sortKey], bv: any = b[sortKey];
      if (typeof av === "string" && !isNaN(Date.parse(av))) {
        av = new Date(av).getTime(); bv = new Date(bv as string).getTime();
      }
      if (av < bv) return sortDir==="asc"?-1:1;
      if (av > bv) return sortDir==="asc"?1:-1;
      return 0;
    });

    return list;
  }, [affectations, search, filterStatut, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const handleSort = (key: keyof Affectation) => {
    if (sortKey === key) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: keyof Affectation }) => {
    if (sortKey !== k) return <span className="opacity-20"><Ico.Sort /></span>;
    return sortDir==="asc"?<Ico.SortA />:<Ico.SortD />;
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleSave = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        bienId:              data.bienId,
        userId:              data.userId,
        dateAffectation:     data.dateAffectation,
        datePrevisionRetour: data.datePrevisionRetour || null,
        dateRetour:          data.dateRetour          || null,
        statut:              data.statut,
        commentaire:         data.commentaire         || null,
      };
      if (formMode === "create") {
        const res = await fetch("/api/affectation", {
          method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error||"Erreur serveur"); }
        showToast("Affectation créée avec succès.");
      } else if (editTarget) {
        const res = await fetch(`/api/affectation/${editTarget.id}`, {
          method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error||"Erreur serveur"); }
        showToast("Affectation mise à jour.");
      }
      setFormMode(null); setEditTarget(null);
      await fetchAll();
    } catch (err: any) {
      showToast(err.message||"Erreur lors de l'enregistrement.", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/affectation/${deleteTarget.id}`, { method:"DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      showToast("Affectation supprimée.", "error");
      setDeleteTarget(null);
      if (detailAff?.id === deleteTarget.id) setDetailAff(null);
      await fetchAll();
    } catch (err: any) {
      showToast(err.message||"Erreur lors de la suppression.", "error");
    } finally { setDeleting(false); }
  };

  const handleReturn = async (date: string, commentaire: string) => {
    if (!returnTarget) return;
    setReturning(true);
    try {
      const res = await fetch(`/api/affectation/${returnTarget.id}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          bienId:              returnTarget.bienId,
          userId:              returnTarget.userId,
          dateAffectation:     returnTarget.dateAffectation,
          datePrevisionRetour: returnTarget.datePrevisionRetour,
          dateRetour:          date,
          statut:              "retourne",
          commentaire:         commentaire || returnTarget.commentaire,
        }),
      });
      if (!res.ok) throw new Error("Erreur lors du retour");
      showToast("Retour enregistré avec succès.");
      setReturnTarget(null);
      if (detailAff?.id === returnTarget.id) setDetailAff(null);
      await fetchAll();
    } catch (err: any) {
      showToast(err.message||"Erreur lors du retour.", "error");
    } finally { setReturning(false); }
  };

  const handleStatusChange = async (aff: Affectation, newStatut: AffStatut) => {
    setStatusLoading(aff.id);
    setAffectations(p => p.map(a => a.id===aff.id?{...a,statut:newStatut}:a));
    if (detailAff?.id===aff.id) setDetailAff(prev => prev?{...prev,statut:newStatut}:null);
    try {
      const res = await fetch(`/api/affectation/${aff.id}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          bienId:              aff.bienId,
          userId:              aff.userId,
          dateAffectation:     aff.dateAffectation,
          datePrevisionRetour: aff.datePrevisionRetour,
          dateRetour:          aff.dateRetour,
          statut:              newStatut,
          commentaire:         aff.commentaire,
        }),
      });
      if (!res.ok) throw new Error();
      showToast(`Statut → ${STATUT_MAP[newStatut].label}`);
    } catch {
      await fetchAll();
      showToast("Erreur lors du changement de statut.", "error");
    } finally { setStatusLoading(null); }
  };

  const openEdit = (a: Affectation) => { setEditTarget(a); setFormMode("edit"); setDetailAff(null); };

  const formInitial: FormData = editTarget
    ? {
        bienId:              editTarget.bienId,
        userId:              editTarget.userId,
        dateAffectation:     editTarget.dateAffectation.split("T")[0],
        datePrevisionRetour: editTarget.datePrevisionRetour?.split("T")[0]||"",
        dateRetour:          editTarget.dateRetour?.split("T")[0]||"",
        statut:              editTarget.statut,
        commentaire:         editTarget.commentaire||"",
      }
    : EMPTY_FORM;

  // Pour l'édition : inclure le bien actuel en tête de liste même s'il n'est plus "disponible"
  const biensForForm: BienLight[] = formMode === "edit" && editTarget
    ? [editTarget.bien, ...biensDispo.filter(b => b.id !== editTarget.bienId)]
    : biensDispo;

  // Export CSV
  const handleExport = () => {
    const headers = ["ID","Bien","Code","Utilisateur","Département","Date affectation","Retour prévu","Retour réel","Durée (j)","Statut","Commentaire"];
    const rows = filtered.map(a => [
      a.id, a.bien.nom, a.bien.codeInventaire,
      `${a.user.prenom} ${a.user.nom}`, a.user.departement?.nom||"",
      a.dateAffectation?.split("T")[0]||"", a.datePrevisionRetour?.split("T")[0]||"",
      a.dateRetour?.split("T")[0]||"", daysBetween(a.dateAffectation, a.dateRetour||undefined),
      STATUT_MAP[a.statut].label, `"${a.commentaire||""}"`
    ]);
    const csv  = [headers,...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement("a"); el.href=url; el.download="affectations.csv"; el.click();
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} affectation(s) exportée(s).`);
  };

  const overdueCount = affectations.filter(isOverdue).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full px-7 py-6 space-y-5" style={{ fontFamily:"'DM Sans','Inter',sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white"
          style={{ background:toast.type==="error"?"#1a0a0a":"#0f2d1f", border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.3)"}`, boxShadow:"0 16px 48px rgba(0,0,0,0.5)" }}>
          <span style={{ color:toast.type==="error"?"#f87171":"#10b981" }}>{toast.type==="error"?"✕":"✓"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Gestion patrimoniale</p>
          <h2 className="text-2xl font-bold text-white leading-none">Affectations</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner />Chargement…</span>
            ) : (
              <>
                {affectations.length} affectation{affectations.length>1?"s":""}
                {overdueCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background:"rgba(239,68,68,0.12)", color:"#f87171" }}>
                    <Ico.Warning /> {overdueCount} en retard
                  </span>
                )}
                <span className="text-slate-700 mx-2">·</span>
                <span className="text-slate-600 text-[11px]">
                  <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">N</kbd> nouvelle
                  <span className="mx-1">·</span>
                  <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">Echap</kbd> fermer
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
            style={{ background:"rgba(255,255,255,0.05)" }}>
            <Ico.Refresh />
          </button>
          <button onClick={() => setFormMode("create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)", boxShadow:"0 4px 16px rgba(8,145,178,0.3)" }}>
            <Ico.Plus /> Nouvelle affectation
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatBar affs={affectations} filter={filterStatut} setFilter={setFilterStatut} loading={loading} />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth:300 }}>
          <span className="text-slate-600 shrink-0"><Ico.Search /></span>
          <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Bien, utilisateur, département…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white"><Ico.Close /></button>}
        </div>
        <div className="w-px h-5" style={{ background:"rgba(255,255,255,0.07)" }} />
        <div className="flex-1" />
        {!loading && (
          <span className="text-[11px] text-slate-600 font-medium">{filtered.length} résultat{filtered.length>1?"s":""}</span>
        )}
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background:"rgba(255,255,255,0.05)" }}>
          {(["table","grid"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className="p-1.5 rounded-md transition-all"
              style={{ background:viewMode===m?"rgba(14,165,233,0.2)":"transparent", color:viewMode===m?"#38bdf8":"#475569" }}>
              {m==="table"?<Ico.Table />:<Ico.Grid />}
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={loading||filtered.length===0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-40"
          style={{ background:"rgba(255,255,255,0.05)" }}>
          <Ico.Export /> Exporter CSV
        </button>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ background:"#0f1824" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  {([
                    ["Bien",         "bien"],
                    ["Utilisateur",  "user"],
                    ["Affecté le",   "dateAffectation"],
                    ["Retour prévu", "datePrevisionRetour"],
                    ["Durée",        null],
                    ["Statut",       "statut"],
                    ["",             null],
                  ] as [string, keyof Affectation|null][]).map(([label, k], i) => (
                    k ? (
                      <th key={i} className="px-4 py-3 whitespace-nowrap cursor-pointer select-none group/col"
                        onClick={() => handleSort(k)}>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover/col:text-slate-400 transition-colors">
                          {label} <span className={sortKey===k?"text-sky-400":""}><SortIcon k={k} /></span>
                        </div>
                      </th>
                    ) : (
                      <th key={i} className="px-4 py-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</span>
                      </th>
                    )
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={7} />
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-600">Aucune affectation ne correspond.</td></tr>
                ) : paginated.map((a, i) => {
                  const overdue = isOverdue(a);
                  return (
                    <tr key={a.id}
                      style={{
                        borderBottom:"1px solid rgba(255,255,255,0.04)",
                        background: overdue?"rgba(239,68,68,0.03)":i%2===0?"transparent":"rgba(255,255,255,0.01)",
                      }}
                      className="group hover:bg-white/[0.025] transition-colors">

                      {/* Bien */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg shrink-0">{CAT_ICONS[a.bien.categorie]??"📦"}</span>
                          <div>
                            <p className="text-sm font-medium text-white leading-none">
                              <Highlight text={a.bien.nom} query={search} />
                            </p>
                            <p className="text-[10px] font-mono text-slate-600 mt-0.5">{a.bien.codeInventaire}</p>
                          </div>
                        </div>
                      </td>

                      {/* Utilisateur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background:"rgba(14,165,233,0.12)", color:"#38bdf8" }}>
                            {a.user.prenom[0]}{a.user.nom[0]}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white">
                              <Highlight text={`${a.user.prenom} ${a.user.nom}`} query={search} />
                            </p>
                            <p className="text-[10px] text-slate-600">
                              <Highlight text={a.user.departement?.nom||"—"} query={search} />
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3"><span className="text-xs text-slate-400">{fmtDateShort(a.dateAffectation)}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color:overdue?"#f87171":"#64748b" }}>
                          {overdue && <span className="mr-1">⚠</span>}
                          {fmtDateShort(a.datePrevisionRetour)}
                        </span>
                      </td>

                      {/* Durée */}
                      <td className="px-4 py-3"><DurationBar aff={a} /></td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <StatutBadge statut={a.statut} onChange={s => handleStatusChange(a, s)} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button title="Voir détails" onClick={() => setDetailAff(a)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
                          {a.statut === "en_cours" && (
                            <button title="Retour" onClick={() => setReturnTarget(a)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"><Ico.Return /></button>
                          )}
                          <button title="Modifier" onClick={() => openEdit(a)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                          <button title="Supprimer" onClick={() => setDeleteTarget(a)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)", background:"#0c1520" }}>
            <span className="text-[11px] text-slate-600">
              {loading?"Chargement…":filtered.length===0?"Aucun résultat":`${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE,filtered.length)} sur ${filtered.length}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
                {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                  <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ background:page===p?"rgba(14,165,233,0.2)":"transparent", color:page===p?"#38bdf8":"#475569" }}>{p}</button>
                ))}
                <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {viewMode === "grid" && (
        <>
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
                  {[90,70,50].map((w,j)=>(
                    <div key={j} className="rounded-lg" style={{ height:12, width:`${w}%`, background:"rgba(255,255,255,0.04)" }} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {paginated.length===0 ? (
                <div className="col-span-3 py-16 text-center text-sm text-slate-600">Aucune affectation ne correspond.</div>
              ) : paginated.map(a => {
                const overdue = isOverdue(a);
                return (
                  <div key={a.id}
                    className="group rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200"
                    style={{
                      background:"#0f1824",
                      border:`1px solid ${overdue?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.06)"}`,
                      boxShadow: overdue?"0 0 20px rgba(239,68,68,0.06)":"none",
                    }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background:"rgba(255,255,255,0.05)" }}>
                          {CAT_ICONS[a.bien.categorie]??"📦"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-snug line-clamp-1">
                            <Highlight text={a.bien.nom} query={search} />
                          </p>
                          <p className="text-[10px] font-mono text-slate-600">{a.bien.codeInventaire}</p>
                        </div>
                      </div>
                      <StatutBadge statut={a.statut} onChange={ns => handleStatusChange(a, ns)} />
                    </div>
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background:"rgba(14,165,233,0.15)", color:"#38bdf8" }}>
                        {a.user.prenom[0]}{a.user.nom[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate"><Highlight text={`${a.user.prenom} ${a.user.nom}`} query={search} /></p>
                        <p className="text-[10px] text-slate-600 truncate">{a.user.departement?.nom||"—"}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[11px] text-slate-600 flex items-center gap-1"><Ico.Calendar /> Affecté le</span>
                        <span className="text-[11px] text-slate-300 font-medium">{fmtDateShort(a.dateAffectation)}</span>
                      </div>
                      {a.datePrevisionRetour && (
                        <div className="flex justify-between">
                          <span className="text-[11px] flex items-center gap-1" style={{ color:overdue?"#f87171":"#64748b" }}>
                            {overdue?<Ico.Warning />:<Ico.Clock />} Retour prévu
                          </span>
                          <span className="text-[11px] font-medium" style={{ color:overdue?"#f87171":"#94a3b8" }}>{fmtDateShort(a.datePrevisionRetour)}</span>
                        </div>
                      )}
                    </div>
                    <DurationBar aff={a} />
                    <div className="flex items-center justify-end gap-1 pt-1" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                      <button onClick={() => setDetailAff(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
                      {a.statut==="en_cours" && (
                        <button onClick={() => setReturnTarget(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"><Ico.Return /></button>
                      )}
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                      <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 pt-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background:page===p?"rgba(14,165,233,0.2)":"transparent", color:page===p?"#38bdf8":"#475569" }}>{p}</button>
              ))}
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
            </div>
          )}
        </>
      )}

      {/* ── Modals & panels ── */}
      {formMode && (
        <AffectationDrawer
          mode={formMode}
          initial={formInitial}
          biens={biensForForm}
          users={users}
          onClose={() => { setFormMode(null); setEditTarget(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {deleteTarget && <DeleteModal aff={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} />}
      {returnTarget && <ReturnModal aff={returnTarget} onClose={() => setReturnTarget(null)} onConfirm={handleReturn} loading={returning} />}
      {detailAff && (
        <DetailPanel
          aff={detailAff}
          onClose={() => setDetailAff(null)}
          onEdit={() => openEdit(detailAff)}
          onReturn={() => { setReturnTarget(detailAff); setDetailAff(null); }}
        />
      )}
    </div>
  );
}





// "use client";

// export default function Affectations() {
//   return (
//     <div className="min-h-screen flex items-center justify-center" style={{ background: "#070d16" }}>
//       <div className="text-center space-y-3">
//         <div className="text-5xl">🔄</div>
//         <h1 className="text-white text-2xl font-bold">Gestion des affectations</h1>
//         <p className="text-slate-500 text-sm">Page en cours de développement</p>
//       </div>
//     </div>
//   );
// }
