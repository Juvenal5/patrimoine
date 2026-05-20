"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoriqueEntry {
  id:             string;
  userId:         string;
  entiteId:       string | null;
  action:         string;
  entite:         string;
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
  date:           string;
  user: {
    id:          string;
    nom:         string;
    prenom:      string;
    email:       string;
    role:        string;
    departement: { id: string; nom: string } | null;
  };
}

interface ApiStats {
  actions: { label: string; count: number }[];
  entites: { label: string; count: number }[];
}

interface ApiResponse {
  data:  HistoriqueEntry[];
  total: number;
  page:  number;
  pages: number;
  stats: ApiStats;
}

type SortDir = "asc" | "desc";

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  CREATE:      { label:"Création",     color:"#10b981", bg:"rgba(16,185,129,0.12)",  icon:"✦" },
  UPDATE:      { label:"Modification", color:"#38bdf8", bg:"rgba(14,165,233,0.12)",  icon:"✎" },
  DELETE:      { label:"Suppression",  color:"#f87171", bg:"rgba(239,68,68,0.12)",   icon:"✕" },
  AFFECTATION: { label:"Affectation",  color:"#a78bfa", bg:"rgba(139,92,246,0.12)",  icon:"→" },
  RETOUR:      { label:"Retour",       color:"#10b981", bg:"rgba(16,185,129,0.12)",  icon:"↩" },
  LOGIN:       { label:"Connexion",    color:"#fbbf24", bg:"rgba(245,158,11,0.12)",  icon:"⌁" },
  EXPORT:      { label:"Export",       color:"#94a3b8", bg:"rgba(100,116,139,0.12)", icon:"↓" },
  IMPORT:      { label:"Import",       color:"#94a3b8", bg:"rgba(100,116,139,0.12)", icon:"↑" },
};

const ENTITE_META: Record<string, { label: string; icon: string }> = {
  Bien:        { label:"Bien",        icon:"📦" },
  Affectation: { label:"Affectation", icon:"🔗" },
  Utilisateur: { label:"Utilisateur", icon:"👤" },
  Departement: { label:"Département", icon:"🏢" },
  Maintenance: { label:"Maintenance", icon:"🔧" },
  Fournisseur: { label:"Fournisseur", icon:"🏭" },
};

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActionMeta(action: string) {
  const key = Object.keys(ACTION_META).find(k => action.toUpperCase().includes(k));
  return ACTION_META[key || ""] || { label: action, color:"#94a3b8", bg:"rgba(100,116,139,0.12)", icon:"·" };
}

function getEntiteMeta(entite: string) {
  return ENTITE_META[entite] || { label: entite, icon:"📋" };
}

function fmtDateTime(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
    + " à " + dt.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
}

function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "À l'instant";
  if (mins  < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days  < 7)  return `Il y a ${days}j`;
  return fmtDateShort(d);
}

