"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatutMaint = "en_cours" | "termine" | "planifie" | "annule" | "en_attente";
type ViewMode = "table" | "grid";
type FormMode = "create" | "edit" | null;

interface BienLight {
  id: string;
  codeInventaire: string;
  nom: string;
  categorie: string | null;
  etat: string | null;
  localisation: string | null;
  departement: { id: string; nom: string } | null;
}

interface FournisseurLight {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  type: string | null;
}

interface Maintenance {
  id: string;
  bienId: string;
  fournisseurId: string | null;
  technicienId: string | null;
  type: string | null;
  description: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  cout: number | null;
  statut: StatutMaint;
  prochaineMaintenance: string | null;
  createdAt: string;
  bien: BienLight;
  fournisseur: FournisseurLight | null;
}

interface FormData {
  bienId: string;
  fournisseurId: string;
  technicienId: string;
  type: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  cout: string;
  statut: StatutMaint;
  prochaineMaintenance: string;
}

interface ApiResponse {
  data: Maintenance[];
  total: number;
  page: number;
  pages: number;
  coutTotal: number;
  stats: { statut: string; count: number; cout: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUT_MAP: Record<StatutMaint, { label: string; bg: string; text: string; dot: string; border: string }> = {
  en_cours: { label: "En cours", bg: "rgba(14,165,233,0.12)", text: "#38bdf8", dot: "#0ea5e9", border: "rgba(14,165,233,0.25)" },
  planifie: { label: "Planifiée", bg: "rgba(245,158,11,0.12)", text: "#fbbf24", dot: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  en_attente: { label: "En attente", bg: "rgba(139,92,246,0.12)", text: "#a78bfa", dot: "#8b5cf6", border: "rgba(139,92,246,0.25)" },
  termine: { label: "Terminée", bg: "rgba(16,185,129,0.12)", text: "#10b981", dot: "#10b981", border: "rgba(16,185,129,0.25)" },
  annule: { label: "Annulée", bg: "rgba(239,68,68,0.12)", text: "#f87171", dot: "#ef4444", border: "rgba(239,68,68,0.25)" },
};

const TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  preventive: { label: "Préventive", icon: "🛡️", color: "#38bdf8" },
  corrective: { label: "Corrective", icon: "🔧", color: "#f97316" },
  evolutive: { label: "Évolutive", icon: "⬆️", color: "#8b5cf6" },
  inspection: { label: "Inspection", icon: "🔍", color: "#fbbf24" },
};

const CAT_ICONS: Record<string, string> = {
  Informatique: "💻", Mobilier: "🪑", Véhicule: "🚗", Équipement: "⚙️",
  Électroménager: "🔌", Télécommunication: "📡", Immobilier: "🏢", Autre: "📦",
};

const EMPTY_FORM: FormData = {
  bienId: "", fournisseurId: "", technicienId: "", type: "preventive",
  description: "", dateDebut: new Date().toISOString().split("T")[0],
  dateFin: "", cout: "", statut: "planifie", prochaineMaintenance: "",
};

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function daysBetween(from: string | null, to?: string | null): number {
  if (!from) return 0;
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function isOverdue(m: Maintenance): boolean {
  return m.statut === "en_cours" && !!m.dateFin && new Date(m.dateFin) < new Date();
}

function durationLabel(m: Maintenance): string {
  const days = daysBetween(m.dateDebut, m.dateFin || undefined);
  if (days === 0) return "< 1j";
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.round(days / 7)}sem`;
  return `${Math.round(days / 30)}mois`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Edit: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  ChevDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Refresh: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  Table: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="9" x2="9" y2="21" /></svg>,
  Grid: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  Info: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  Wrench: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
  Warning: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Export: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Calendar: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  Money: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  PrevPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>,
  NextPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>,
  SortA: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  SortD: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Sort: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Spinner: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>,
};

// ─── StatutBadge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut, onChange }: { statut: StatutMaint; onChange?: (s: StatutMaint) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s = STATUT_MAP[statut];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!onChange) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
      style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />{s.label}
    </span>
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:opacity-80"
        style={{ background: s.bg, color: s.text }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />{s.label}<Ico.ChevDown />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 rounded-xl overflow-hidden"
          style={{ background: "#0a1219", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", minWidth: 148, top: "100%" }}>
          {(Object.entries(STATUT_MAP) as [StatutMaint, typeof STATUT_MAP[StatutMaint]][]).map(([k, v]) => (
            <button key={k} onClick={e => { e.stopPropagation(); onChange(k); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-white/5"
              style={{ color: k === statut ? v.text : "#94a3b8" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: v.dot }} />{v.label}
              {k === statut && <span className="ml-auto"><Ico.Check /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ stats, coutTotal, filterStatut, setFilterStatut, loading }: {
  stats: { statut: string; count: number; cout: number }[];
  coutTotal: number;
  filterStatut: "all" | StatutMaint;
  setFilterStatut: (s: "all" | StatutMaint) => void;
  loading: boolean;
}) {
  const getCount = (s: string) => stats.find(x => x.statut === s)?.count ?? 0;

  const cards = [
    { key: "all" as const, label: "Total", value: stats.reduce((a, s) => a + s.count, 0), sub: fmt(coutTotal), accent: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
    { key: "en_cours" as const, label: "En cours", value: getCount("en_cours"), sub: "Actives", accent: "#38bdf8", bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.2)" },
    { key: "planifie" as const, label: "Planifiées", value: getCount("planifie"), sub: "À venir", accent: "#fbbf24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
    { key: "termine" as const, label: "Terminées", value: getCount("termine"), sub: "Clôturées", accent: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
    { key: "annule" as const, label: "Annulées", value: getCount("annule"), sub: "Sans suite", accent: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map(c => (
        <button key={c.key}
          onClick={() => setFilterStatut(filterStatut === c.key ? "all" : c.key)}
          disabled={loading}
          className="rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-default"
          style={{
            background: filterStatut === c.key ? c.bg : "#0f1824",
            border: filterStatut === c.key ? `1.5px solid ${c.border}` : "1px solid rgba(255,255,255,0.06)",
            boxShadow: filterStatut === c.key ? `0 0 24px ${c.bg}` : "none",
          }}>
          <p className="text-[26px] font-bold leading-none" style={{ color: filterStatut === c.key ? c.accent : "#fff" }}>{loading ? "—" : c.value}</p>
          <p className="text-[11px] font-semibold mt-1" style={{ color: filterStatut === c.key ? c.accent : "#475569" }}>{c.label}</p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: filterStatut === c.key ? c.accent + "80" : "#334155" }}>{loading ? "…" : c.sub}</p>
          {filterStatut === c.key && <div className="mt-2 h-0.5 rounded-full" style={{ background: c.accent }} />}
        </button>
      ))}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ m, onClose, onEdit }: { m: Maintenance; onClose: () => void; onEdit: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const overdue = isOverdue(m);
  const tm = m.type ? (TYPE_MAP[m.type] ?? { label: m.type, icon: "🔧", color: "#94a3b8" }) : null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 440, background: "#0a1120", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                {CAT_ICONS[m.bien.categorie || ""] ?? "🔧"}
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-600">{m.bien.codeInventaire}</p>
                <p className="text-sm font-bold text-white leading-snug">{m.bien.nom}</p>
                <p className="text-[11px] text-slate-500">{m.bien.departement?.nom || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Ico.Edit /> Modifier
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatutBadge statut={m.statut} />
            {tm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: tm.color }}>
                {tm.icon} {tm.label}
              </span>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                <Ico.Warning /> En retard
              </span>
            )}
          </div>
        </div>

        {/* Cost + duration strip */}
        <div className="grid grid-cols-2 mx-5 my-4 rounded-xl overflow-hidden shrink-0"
          style={{ border: "1px solid rgba(14,165,233,0.2)" }}>
          <div className="px-4 py-3 text-center" style={{ background: "rgba(14,165,233,0.07)" }}>
            <p className="text-[10px] uppercase tracking-wider text-sky-600 font-semibold">Coût</p>
            <p className="text-lg font-bold text-white mt-0.5">{m.cout ? fmt(m.cout) : "—"}</p>
          </div>
          <div className="px-4 py-3 text-center" style={{ background: "rgba(14,165,233,0.04)", borderLeft: "1px solid rgba(14,165,233,0.2)" }}>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Durée</p>
            <p className="text-lg font-bold text-white mt-0.5">{durationLabel(m)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          {/* Dates */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Planning</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                ["Début", fmtDate(m.dateDebut)],
                ["Fin prévue", fmtDate(m.dateFin)],
                ["Prochaine maint.", fmtDate(m.prochaineMaintenance)],
                ["Créé le", fmtDate(m.createdAt)],
              ].map(([k, v], i) => (
                <div key={k} className="flex justify-between px-4 py-2.5"
                  style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <span className="text-[11px] text-slate-600">{k}</span>
                  <span className="text-[11px] text-slate-300 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fournisseur */}
          {m.fournisseur && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Fournisseur</p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                    🏭
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.fournisseur.nom}</p>
                    {m.fournisseur.type && <p className="text-[10px] text-slate-600">{m.fournisseur.type}</p>}
                  </div>
                </div>
                {[
                  ["Email", m.fournisseur.email || "—"],
                  ["Téléphone", m.fournisseur.telephone || "—"],
                ].map(([k, v], i) => (
                  <div key={k} className="flex justify-between px-4 py-2.5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <span className="text-[11px] text-slate-600">{k}</span>
                    <span className="text-[11px] text-slate-300 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {m.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Description</p>
              <div className="rounded-xl px-4 py-3 text-[12px] text-slate-400 leading-relaxed"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {m.description}
              </div>
            </div>
          )}

          {/* Bien localisation */}
          {m.bien.localisation && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-slate-600 shrink-0">📍</span>
              <p className="text-[12px] text-slate-400">{m.bien.localisation}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] text-slate-700"><kbd className="text-slate-500 font-mono">Echap</kbd> pour fermer</span>
        </div>
      </div>
    </>
  );
}

// ─── Form Drawer ──────────────────────────────────────────────────────────────

const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-150 bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}{required && <span className="text-sky-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function MaintDrawer({ mode, initial, biens, fournisseurs, onClose, onSave, saving }: {
  mode: "create" | "edit";
  initial: FormData;
  biens: BienLight[];
  fournisseurs: FournisseurLight[];
  onClose: () => void;
  onSave: (data: FormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [bienSearch, setBienSearch] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const filteredBiens = useMemo(() =>
    biens.filter(b => !bienSearch || b.nom.toLowerCase().includes(bienSearch.toLowerCase()) || b.codeInventaire.toLowerCase().includes(bienSearch.toLowerCase())),
    [biens, bienSearch]
  );

  const selectedBien = biens.find(b => b.id === form.bienId);
  const selectedFourn = fournisseurs.find(f => f.id === form.fournisseurId);
  const valid = form.bienId !== "";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width: 540, background: "linear-gradient(180deg,#0f1824 0%,#0a1120 100%)", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-24px 0 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: mode === "create" ? "rgba(249,115,22,0.15)" : "rgba(139,92,246,0.15)" }}>
              <span style={{ fontSize: 16 }}>{mode === "create" ? "🔧" : "✏️"}</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">{mode === "create" ? "Nouvelle maintenance" : "Modifier la maintenance"}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{mode === "create" ? "Planifier ou enregistrer" : "Mise à jour des informations"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
        </div>

        {/* Steps */}
        <div className="flex px-6 pt-4 gap-1 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {([1, 2] as const).map(s => (
            <button key={s} onClick={() => setStep(s)}
              className="flex items-center gap-2 px-4 pb-3 text-xs font-semibold transition-all relative"
              style={{ color: step === s ? "#f97316" : "#475569" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: step === s ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.05)", color: step === s ? "#f97316" : "#475569" }}>
                {s}
              </span>
              {s === 1 ? "Bien & Type" : "Planification"}
              {step === s && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "linear-gradient(to right,#f97316,#fb923c)" }} />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-5">
              {/* Bien picker */}
              <Field label="Bien concerné" required>
                {mode === "edit" && selectedBien ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-xl">{CAT_ICONS[selectedBien.categorie || ""] ?? "📦"}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedBien.nom}</p>
                      <p className="text-[10px] font-mono text-slate-500">{selectedBien.codeInventaire}</p>
                    </div>
                    <span className="ml-auto text-[10px] text-slate-600">{selectedBien.departement?.nom || "—"}</span>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Search /></span>
                      <input className={iBase + " pl-9"} placeholder="Rechercher un bien…"
                        value={bienSearch} onChange={e => setBienSearch(e.target.value)} />
                    </div>
                    <div className="rounded-xl overflow-hidden max-h-52 overflow-y-auto"
                      style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                      {filteredBiens.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-600">Aucun bien trouvé</div>
                      ) : filteredBiens.map(b => (
                        <button key={b.id} onClick={() => set("bienId", b.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                          style={{ background: form.bienId === b.id ? "rgba(249,115,22,0.08)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-lg shrink-0">{CAT_ICONS[b.categorie || ""] ?? "📦"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{b.nom}</p>
                            <p className="text-[10px] text-slate-500">{b.codeInventaire} · {b.departement?.nom || "—"}</p>
                          </div>
                          {b.etat && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                              style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>{b.etat}</span>
                          )}
                          {form.bienId === b.id && <span className="text-orange-400 shrink-0"><Ico.Check /></span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </Field>

              {/* Type + Statut */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type de maintenance">
                  <select className={iBase + " appearance-none cursor-pointer"} value={form.type} onChange={e => set("type", e.target.value)}>
                    {Object.entries(TYPE_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                    <option value="">Autre</option>
                  </select>
                </Field>
                <Field label="Statut">
                  <select className={iBase + " appearance-none cursor-pointer"} value={form.statut} onChange={e => set("statut", e.target.value as StatutMaint)}>
                    {Object.entries(STATUT_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Fournisseur */}
              <Field label="Fournisseur / Prestataire">
                <select className={iBase + " appearance-none cursor-pointer"} value={form.fournisseurId} onChange={e => set("fournisseurId", e.target.value)}>
                  <option value="">— Aucun fournisseur —</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}{f.type ? ` (${f.type})` : ""}</option>)}
                </select>
              </Field>

              <Field label="Description">
                <textarea className={iBase + " resize-none"} rows={3} placeholder="Détails de la maintenance, symptômes, travaux à effectuer…"
                  value={form.description} onChange={e => set("description", e.target.value)} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de début">
                  <input type="date" className={iBase} style={{ colorScheme: "dark" }} value={form.dateDebut} onChange={e => set("dateDebut", e.target.value)} />
                </Field>
                <Field label="Date de fin prévue">
                  <input type="date" className={iBase} style={{ colorScheme: "dark" }} value={form.dateFin} onChange={e => set("dateFin", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Coût estimé (FCFA)">
                  <input type="number" min="0" className={iBase} placeholder="ex. 150000" value={form.cout} onChange={e => set("cout", e.target.value)} />
                </Field>
                <Field label="Prochaine maintenance">
                  <input type="date" className={iBase} style={{ colorScheme: "dark" }} value={form.prochaineMaintenance} onChange={e => set("prochaineMaintenance", e.target.value)} />
                </Field>
              </div>

              {/* Récap */}
              {form.bienId && selectedBien && (
                <div className="rounded-xl p-4" style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)" }}>
                  <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-3">Récapitulatif</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      ["Bien", selectedBien.nom],
                      ["Type", form.type ? (TYPE_MAP[form.type]?.label || form.type) : "—"],
                      ["Statut", STATUT_MAP[form.statut].label],
                      ["Fournisseur", selectedFourn?.nom || "—"],
                      ["Début", form.dateDebut ? fmtDate(form.dateDebut) : "—"],
                      ["Coût", form.cout ? fmt(+form.cout) : "—"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] text-slate-600">{k}</p>
                        <p className="text-[12px] text-slate-300 font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 gap-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">Annuler</button>
          <div className="flex items-center gap-2">
            {step === 2 && <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.05)" }}>← Retour</button>}
            {step === 1 ? (
              <button onClick={() => setStep(2)} disabled={!form.bienId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#ea580c,#c2410c)" }}>
                Suivant →
              </button>
            ) : (
              <button onClick={() => valid && onSave(form)} disabled={!valid || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#ea580c,#c2410c)" }}>
                {saving ? <Ico.Spinner /> : <Ico.Check />}
                {mode === "create" ? "Enregistrer" : "Sauvegarder"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ m, onClose, onConfirm, loading }: { m: Maintenance; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={loading ? undefined : onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "#0f1824", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}><Ico.Trash /></div>
          <div>
            <h3 className="text-sm font-bold text-white">Supprimer cette maintenance ?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{m.bien.nom} — {STATUT_MAP[m.statut].label}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">Cette action est <span className="text-red-400 font-semibold">irréversible</span>. Si la maintenance était en cours, le bien repassera automatiquement en <strong className="text-white">actif</strong>.</p>
        <div className="flex gap-3 pt-1">
          <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 transition-all" style={{ background: "rgba(255,255,255,0.05)" }}>Annuler</button>
          <button disabled={loading} onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
            {loading ? <><Ico.Spinner />Suppression…</> : "Supprimer"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div className="rounded-lg" style={{ height: 12, width: j === 1 ? "70%" : "50%", background: "rgba(255,255,255,0.04)", animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [coutTotal, setCoutTotal] = useState(0);
  const [apiStats, setApiStats] = useState<{ statut: string; count: number; cout: number }[]>([]);
  const [biens, setBiens] = useState<BienLight[]>([]);
  const [fournisseurs, setFournisseurs] = useState<FournisseurLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"all" | StatutMaint>("all");
  const [filterType, setFilterType] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editTarget, setEditTarget] = useState<Maintenance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Maintenance | null>(null);
  const [detailM, setDetailM] = useState<Maintenance | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ✅ CORRECTION : type | null avec valeur initiale null
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch maintenances ────────────────────────────────────────────────────
  const fetchMain = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (filterStatut !== "all") params.set("statut", filterStatut);
      if (filterType) params.set("type", filterType);
      if (search) params.set("search", search);

      const res = await fetch(`/api/maintenances?${params}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const json: ApiResponse = await res.json();
      setMaintenances(json.data);
      setTotal(json.total);
      setTotalPages(json.pages);
      setCoutTotal(json.coutTotal);
      setApiStats(json.stats);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  }, [page, filterStatut, filterType, search, showToast]);