function tryParseJson(s: string | null): string {
  if (!s) return "—";
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed === "object") return JSON.stringify(parsed, null, 2);
    return String(parsed);
  } catch {
    return s;
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  Search:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Close:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Refresh:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Filter:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Export:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  ChevDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevRight:() => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  SortA:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  SortD:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  Sort:     () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  PrevPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  NextPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  User:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Clock:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Diff:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Spinner:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  Calendar: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

// ─── Diff Viewer ──────────────────────────────────────────────────────────────

function DiffViewer({ ancienne, nouvelle }: { ancienne: string | null; nouvelle: string | null }) {
  if (!ancienne && !nouvelle) return null;
  const a = tryParseJson(ancienne);
  const n = tryParseJson(nouvelle);

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {ancienne && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color:"#f87171" }}>Avant</p>
          <pre className="text-[11px] rounded-xl p-3 overflow-auto max-h-32 leading-relaxed font-mono whitespace-pre-wrap break-all"
            style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#fca5a5" }}>
            {a}
          </pre>
        </div>
      )}
      {nouvelle && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color:"#10b981" }}>Après</p>
          <pre className="text-[11px] rounded-xl p-3 overflow-auto max-h-32 leading-relaxed font-mono whitespace-pre-wrap break-all"
            style={{ background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.15)", color:"#6ee7b7" }}>
            {n}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Row expanded detail ──────────────────────────────────────────────────────

function EntryDetail({ entry, onClose }: { entry: HistoriqueEntry; onClose: () => void }) {
  const am = getActionMeta(entry.action);
  const em = getEntiteMeta(entry.entite);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width:480, background:"#0a1120", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background:am.bg, color:am.color, border:`1px solid ${am.color}30` }}>
                {am.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{am.label}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-lg font-medium"
                    style={{ background:"rgba(255,255,255,0.06)", color:"#94a3b8" }}>
                    {em.icon} {em.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{fmtDateTime(entry.date)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all">
              <Ico.Close />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5 pt-4">

          {/* User */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Effectué par</p>
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background:"rgba(255,255,255,0.02)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background:"rgba(14,165,233,0.15)", color:"#38bdf8" }}>
                  {entry.user.prenom[0]}{entry.user.nom[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{entry.user.prenom} {entry.user.nom}</p>
                  <p className="text-[11px] text-slate-500">{entry.user.departement?.nom || "—"}</p>
                </div>
                <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background:entry.user.role==="ADMIN"?"rgba(139,92,246,0.15)":"rgba(255,255,255,0.05)", color:entry.user.role==="ADMIN"?"#a78bfa":"#475569" }}>
                  {entry.user.role}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5" style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-[11px] text-slate-600">Email</span>
                <span className="text-[11px] text-slate-300 font-medium">{entry.user.email}</span>
              </div>
            </div>
          </div>

          {/* Entité */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Entité concernée</p>
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
              {[
                ["Type d'entité",  `${em.icon} ${entry.entite}`],
                ["ID de l'entité", entry.entiteId || "—"],
                ["Action",         `${am.icon} ${entry.action}`],
              ].map(([k, v], i) => (
                <div key={k} className="flex justify-between px-4 py-2.5"
                  style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
                  <span className="text-[11px] text-slate-600">{k}</span>
                  <span className="text-[11px] text-slate-300 font-medium font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diff */}
          {(entry.ancienneValeur || entry.nouvelleValeur) && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-1">Modifications</p>
              <DiffViewer ancienne={entry.ancienneValeur} nouvelle={entry.nouvelleValeur} />
            </div>
          )}

          {/* ID */}
          <div className="rounded-xl px-4 py-3" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">ID de l'entrée</p>
            <p className="text-[11px] font-mono text-slate-500">{entry.id}</p>
          </div>
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] text-slate-700">
            <kbd className="text-slate-500 font-mono">Echap</kbd> pour fermer
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Timeline Row ─────────────────────────────────────────────────────────────

function TimelineRow({ entry, isLast, onSelect }: {
  entry:    HistoriqueEntry;
  isLast:   boolean;
  onSelect: (e: HistoriqueEntry) => void;
}) {
  const am = getActionMeta(entry.action);
  const em = getEntiteMeta(entry.entite);
  const hasDiff = entry.ancienneValeur || entry.nouvelleValeur;

  return (
    <div className="flex gap-4 group cursor-pointer" onClick={() => onSelect(entry)}>
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold z-10 shrink-0 transition-transform group-hover:scale-110"
          style={{ background:am.bg, color:am.color, border:`1.5px solid ${am.color}40` }}>
          {am.icon}
        </div>
        {!isLast && <div className="flex-1 w-px mt-1" style={{ background:"rgba(255,255,255,0.05)", minHeight:20 }} />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="rounded-xl px-4 py-3 transition-all duration-150 group-hover:border-white/10"
          style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>

          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-sm font-semibold" style={{ color:am.color }}>{am.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background:"rgba(255,255,255,0.06)", color:"#64748b" }}>
                {em.icon} {em.label}
              </span>
              {hasDiff && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{ background:"rgba(14,165,233,0.08)", color:"#38bdf8" }}>
                  diff
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">{timeAgo(entry.date)}</span>
          </div>

          {/* User + time */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background:"rgba(14,165,233,0.15)", color:"#38bdf8" }}>
                {entry.user.prenom[0]}{entry.user.nom[0]}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{entry.user.prenom} {entry.user.nom}</span>
              {entry.user.departement && (
                <span className="text-[10px] text-slate-600">· {entry.user.departement.nom}</span>
              )}
            </div>
            <span className="text-slate-700">·</span>
            <span className="text-[10px] text-slate-600">{fmtDateTime(entry.date)}</span>
          </div>

          {/* Inline diff preview */}
          {hasDiff && (
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {entry.ancienneValeur && (
                <div className="rounded-lg px-2.5 py-1.5 text-[10px] font-mono truncate"
                  style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.12)", color:"#fca5a5" }}>
                  − {tryParseJson(entry.ancienneValeur).slice(0, 80)}
                </div>
              )}
              {entry.nouvelleValeur && (
                <div className="rounded-lg px-2.5 py-1.5 text-[10px] font-mono truncate"
                  style={{ background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.12)", color:"#6ee7b7" }}>
                  + {tryParseJson(entry.nouvelleValeur).slice(0, 80)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-7 h-7 rounded-full shrink-0 mt-0.5" style={{ background:"rgba(255,255,255,0.05)" }} />
          <div className="flex-1 rounded-xl p-4 space-y-2.5" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex gap-2">
              <div className="h-3 rounded w-20" style={{ background:"rgba(255,255,255,0.07)", animationDelay:`${i*0.08}s` }} />
              <div className="h-3 rounded w-16" style={{ background:"rgba(255,255,255,0.05)", animationDelay:`${i*0.08}s` }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full" style={{ background:"rgba(255,255,255,0.05)" }} />
              <div className="h-2.5 rounded w-32" style={{ background:"rgba(255,255,255,0.05)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick, count }: {
  label: string; active: boolean; onClick: () => void; count?: number;
}) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap"
      style={{
        background: active ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)",
        color:      active ? "#38bdf8" : "#475569",
        border:     active ? "1px solid rgba(14,165,233,0.3)" : "1px solid rgba(255,255,255,0.07)",
      }}>
      {label}
      {count !== undefined && (
        <span className="px-1 rounded text-[9px] font-bold"
          style={{ background: active ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.08)", color: active ? "#38bdf8" : "#64748b" }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoriquePage() {
  const [entries,       setEntries]       = useState<HistoriqueEntry[]>([]);
  const [total,         setTotal]         = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [apiStats,      setApiStats]      = useState<ApiStats>({ actions:[], entites:[] });
  const [loading,       setLoading]       = useState(true);

  const [search,        setSearch]        = useState("");
  const [filterAction,  setFilterAction]  = useState("");
  const [filterEntite,  setFilterEntite]  = useState("");
  const [filterUser,    setFilterUser]    = useState("");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [page,          setPage]          = useState(1);
  const [sortDir,       setSortDir]       = useState<SortDir>("desc");

  const [selectedEntry, setSelectedEntry] = useState<HistoriqueEntry | null>(null);
  const [showFilters,   setShowFilters]   = useState(false);
  const [toast,         setToast]         = useState<{msg:string;type:"success"|"error"}|null>(null);

  // ✅ CORRECTION : type | null avec valeur initiale null
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(p),
        limit: String(PAGE_SIZE),
        sortDir,
      });
      if (search)       params.set("search",   search);
      if (filterAction) params.set("action",   filterAction);
      if (filterEntite) params.set("entite",   filterEntite);
      if (filterUser)   params.set("userId",   filterUser);
      if (dateFrom)     params.set("from",     dateFrom);
      if (dateTo)       params.set("to",       dateTo);

      const res = await fetch(`/api/historiques?${params}`);
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const json: ApiResponse = await res.json();

      setEntries(json.data);
      setTotal(json.total);
      setTotalPages(json.pages);
      setApiStats(json.stats);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, sortDir, search, filterAction, filterEntite, filterUser, dateFrom, dateTo, showToast]);

  // ✅ CORRECTION : guards null sur clearTimeout
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      fetchHistory(1);
    }, 300);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [search, filterAction, filterEntite, filterUser, dateFrom, dateTo, sortDir]);

  useEffect(() => { fetchHistory(page); }, [page]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedEntry) setSelectedEntry(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectedEntry]);

  // ── Active filters count ───────────────────────────────────────────────────
  const activeFilterCount = [filterAction, filterEntite, filterUser, dateFrom, dateTo].filter(Boolean).length;

  // ── Grouped by date ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: { date: string; items: HistoriqueEntry[] }[] = [];
    for (const e of entries) {
      const d = fmtDateShort(e.date);
      const last = groups[groups.length - 1];
      if (last && last.date === d) last.items.push(e);
      else groups.push({ date: d, items: [e] });
    }
    return groups;
  }, [entries]);

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["ID","Date","Action","Entité","ID Entité","Utilisateur","Département","Email","Avant","Après"];
    const rows = entries.map(e => [
      e.id,
      fmtDateTime(e.date),
      e.action,
      e.entite,
      e.entiteId || "",
      `${e.user.prenom} ${e.user.nom}`,
      e.user.departement?.nom || "",
      e.user.email,
      `"${(e.ancienneValeur || "").replace(/"/g, "'")}"`,
      `"${(e.nouvelleValeur || "").replace(/"/g, "'")}"`,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "historique.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`${entries.length} entrées exportées.`);
  };

  const resetFilters = () => {
    setFilterAction(""); setFilterEntite(""); setFilterUser("");
    setDateFrom(""); setDateTo(""); setSearch(""); setPage(1);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full px-7 py-6 space-y-5" style={{ fontFamily:"'DM Sans','Inter',sans-serif" }}>

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
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Audit & traçabilité</p>
          <h2 className="text-2xl font-bold text-white leading-none">Historique</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner /> Chargement…</span>
            ) : (
              <>
                <span className="text-sky-400 font-semibold">{total.toLocaleString("fr-FR")}</span> entrée{total > 1 ? "s" : ""}
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background:"rgba(14,165,233,0.1)", color:"#38bdf8" }}>
                    {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchHistory(page)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
            style={{ background:"rgba(255,255,255,0.05)" }} title="Actualiser">
            <Ico.Refresh />
          </button>
          <button onClick={handleExport} disabled={loading || entries.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all disabled:opacity-40"
            style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <Ico.Export /> Exporter CSV
          </button>
        </div>
      </div>

      {/* ── Global stat chips ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Total entrées",   value:total,                      accent:"#38bdf8" },
          { label:"Actions uniques", value:apiStats.actions.length,    accent:"#10b981" },
          { label:"Entités tracées", value:apiStats.entites.length,    accent:"#8b5cf6" },
          { label:"Page actuelle",   value:`${page} / ${totalPages}`,  accent:"#f97316" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-5 py-4"
            style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[22px] font-bold leading-none" style={{ color:s.accent }}>{loading?"—":s.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3"
        style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth:320 }}>
          <span className="text-slate-600 shrink-0"><Ico.Search /></span>
          <input
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Rechercher action, entité, utilisateur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white"><Ico.Close /></button>}
        </div>

        <div className="w-px h-5" style={{ background:"rgba(255,255,255,0.07)" }} />

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
          style={{
            background: showFilters || activeFilterCount > 0 ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)",
            color:      showFilters || activeFilterCount > 0 ? "#38bdf8" : "#475569",
            border:     showFilters || activeFilterCount > 0 ? "1px solid rgba(14,165,233,0.3)" : "1px solid rgba(255,255,255,0.07)",
          }}>
          <Ico.Filter />
          Filtres
          {activeFilterCount > 0 && (
            <span className="px-1.5 rounded-full text-[9px] font-bold"
              style={{ background:"rgba(14,165,233,0.25)", color:"#38bdf8" }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort direction */}
        <button
          onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-500 hover:text-white transition-all"
          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.07)" }}
          title={sortDir === "desc" ? "Plus récent en premier" : "Plus ancien en premier"}>
          {sortDir === "desc" ? <Ico.SortD /> : <Ico.SortA />}
          {sortDir === "desc" ? "Récent" : "Ancien"}
        </button>

        <div className="flex-1" />

        {activeFilterCount > 0 && (
          <button onClick={resetFilters}
            className="text-[11px] text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1">
            <Ico.Close /> Réinitialiser
          </button>
        )}
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="rounded-2xl p-4 space-y-4" style={{ background:"#0c1520", border:"1px solid rgba(255,255,255,0.07)" }}>

          {/* Actions */}
          {apiStats.actions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2">Action</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="Toutes" active={!filterAction} onClick={() => setFilterAction("")} />
                {apiStats.actions.map(a => {
                  const meta = getActionMeta(a.label);
                  return (
                    <FilterChip
                      key={a.label}
                      label={`${meta.icon} ${meta.label}`}
                      active={filterAction === a.label}
                      onClick={() => setFilterAction(filterAction === a.label ? "" : a.label)}
                      count={a.count}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Entités */}
          {apiStats.entites.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2">Entité</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="Toutes" active={!filterEntite} onClick={() => setFilterEntite("")} />
                {apiStats.entites.map(e => {
                  const meta = getEntiteMeta(e.label);
                  return (
                    <FilterChip
                      key={e.label}
                      label={`${meta.icon} ${meta.label}`}
                      active={filterEntite === e.label}
                      onClick={() => setFilterEntite(filterEntite === e.label ? "" : e.label)}
                      count={e.count}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2">Période</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Ico.Calendar />
                <span className="text-[11px] text-slate-600">Du</span>
                <input
                  type="date"
                  className="rounded-xl px-3 py-1.5 text-[11px] text-slate-200 outline-none"
                  style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", colorScheme:"dark" }}
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600">Au</span>
                <input
                  type="date"
                  className="rounded-xl px-3 py-1.5 text-[11px] text-slate-200 outline-none"
                  style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", colorScheme:"dark" }}
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="text-[11px] text-slate-600 hover:text-white flex items-center gap-1">
                  <Ico.Close /> Effacer dates
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter tags ── */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-600">Filtres actifs :</span>
          {filterAction && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ background:"rgba(14,165,233,0.1)", color:"#38bdf8", border:"1px solid rgba(14,165,233,0.2)" }}>
              Action : {getActionMeta(filterAction).label}
              <button onClick={() => setFilterAction("")} className="ml-0.5 opacity-60 hover:opacity-100"><Ico.Close /></button>
            </span>
          )}
          {filterEntite && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ background:"rgba(139,92,246,0.1)", color:"#a78bfa", border:"1px solid rgba(139,92,246,0.2)" }}>
              Entité : {getEntiteMeta(filterEntite).icon} {filterEntite}
              <button onClick={() => setFilterEntite("")} className="ml-0.5 opacity-60 hover:opacity-100"><Ico.Close /></button>
            </span>
          )}
          {(dateFrom || dateTo) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ background:"rgba(245,158,11,0.1)", color:"#fbbf24", border:"1px solid rgba(245,158,11,0.2)" }}>
              {dateFrom && `Du ${fmtDateShort(dateFrom)}`}{dateFrom && dateTo && " "}{dateTo && `au ${fmtDateShort(dateTo)}`}
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="ml-0.5 opacity-60 hover:opacity-100"><Ico.Close /></button>
            </span>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {loading ? (
        <SkeletonRows />
      ) : entries.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <p className="text-4xl opacity-20">📋</p>
          <p className="text-slate-500 text-sm">Aucune entrée d'historique ne correspond.</p>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="text-xs text-sky-500 hover:text-sky-400 transition-colors">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1" style={{ background:"rgba(255,255,255,0.05)" }} />
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{ background:"rgba(255,255,255,0.05)", color:"#475569", border:"1px solid rgba(255,255,255,0.07)" }}>
                  {group.date}
                </span>
                <div className="h-px flex-1" style={{ background:"rgba(255,255,255,0.05)" }} />
              </div>

              {/* Entries */}
              <div className="space-y-1">
                {group.items.map((entry, i) => (
                  <TimelineRow
                    key={entry.id}
                    entry={entry}
                    isLast={i === group.items.length - 1 && group === grouped[grouped.length - 1]}
                    onSelect={setSelectedEntry}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-600">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total.toLocaleString("fr-FR")} entrées
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
              style={{ background:"rgba(255,255,255,0.05)" }}>
              «
            </button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>

            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7)          { p = i + 1; }
              else if (page <= 4)           { p = i + 1; if (p > 5) p = p === 6 ? totalPages - 1 : totalPages; }
              else if (page >= totalPages - 3) { p = totalPages - 6 + i; }
              else { p = [1, page - 2, page - 1, page, page + 1, page + 2, totalPages][i]; }
              return (
                <button key={`${p}-${i}`} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background:page===p?"rgba(14,165,233,0.2)":"transparent", color:page===p?"#38bdf8":"#475569" }}>
                  {p}
                </button>
              );
            })}

            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
            <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white disabled:opacity-30 transition-colors"
              style={{ background:"rgba(255,255,255,0.05)" }}>
              »
            </button>
          </div>
        </div>
      )}

      {/* ── Detail panel ── */}
      {selectedEntry && (
        <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}




// /* -------------------------------------------------------------------------- */
// /*                            src/app/Historique/page.tsx                     */
// /* -------------------------------------------------------------------------- */
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import {
//   Search,
//   RefreshCcw,
//   Filter,
//   Clock3,
//   User,
//   FileText,
//   ShieldCheck,
// } from "lucide-react";

// type Historique = {
//   id: string;
//   userId: string;
//   entiteId?: string | null;
//   action: string;
//   entite: string;
//   ancienneValeur?: string | null;
//   nouvelleValeur?: string | null;
//   date: string;
//   user: {
//     id: string;
//     nom: string;
//     prenom: string;
//     email: string;
//     role: "ADMIN" | "USER";
//   };
// };

// export default function HistoriquePage() {
//   const [historiques, setHistoriques] = useState<Historique[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [search, setSearch] = useState("");
//   const [actionFilter, setActionFilter] = useState("all");
//   const [entityFilter, setEntityFilter] = useState("all");

//   const fetchHistoriques = async () => {
//     try {
//       setLoading(true);

//       const res = await fetch("/api/historiques");

//       if (!res.ok) {
//         throw new Error("Erreur chargement historique");
//       }

//       const data = await res.json();
//       setHistoriques(data);
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchHistoriques();
//   }, []);

//   const filteredHistoriques = useMemo(() => {
//     return historiques.filter((item) => {
//       const fullText = `
//         ${item.action}
//         ${item.entite}
//         ${item.user.nom}
//         ${item.user.prenom}
//         ${item.user.email}
//       `.toLowerCase();

//       const matchesSearch = fullText.includes(search.toLowerCase());

//       const matchesAction =
//         actionFilter === "all" || item.action === actionFilter;

//       const matchesEntity =
//         entityFilter === "all" || item.entite === entityFilter;

//       return matchesSearch && matchesAction && matchesEntity;
//     });
//   }, [historiques, search, actionFilter, entityFilter]);

//   const actions = [...new Set(historiques.map((h) => h.action))];
//   const entities = [...new Set(historiques.map((h) => h.entite))];

//   return (
//     <div className="min-h-screen bg-[#09111f] text-white p-6">
//       {/* HEADER */}
//       <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">
//             Historique des activités
//           </h1>

//           <p className="text-gray-400 mt-2">
//             Consultez toutes les actions effectuées sur la plateforme.
//           </p>
//         </div>

//         <button
//           onClick={fetchHistoriques}
//           className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 transition px-4 py-3 rounded-xl font-medium"
//         >
//           <RefreshCcw size={18} />
//           Actualiser
//         </button>
//       </div>

//       {/* STATS */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
//         <CardStat
//           title="Total Historiques"
//           value={historiques.length}
//           icon={<Clock3 size={22} />}
//         />

//         <CardStat
//           title="Actions"
//           value={actions.length}
//           icon={<ShieldCheck size={22} />}
//         />

//         <CardStat
//           title="Entités"
//           value={entities.length}
//           icon={<FileText size={22} />}
//         />
//       </div>

//       {/* FILTERS */}
//       <div className="bg-[#111c2d] border border-white/5 rounded-3xl p-5 mb-6">
//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
//           {/* SEARCH */}
//           <div className="relative">
//             <Search
//               className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
//               size={18}
//             />

//             <input
//               type="text"
//               placeholder="Recherche..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full bg-[#09111f] border border-white/5 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-cyan-500"
//             />
//           </div>

//           {/* ACTION FILTER */}
//           <select
//             value={actionFilter}
//             onChange={(e) => setActionFilter(e.target.value)}
//             className="bg-[#09111f] border border-white/5 rounded-xl px-4 py-3 outline-none"
//           >
//             <option value="all">Toutes les actions</option>

//             {actions.map((action) => (
//               <option key={action} value={action}>
//                 {action}
//               </option>
//             ))}
//           </select>

//           {/* ENTITY FILTER */}
//           <select
//             value={entityFilter}
//             onChange={(e) => setEntityFilter(e.target.value)}
//             className="bg-[#09111f] border border-white/5 rounded-xl px-4 py-3 outline-none"
//           >
//             <option value="all">Toutes les entités</option>

//             {entities.map((entity) => (
//               <option key={entity} value={entity}>
//                 {entity}
//               </option>
//             ))}
//           </select>

//           {/* TOTAL */}
//           <div className="flex items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold">
//             {filteredHistoriques.length} résultat(s)
//           </div>
//         </div>
//       </div>

//       {/* TABLE */}
//       <div className="bg-[#111c2d] border border-white/5 rounded-3xl overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full min-w-[1100px]">
//             <thead className="bg-[#0c1626] border-b border-white/5">
//               <tr className="text-left text-sm text-gray-400">
//                 <th className="px-6 py-4">Utilisateur</th>
//                 <th className="px-6 py-4">Action</th>
//                 <th className="px-6 py-4">Entité</th>
//                 <th className="px-6 py-4">Ancienne Valeur</th>
//                 <th className="px-6 py-4">Nouvelle Valeur</th>
//                 <th className="px-6 py-4">Date</th>
//               </tr>
//             </thead>

//             <tbody>
//               {loading ? (
//                 [...Array(8)].map((_, i) => (
//                   <tr
//                     key={i}
//                     className="border-b border-white/5 animate-pulse"
//                   >
//                     <td className="px-6 py-5">
//                       <div className="h-5 w-40 bg-white/10 rounded" />
//                     </td>

//                     <td className="px-6 py-5">
//                       <div className="h-5 w-24 bg-white/10 rounded" />
//                     </td>

//                     <td className="px-6 py-5">
//                       <div className="h-5 w-24 bg-white/10 rounded" />
//                     </td>

//                     <td className="px-6 py-5">
//                       <div className="h-5 w-40 bg-white/10 rounded" />
//                     </td>

//                     <td className="px-6 py-5">
//                       <div className="h-5 w-40 bg-white/10 rounded" />
//                     </td>

//                     <td className="px-6 py-5">
//                       <div className="h-5 w-32 bg-white/10 rounded" />
//                     </td>
//                   </tr>
//                 ))
//               ) : filteredHistoriques.length === 0 ? (
//                 <tr>
//                   <td
//                     colSpan={6}
//                     className="text-center py-16 text-gray-400"
//                   >
//                     Aucun historique trouvé.
//                   </td>
//                 </tr>
//               ) : (
//                 filteredHistoriques.map((item) => (
//                   <tr
//                     key={item.id}
//                     className="border-b border-white/5 hover:bg-white/[0.02] transition"
//                   >
//                     {/* USER */}
//                     <td className="px-6 py-5">
//                       <div className="flex items-center gap-3">
//                         <div className="h-11 w-11 rounded-full bg-cyan-500/20 flex items-center justify-center">
//                           <User size={18} className="text-cyan-400" />
//                         </div>

//                         <div>
//                           <p className="font-semibold">
//                             {item.user.nom} {item.user.prenom}
//                           </p>

//                           <p className="text-sm text-gray-400">
//                             {item.user.email}
//                           </p>
//                         </div>
//                       </div>
//                     </td>

//                     {/* ACTION */}
//                     <td className="px-6 py-5">
//                       <span
//                         className={`px-3 py-1 rounded-full text-xs font-semibold border ${getActionStyle(
//                           item.action
//                         )}`}
//                       >
//                         {item.action}
//                       </span>
//                     </td>

//                     {/* ENTITY */}
//                     <td className="px-6 py-5">
//                       <span className="bg-white/5 border border-white/5 px-3 py-1 rounded-full text-sm">
//                         {item.entite}
//                       </span>
//                     </td>

//                     {/* OLD */}
//                     <td className="px-6 py-5 max-w-[250px]">
//                       <div className="truncate text-sm text-gray-300">
//                         {item.ancienneValeur || "-"}
//                       </div>
//                     </td>

//                     {/* NEW */}
//                     <td className="px-6 py-5 max-w-[250px]">
//                       <div className="truncate text-sm text-cyan-300">
//                         {item.nouvelleValeur || "-"}
//                       </div>
//                     </td>

//                     {/* DATE */}
//                     <td className="px-6 py-5 text-sm text-gray-400">
//                       {new Date(item.date).toLocaleString("fr-FR")}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* -------------------------------------------------------------------------- */
// /*                                   STATS                                    */
// /* -------------------------------------------------------------------------- */

// function CardStat({
//   title,
//   value,
//   icon,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
// }) {
//   return (
//     <div className="bg-[#111c2d] border border-white/5 rounded-3xl p-5">
//       <div className="flex items-center justify-between">
//         <div>
//           <p className="text-gray-400 text-sm">{title}</p>

//           <h2 className="text-3xl font-bold mt-2">{value}</h2>
//         </div>

//         <div className="h-14 w-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// /* -------------------------------------------------------------------------- */
// /*                              ACTION COLORS                                 */
// /* -------------------------------------------------------------------------- */

// function getActionStyle(action: string) {
//   const value = action.toLowerCase();

//   if (value.includes("create") || value.includes("ajout")) {
//     return "bg-green-500/10 text-green-400 border-green-500/20";
//   }

//   if (value.includes("update") || value.includes("modif")) {
//     return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
//   }

//   if (value.includes("delete") || value.includes("supp")) {
//     return "bg-red-500/10 text-red-400 border-red-500/20";
//   }

//   return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
// }






// "use client";

// export default function Historique() {
//   return (
//     <div className="min-h-screen flex items-center justify-center" style={{ background: "#070d16" }}>
//       <div className="text-center space-y-3">
//         <div className="text-5xl">🕐</div>
//         <h1 className="text-white text-2xl font-bold">Historique des opérations</h1>
//         <p className="text-slate-500 text-sm">Page en cours de développement</p>
//       </div>
//     </div>
//   );
// }