  // ── Fetch biens + fournisseurs ────────────────────────────────────────────
  const fetchLists = useCallback(async () => {
    try {
      const [biensRes, foRes] = await Promise.all([
        fetch("/api/biens"),
        fetch("/api/fournisseurs"),
      ]);
      if (biensRes.ok) {
        const data = await biensRes.json();
        setBiens(Array.isArray(data) ? data : []);
      }
      if (foRes.ok) {
        const data = await foRes.json();
        setFournisseurs(Array.isArray(data) ? data : []);
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setPage(1); fetchMain(1); }, 300);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [search, filterStatut, filterType]);

  useEffect(() => { fetchMain(page); }, [page]);
  useEffect(() => { fetchLists(); }, [fetchLists]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailM) { setDetailM(null); return; }
        if (formMode) { setFormMode(null); setEditTarget(null); return; }
        if (deleteTarget) { setDeleteTarget(null); return; }
      }
      if (e.key === "n" && !formMode && !deleteTarget && !detailM) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") setFormMode("create");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [detailM, formMode, deleteTarget]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        bienId: data.bienId,
        fournisseurId: data.fournisseurId || null,
        technicienId: data.technicienId || null,
        type: data.type || null,
        description: data.description || null,
        dateDebut: data.dateDebut || null,
        dateFin: data.dateFin || null,
        cout: data.cout ? parseFloat(data.cout) : null,
        statut: data.statut,
        prochaineMaintenance: data.prochaineMaintenance || null,
      };

      if (formMode === "create") {
        const res = await fetch("/api/maintenances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur serveur"); }
        showToast("Maintenance créée avec succès.");
      } else if (editTarget) {
        const res = await fetch(`/api/maintenances/${editTarget.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur serveur"); }
        showToast("Maintenance mise à jour.");
      }
      setFormMode(null); setEditTarget(null);
      await fetchMain(1); setPage(1);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/maintenances/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur"); }
      showToast(`Maintenance supprimée.`, "error");
      setDeleteTarget(null);
      if (detailM?.id === deleteTarget.id) setDetailM(null);
      await fetchMain(1); setPage(1);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setDeleting(false); }
  };

  const handleStatusChange = async (m: Maintenance, newStatut: StatutMaint) => {
    setStatusLoading(m.id);
    setMaintenances(p => p.map(x => x.id === m.id ? { ...x, statut: newStatut } : x));
    if (detailM?.id === m.id) setDetailM(prev => prev ? { ...prev, statut: newStatut } : null);
    try {
      const res = await fetch(`/api/maintenances/${m.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) throw new Error();
      showToast(`Statut → ${STATUT_MAP[newStatut].label}`);
      await fetchMain(page);
    } catch {
      await fetchMain(page);
      showToast("Erreur lors du changement de statut.", "error");
    } finally { setStatusLoading(null); }
  };

  const openEdit = (m: Maintenance) => {
    setEditTarget(m); setFormMode("edit"); setDetailM(null);
  };

  const formInitial: FormData = editTarget ? {
    bienId: editTarget.bienId,
    fournisseurId: editTarget.fournisseurId || "",
    technicienId: editTarget.technicienId || "",
    type: editTarget.type || "preventive",
    description: editTarget.description || "",
    dateDebut: editTarget.dateDebut ? editTarget.dateDebut.split("T")[0] : "",
    dateFin: editTarget.dateFin ? editTarget.dateFin.split("T")[0] : "",
    cout: editTarget.cout != null ? String(editTarget.cout) : "",
    statut: editTarget.statut,
    prochaineMaintenance: editTarget.prochaineMaintenance ? editTarget.prochaineMaintenance.split("T")[0] : "",
  } : EMPTY_FORM;

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["ID", "Bien", "Code", "Département", "Type", "Statut", "Début", "Fin", "Coût (FCFA)", "Fournisseur", "Description"];
    const rows = maintenances.map(m => [
      m.id, m.bien.nom, m.bien.codeInventaire, m.bien.departement?.nom || "",
      m.type || "", STATUT_MAP[m.statut].label,
      m.dateDebut?.split("T")[0] || "", m.dateFin?.split("T")[0] || "",
      m.cout || "", m.fournisseur?.nom || "", `"${(m.description || "").replace(/"/g, "'")}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "maintenances.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`${maintenances.length} maintenances exportées.`);
  };

  const overdueCount = maintenances.filter(isOverdue).length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full px-7 py-6 space-y-5" style={{ fontFamily: "'DM Sans','Inter',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white"
          style={{ background: toast.type === "error" ? "#1a0a0a" : "#0f2d1f", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`, boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
          <span style={{ color: toast.type === "error" ? "#f87171" : "#10b981" }}>{toast.type === "error" ? "✕" : "✓"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Gestion du parc</p>
          <h2 className="text-2xl font-bold text-white leading-none">Maintenances</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner /> Chargement…</span>
            ) : (
              <>
                {total} maintenance{total > 1 ? "s" : ""} ·{" "}
                <span className="text-orange-400 font-semibold">{fmt(coutTotal)}</span> coût total
                {overdueCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                    <Ico.Warning /> {overdueCount} en retard
                  </span>
                )}
                <span className="text-slate-700 mx-2">·</span>
                <span className="text-slate-600 text-[11px]">
                  <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">N</kbd> nouveau ·{" "}
                  <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">Echap</kbd> fermer
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchMain(page)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <Ico.Refresh />
          </button>
          <button onClick={handleExport} disabled={loading || maintenances.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Ico.Export /> CSV
          </button>
          <button onClick={() => setFormMode("create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#ea580c,#c2410c)", boxShadow: "0 4px 16px rgba(234,88,12,0.35)" }}>
            <Ico.Plus /> Nouvelle maintenance
          </button>
        </div>
      </div>

      {/* ── Stat Bar ── */}
      <StatBar stats={apiStats} coutTotal={coutTotal} filterStatut={filterStatut} setFilterStatut={setFilterStatut} loading={loading} />

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3"
        style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth: 300 }}>
          <span className="text-slate-600 shrink-0"><Ico.Search /></span>
          <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Bien, fournisseur, description…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white"><Ico.Close /></button>}
        </div>
        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.07)" }} />
        <select className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <div className="flex-1" />
        {!loading && <span className="text-[11px] text-slate-600 font-medium">{total} résultat{total > 1 ? "s" : ""}</span>}
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["table", "grid"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)} className="p-1.5 rounded-md transition-all"
              style={{ background: viewMode === m ? "rgba(249,115,22,0.2)" : "transparent", color: viewMode === m ? "#f97316" : "#475569" }}>
              {m === "table" ? <Ico.Table /> : <Ico.Grid />}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ background: "#0f1824" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Bien", "Type", "Statut", "Dates", "Durée", "Coût", "Fournisseur", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows /> : maintenances.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-600">Aucune maintenance ne correspond.</td></tr>
                ) : maintenances.map((m, i) => {
                  const overdue = isOverdue(m);
                  const tm = m.type ? (TYPE_MAP[m.type] ?? null) : null;
                  return (
                    <tr key={m.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: overdue ? "rgba(239,68,68,0.03)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                      className="group hover:bg-white/[0.025] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl shrink-0">{CAT_ICONS[m.bien.categorie || ""] ?? "🔧"}</span>
                          <div>
                            <p className="text-sm font-medium text-white leading-none">{m.bien.nom}</p>
                            <p className="text-[10px] font-mono text-slate-600 mt-0.5">{m.bien.codeInventaire}</p>
                            <p className="text-[10px] text-slate-600">{m.bien.departement?.nom || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tm ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                            style={{ background: "rgba(255,255,255,0.06)", color: tm.color }}>
                            {tm.icon} {tm.label}
                          </span>
                        ) : <span className="text-xs text-slate-600">{m.type || "—"}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatutBadge statut={m.statut} onChange={s => handleStatusChange(m, s)} />
                          {overdue && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold" style={{ color: "#f87171" }}>
                              <Ico.Warning /> En retard
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-400"><Ico.Calendar /> {fmtDate(m.dateDebut)}</p>
                        {m.dateFin && <p className="text-[10px] text-slate-600 mt-0.5">→ {fmtDate(m.dateFin)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 font-medium">{durationLabel(m)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold" style={{ color: m.cout ?? "#fff" ? "#f97316" : "#475569" }}>
                          {m.cout ? fmt(m.cout) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400 truncate max-w-[120px] block">{m.fournisseur?.nom || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDetailM(m)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
                          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                          <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "#0c1520" }}>
            <span className="text-[11px] text-slate-600">
              {loading ? "Chargement…" : total === 0 ? "Aucun résultat" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ background: page === p ? "rgba(249,115,22,0.2)" : "transparent", color: page === p ? "#f97316" : "#475569" }}>{p}</button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
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
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {[90, 70, 50].map((w, j) => <div key={j} className="rounded-lg" style={{ height: 12, width: `${w}%`, background: "rgba(255,255,255,0.04)" }} />)}
                </div>
              ))}
            </div>
          ) : maintenances.length === 0 ? (
            <div className="py-20 text-center text-slate-600 text-sm">Aucune maintenance ne correspond.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {maintenances.map(m => {
                const overdue = isOverdue(m);
                const tm = m.type ? (TYPE_MAP[m.type] ?? null) : null;
                return (
                  <div key={m.id}
                    className="group rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                    style={{ background: "#0f1824", border: `1px solid ${overdue ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}` }}
                    onClick={() => setDetailM(m)}>
                    {/* Top */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                          {CAT_ICONS[m.bien.categorie || ""] ?? "🔧"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-snug line-clamp-1">{m.bien.nom}</p>
                          <p className="text-[10px] font-mono text-slate-600">{m.bien.codeInventaire}</p>
                        </div>
                      </div>
                      <StatutBadge statut={m.statut} onChange={s => { handleStatusChange(m, s); }} />
                    </div>

                    {/* Type + overdue */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {tm && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                          style={{ background: "rgba(255,255,255,0.06)", color: tm.color }}>
                          {tm.icon} {tm.label}
                        </span>
                      )}
                      {overdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                          <Ico.Warning /> Retard
                        </span>
                      )}
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1.5">
                      {[
                        ["Département", m.bien.departement?.nom || "—"],
                        ["Début", fmtDate(m.dateDebut)],
                        ["Fin prévue", fmtDate(m.dateFin)],
                        ["Fournisseur", m.fournisseur?.nom || "—"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-[11px] text-slate-600">{k}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-sm font-bold" style={{ color: m.cout ? "#f97316" : "#475569" }}>
                        {m.cout ? fmt(m.cout) : "Coût —"}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                        <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && !loading && (
            <div className="flex justify-center gap-1 pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: page === p ? "rgba(249,115,22,0.2)" : "transparent", color: page === p ? "#f97316" : "#475569" }}>{p}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {formMode && (
        <MaintDrawer mode={formMode} initial={formInitial} biens={biens} fournisseurs={fournisseurs}
          onClose={() => { setFormMode(null); setEditTarget(null); }} onSave={handleSave} saving={saving} />
      )}
      {deleteTarget && <DeleteModal m={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} />}
      {detailM && <DetailPanel m={detailM} onClose={() => setDetailM(null)} onEdit={() => openEdit(detailM)} />}
    </div>
  );
}