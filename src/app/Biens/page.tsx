"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "actif" | "maintenance" | "inactif" | "reforme";
type ViewMode = "table" | "grid";
type FormMode = "create" | "edit" | null;
type SortDir = "asc" | "desc";

interface Departement {
  id: string;
  nom: string;
  description: string | null;
}

interface Bien {
  internalId: string;
  id: string;
  designation: string;
  categorie: string;
  marque: string;
  serial: string;
  departement: string;
  departementId: string;
  responsable: string;
  dateAchat: string;
  valeur: number;
  status: Status;
  localisation: string;
  garantie: string;
  description: string;
}

interface FormData {
  codeInventaire: string;
  designation: string;
  categorie: string;
  marque: string;
  serial: string;
  departementId: string;
  dateAchat: string;
  valeur: string;
  status: Status;
  localisation: string;
  garantie: string;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Informatique", "Mobilier", "Véhicule", "Équipement",
  "Électroménager", "Télécommunication", "Immobilier", "Autre",
];
const PAGE_SIZE = 8;

const STATUS_MAP: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  actif: { label: "Actif", bg: "rgba(16,185,129,0.12)", text: "#10b981", dot: "#10b981" },
  maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)", text: "#f97316", dot: "#f97316" },
  inactif: { label: "Inactif", bg: "rgba(100,116,139,0.15)", text: "#94a3b8", dot: "#64748b" },
  reforme: { label: "Réformé", bg: "rgba(239,68,68,0.12)", text: "#f87171", dot: "#ef4444" },
};

const CAT_ICONS: Record<string, string> = {
  Informatique: "💻", Mobilier: "🪑", Véhicule: "🚗", Équipement: "⚙️",
  Électroménager: "🔌", Télécommunication: "📡", Immobilier: "🏢", Autre: "📦",
};

const EMPTY_FORM: FormData = {
  codeInventaire: "",
  designation: "",
  categorie: "Informatique",
  marque: "",
  serial: "",
  departementId: "",
  dateAchat: "",
  valeur: "",
  status: "actif",
  localisation: "",
  garantie: "",
  description: "",
};

// ─── Mapper API → Bien ────────────────────────────────────────────────────────

function mapApiToBien(api: any): Bien {
  const aff = api.affectations?.[0];
  const responsable = aff?.user ? `${aff.user.prenom} ${aff.user.nom}` : "";
  return {
    internalId: api.id,
    id: api.codeInventaire,
    designation: api.nom || "",
    categorie: api.categorie || "Autre",
    marque: api.type || "",
    serial: api.numeroSerie || "",
    departement: api.departement?.nom || "—",
    departementId: api.departementId || "",
    responsable,
    dateAchat: api.dateAcquisition
      ? new Date(api.dateAcquisition).toISOString().split("T")[0] : "",
    valeur: api.valeurAchat ?? 0,
    status: (api.etat as Status) || "actif",
    localisation: api.localisation || "",
    garantie: api.garantieFin
      ? new Date(api.garantieFin).toISOString().split("T")[0] : "",
    description: api.description || "",
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Table: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="9" x2="9" y2="21" /></svg>,
  Grid: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  Edit: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Export: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  ChevDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  SortA: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  SortD: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Sort: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Expand: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Collapse: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>,
  Info: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  Refresh: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  PrevPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>,
  NextPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>,
  Kbd: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="14" /><line x1="10" y1="10" x2="10" y2="14" /><line x1="14" y1="10" x2="14" y2="14" /><line x1="18" y1="10" x2="18" y2="14" /></svg>,
  Spinner: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>,
  Assign: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("fr-CI", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} style={{ background: "rgba(56,189,248,0.3)", color: "#38bdf8", borderRadius: 3, padding: "0 1px" }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {Array.from({ length: 10 }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div className="rounded-lg" style={{ height: 12, width: j === 3 ? "80%" : j === 0 ? 16 : "60%", background: "rgba(255,255,255,0.04)", animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ biens, filterStatus, setFilterStatus, loading }: {
  biens: Bien[]; filterStatus: "tous" | Status; setFilterStatus: (s: "tous" | Status) => void; loading: boolean;
}) {
  const total = biens.length;
  const valeur = biens.reduce((s, b) => s + b.valeur, 0);
  const counts = useMemo(() => ({
    actif: biens.filter(b => b.status === "actif").length,
    maintenance: biens.filter(b => b.status === "maintenance").length,
    inactif: biens.filter(b => b.status === "inactif").length,
    reforme: biens.filter(b => b.status === "reforme").length,
  }), [biens]);

  const stats = [
    { key: "tous" as const, label: "Total", value: total, sub: fmt(valeur), accent: "#38bdf8", bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.18)" },
    { key: "actif" as const, label: "Actifs", value: counts.actif, sub: total ? `${Math.round(counts.actif / total * 100)}%` : "0%", accent: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.18)" },
    { key: "maintenance" as const, label: "Maintenance", value: counts.maintenance, sub: "En cours", accent: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.18)" },
    { key: "inactif" as const, label: "Inactifs", value: counts.inactif, sub: "À réaffecter", accent: "#94a3b8", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.15)" },
    { key: "reforme" as const, label: "Réformés", value: counts.reforme, sub: "Fin de vie", accent: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(s => (
        <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "tous" : s.key)} disabled={loading}
          className="rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-default"
          style={{ background: filterStatus === s.key ? s.bg : "#0f1824", border: filterStatus === s.key ? `1.5px solid ${s.border}` : "1px solid rgba(255,255,255,0.06)", boxShadow: filterStatus === s.key ? `0 0 20px ${s.bg}` : "none" }}>
          <p className="text-[24px] font-bold leading-none" style={{ color: filterStatus === s.key ? s.accent : "#fff" }}>{loading ? "—" : s.value}</p>
          <p className="text-[11px] font-semibold mt-1" style={{ color: filterStatus === s.key ? s.accent : "#475569" }}>{s.label}</p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: filterStatus === s.key ? s.accent + "99" : "#334155" }}>{loading ? "…" : s.sub}</p>
          {filterStatus === s.key && <div className="mt-2 h-0.5 rounded-full" style={{ background: s.accent }} />}
        </button>
      ))}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, onChange, loading }: { status: Status; onChange: (s: Status) => void; loading?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s = STATUS_MAP[status];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={e => { e.stopPropagation(); if (!loading) setOpen(o => !o); }} disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:opacity-80 disabled:cursor-default"
        style={{ background: s.bg, color: s.text }}>
        {loading ? <Ico.Spinner /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />}
        {s.label}
        {!loading && <Ico.ChevDown />}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 rounded-xl overflow-hidden"
          style={{ background: "#0a1219", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", minWidth: 140, top: "100%" }}>
          {(Object.entries(STATUS_MAP) as [Status, typeof STATUS_MAP[Status]][]).map(([k, v]) => (
            <button key={k} onClick={e => { e.stopPropagation(); onChange(k); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-white/5"
              style={{ color: k === status ? v.text : "#94a3b8" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: v.dot }} />{v.label}
              {k === status && <span className="ml-auto"><Ico.Check /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Expanded row ─────────────────────────────────────────────────────────────

function ExpandedRow({ bien }: { bien: Bien }) {
  const fields = [
    ["Numéro de série", bien.serial || "—"],
    ["Responsable", bien.responsable || "—"],
    ["Localisation", bien.localisation || "—"],
    ["Fin de garantie", fmtDate(bien.garantie)],
    ["Date d'achat", fmtDate(bien.dateAchat)],
    ["Valeur", fmt(bien.valeur)],
  ];
  return (
    <tr>
      <td colSpan={10} style={{ padding: 0, background: "rgba(14,165,233,0.03)", borderBottom: "1px solid rgba(14,165,233,0.12)" }}>
        <div className="px-6 py-4 grid grid-cols-3 gap-x-8 gap-y-3">
          <div className="col-span-2 grid grid-cols-3 gap-x-6 gap-y-3">
            {fields.map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-0.5">{k}</p>
                <p className="text-[12px] text-slate-300 font-medium">{v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">Description</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">{bien.description || "—"}</p>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ bien, onClose, onEdit }: { bien: Bien; onClose: () => void; onEdit: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const s = STATUS_MAP[bien.status];
  const sections = [
    { title: "Identification", rows: [["Code inventaire", bien.id], ["Désignation", bien.designation], ["Catégorie", `${CAT_ICONS[bien.categorie] ?? "📦"} ${bien.categorie}`], ["Marque / Type", bien.marque || "—"], ["N° de série", bien.serial || "—"]] },
    { title: "Affectation", rows: [["Département", bien.departement], ["Responsable", bien.responsable || "—"], ["Localisation", bien.localisation || "—"]] },
    { title: "Financier", rows: [["Valeur d'achat", fmt(bien.valeur)], ["Date d'achat", fmtDate(bien.dateAchat)], ["Fin de garantie", fmtDate(bien.garantie)]] },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 400, background: "#0a1120", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>
        <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              {CAT_ICONS[bien.categorie] ?? "📦"}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Ico.Edit /> Modifier
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
            </div>
          </div>
          <h2 className="text-sm font-bold text-white leading-snug">{bien.designation}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] font-mono text-slate-600">{bien.id}</span>
            <span className="text-slate-700">·</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.text }}>
              <span className="w-1 h-1 rounded-full" style={{ background: s.dot }} />{s.label}
            </span>
          </div>
        </div>
        <div className="mx-5 my-4 rounded-xl px-4 py-3 flex items-center justify-between shrink-0"
          style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.15)" }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-sky-600 font-semibold">Valeur patrimoniale</p>
            <p className="text-xl font-bold text-white mt-0.5">{fmt(bien.valeur)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Acquis le</p>
            <p className="text-sm font-semibold text-slate-300 mt-0.5">{fmtDate(bien.dateAchat)}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">{section.title}</p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {section.rows.map(([k, v], i) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: i < section.rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <span className="text-[11px] text-slate-600">{k}</span>
                    <span className="text-[12px] text-slate-300 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {bien.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Description</p>
              <div className="rounded-xl px-4 py-3 text-[12px] text-slate-400 leading-relaxed"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {bien.description}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 flex items-center gap-2 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <Ico.Kbd />
          <span className="text-[10px] text-slate-700">Appuyez sur <kbd className="text-slate-500">Echap</kbd> pour fermer</span>
        </div>
      </div>
    </>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────

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

const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-150 bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

// ─── Bien Drawer ──────────────────────────────────────────────────────────────

function BienDrawer({ mode, initial, departements, onClose, onSave, saving }: {
  mode: "create" | "edit"; initial: FormData; departements: Departement[];
  onClose: () => void; onSave: (data: FormData) => void; saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.designation.trim() !== "" && form.dateAchat !== "" && form.valeur.trim() !== "";
  const currentDept = departements.find(d => d.id === form.departementId);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width: 520, background: "linear-gradient(180deg,#0f1824 0%,#0a1120 100%)", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-24px 0 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: mode === "create" ? "rgba(14,165,233,0.15)" : "rgba(139,92,246,0.15)" }}>
              <span style={{ color: mode === "create" ? "#38bdf8" : "#a78bfa" }}>
                {mode === "create" ? <Ico.Plus /> : <Ico.Edit />}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">{mode === "create" ? "Nouveau bien" : "Modifier le bien"}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{mode === "create" ? "Enregistrement d'un actif" : `Modification — ${initial.codeInventaire || ""}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
        </div>

        {/* Steps */}
        <div className="flex px-6 pt-4 gap-1 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {([1, 2] as const).map(s => (
            <button key={s} onClick={() => setStep(s)}
              className="flex items-center gap-2 px-4 pb-3 text-xs font-semibold transition-all relative"
              style={{ color: step === s ? "#38bdf8" : "#475569" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: step === s ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.05)", color: step === s ? "#38bdf8" : "#475569" }}>
                {s}
              </span>
              {s === 1 ? "Identification" : "Informations"}
              {step === s && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "linear-gradient(to right,#0ea5e9,#38bdf8)" }} />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Désignation" required>
                  <input className={iBase} placeholder="ex. MacBook Pro 16 pouces" value={form.designation} onChange={e => set("designation", e.target.value)} />
                </Field>
                <Field label="Code inventaire">
                  <input className={iBase} placeholder="Généré automatiquement" value={form.codeInventaire} onChange={e => set("codeInventaire", e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Catégorie">
                  <select className={iBase + " appearance-none cursor-pointer"} value={form.categorie} onChange={e => set("categorie", e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Statut">
                  <select className={iBase + " appearance-none cursor-pointer"} value={form.status} onChange={e => set("status", e.target.value as Status)}>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marque / Type">
                  <input className={iBase} placeholder="ex. Apple, Dell, HP…" value={form.marque} onChange={e => set("marque", e.target.value)} />
                </Field>
                <Field label="Numéro de série">
                  <input className={iBase} placeholder="ex. C02XG1JVJG5H" value={form.serial} onChange={e => set("serial", e.target.value)} />
                </Field>
              </div>
              <Field label="Description">
                <textarea className={iBase + " resize-none"} rows={3} placeholder="Notes optionnelles…" value={form.description} onChange={e => set("description", e.target.value)} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Département">
                  <select className={iBase + " appearance-none cursor-pointer"} value={form.departementId} onChange={e => set("departementId", e.target.value)}>
                    <option value="">— Aucun département —</option>
                    {departements.map(d => (
                      <option key={d.id} value={d.id}>{d.nom}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Localisation">
                  <input className={iBase} placeholder="ex. Bât. A – Bureau 201" value={form.localisation} onChange={e => set("localisation", e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date d'achat" required>
                  <input type="date" className={iBase} style={{ colorScheme: "dark" }} value={form.dateAchat} onChange={e => set("dateAchat", e.target.value)} />
                </Field>
                <Field label="Fin de garantie">
                  <input type="date" className={iBase} style={{ colorScheme: "dark" }} value={form.garantie} onChange={e => set("garantie", e.target.value)} />
                </Field>
              </div>
              <Field label="Valeur d'acquisition (FCFA)" required>
                <input type="number" min="0" className={iBase} placeholder="ex. 2400000" value={form.valeur} onChange={e => set("valeur", e.target.value)} />
              </Field>

              {/* Récapitulatif */}
              {form.designation && (
                <div className="rounded-xl p-4 mt-2 space-y-2" style={{ background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)" }}>
                  <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Récapitulatif</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {[
                      ["Désignation", form.designation],
                      ["Catégorie", form.categorie],
                      ["Marque", form.marque || "—"],
                      ["Département", currentDept?.nom || "Non assigné"],
                      ["Valeur", form.valeur ? fmt(+form.valeur) : "—"],
                      ["Statut", STATUS_MAP[form.status].label],
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
            {step === 2 && (
              <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.05)" }}>← Retour</button>
            )}
            {step === 1 ? (
              <button onClick={() => setStep(2)} disabled={!form.designation}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                Suivant →
              </button>
            ) : (
              <button onClick={() => valid && onSave(form)} disabled={!valid || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
                {saving ? <Ico.Spinner /> : <Ico.Check />}
                {mode === "create" ? "Enregistrer le bien" : "Sauvegarder"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ bien, onClose, onConfirm, loading }: { bien: Bien; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, loading]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={loading ? undefined : onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "#0f1824", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}><Ico.Trash /></div>
          <div>
            <h3 className="text-sm font-bold text-white">Supprimer ce bien ?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{bien.id} — {bien.designation}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">Cette action est <span className="text-red-400 font-semibold">irréversible</span>. Le bien sera définitivement retiré du registre patrimonial.</p>
        <div className="flex gap-3 pt-1">
          <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 transition-all" style={{ background: "rgba(255,255,255,0.05)" }}>Annuler</button>
          <button disabled={loading} onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
            {loading ? <><Ico.Spinner />Suppression…</> : "Supprimer"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BiensPage() {
  const [biens, setBiens] = useState<Bien[]>([]);
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Toutes");
  const [filterStatus, setFilterStatus] = useState<"tous" | Status>("tous");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editTarget, setEditTarget] = useState<Bien | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bien | null>(null);
  const [detailBien, setDetailBien] = useState<Bien | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof Bien>("dateAchat");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch biens ───────────────────────────────────────────────────────────
  const fetchBiens = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "tous") params.set("etat", filterStatus);
      const res = await fetch(`/api/biens?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setBiens(arr.map(mapApiToBien));
    } catch {
      showToast("Erreur lors du chargement des biens.", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, showToast]);

  // ── Fetch départements ────────────────────────────────────────────────────
  const fetchDepartements = useCallback(async () => {
    try {
      const res = await fetch("/api/departements");
      if (!res.ok) return;
      const data = await res.json();
      setDepartements(Array.isArray(data) ? data : []);
    } catch { }
  }, []);

  useEffect(() => { fetchBiens(); }, [fetchBiens]);
  useEffect(() => { fetchDepartements(); }, [fetchDepartements]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailBien) { setDetailBien(null); return; }
        if (formMode) { setFormMode(null); setEditTarget(null); return; }
        if (deleteTarget) { setDeleteTarget(null); return; }
        if (expandedId) { setExpandedId(null); return; }
      }
      if (e.key === "n" && !formMode && !deleteTarget && !detailBien) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") setFormMode("create");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [detailBien, formMode, deleteTarget, expandedId]);

  useEffect(() => { setPage(1); }, [search, filterCat, filterStatus, sortKey, sortDir]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = biens.filter(b => {
      const q = search.toLowerCase();
      const matchQ = !q || b.designation.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.departement.toLowerCase().includes(q) || b.marque.toLowerCase().includes(q) || b.categorie.toLowerCase().includes(q);
      const matchCat = filterCat === "Toutes" || b.categorie === filterCat;
      const matchStatus = filterStatus === "tous" || b.status === filterStatus;
      return matchQ && matchCat && matchStatus;
    });
    list = [...list].sort((a, b) => {
      let av: any = a[sortKey], bv: any = b[sortKey];
      if (sortKey === "valeur") { av = +av; bv = +bv; }
      if (sortKey === "dateAchat") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [biens, search, filterCat, filterStatus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: keyof Bien) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: keyof Bien }) => {
    if (sortKey !== k) return <span className="opacity-20"><Ico.Sort /></span>;
    return sortDir === "asc" ? <Ico.SortA /> : <Ico.SortD />;
  };

  const ColHeader = ({ label, k, className = "" }: { label: string; k: keyof Bien; className?: string }) => (
    <th className={`px-4 py-3 whitespace-nowrap cursor-pointer select-none group/col ${className}`} onClick={() => handleSort(k)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover/col:text-slate-400 transition-colors">
        {label} <span className={sortKey === k ? "text-sky-400" : ""}><SortIcon k={k} /></span>
      </div>
    </th>
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        codeInventaire: data.codeInventaire.trim() || undefined,
        nom: data.designation,
        type: data.marque || null,
        categorie: data.categorie || null,
        numeroSerie: data.serial || null,
        departementId: data.departementId || null,
        dateAcquisition: data.dateAchat || null,
        valeurAchat: data.valeur ? parseFloat(data.valeur) : null,
        garantieFin: data.garantie || null,
        etat: data.status,
        localisation: data.localisation || null,
        description: data.description || null,
      };

      if (formMode === "create") {
        const res = await fetch("/api/biens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erreur serveur"); }
        showToast(`"${data.designation}" enregistré avec succès.`);
      } else if (formMode === "edit" && editTarget) {
        const res = await fetch(`/api/biens/${editTarget.internalId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Erreur serveur"); }
        showToast(`"${data.designation}" mis à jour.`);
      }

      setFormMode(null); setEditTarget(null);
      await fetchBiens();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/biens/${deleteTarget.internalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      showToast(`Bien "${deleteTarget.designation}" supprimé.`, "error");
      setDeleteTarget(null);
      if (detailBien?.internalId === deleteTarget.internalId) setDetailBien(null);
      await fetchBiens();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la suppression.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (internalId: string, newStatus: Status) => {
    setStatusUpdating(internalId);
    try {
      setBiens(p => p.map(b => b.internalId === internalId ? { ...b, status: newStatus } : b));
      if (detailBien?.internalId === internalId) setDetailBien(prev => prev ? { ...prev, status: newStatus } : null);

      const current = biens.find(b => b.internalId === internalId);
      if (!current) return;

      const res = await fetch(`/api/biens/${internalId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: current.designation, type: current.marque || null, categorie: current.categorie || null,
          numeroSerie: current.serial || null, departementId: current.departementId || null,
          dateAcquisition: current.dateAchat || null, valeurAchat: current.valeur,
          garantieFin: current.garantie || null, etat: newStatus,
          localisation: current.localisation || null, description: current.description || null,
        }),
      });
      if (!res.ok) throw new Error("Erreur mise à jour statut");
      showToast(`Statut → ${STATUS_MAP[newStatus].label}`);
    } catch {
      await fetchBiens();
      showToast("Erreur lors de la mise à jour du statut.", "error");
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = biens.filter(b => selected.has(b.internalId)).map(b => b.internalId);
    if (!ids.length) return;
    try {
      await Promise.all(ids.map(id => fetch(`/api/biens/${id}`, { method: "DELETE" })));
      setSelected(new Set());
      showToast(`${ids.length} biens supprimés.`, "error");
      await fetchBiens();
    } catch {
      showToast("Erreur lors de la suppression groupée.", "error");
    }
  };

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => selected.size === paginated.length ? setSelected(new Set()) : setSelected(new Set(paginated.map(b => b.internalId)));
  const openEdit = (b: Bien) => { setEditTarget(b); setFormMode("edit"); setDetailBien(null); };

  const formInitial: FormData = editTarget ? {
    codeInventaire: editTarget.id, designation: editTarget.designation, categorie: editTarget.categorie,
    marque: editTarget.marque, serial: editTarget.serial, departementId: editTarget.departementId,
    dateAchat: editTarget.dateAchat, valeur: String(editTarget.valeur), status: editTarget.status,
    localisation: editTarget.localisation, garantie: editTarget.garantie, description: editTarget.description,
  } : EMPTY_FORM;

  const handleExport = () => {
    const headers = ["Code", "Désignation", "Catégorie", "Marque", "N° Série", "Département", "Date achat", "Valeur (FCFA)", "Statut", "Localisation", "Fin garantie", "Description"];
    const rows = filtered.map(b => [b.id, b.designation, b.categorie, b.marque, b.serial, b.departement, b.dateAchat, b.valeur, STATUS_MAP[b.status].label, b.localisation, b.garantie, `"${b.description}"`]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "registre-biens.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} biens exportés en CSV.`);
  };

  // ─────────────────────────────────────────────────────────────────────────
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

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Registre patrimonial</p>
          <h2 className="text-2xl font-bold text-white leading-none">Gestion des biens</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner /> Chargement…</span>
            ) : (
              <>
                {biens.length} actifs · Valeur totale :{" "}
                <span className="text-sky-400 font-semibold">{fmt(biens.reduce((s, b) => s + b.valeur, 0))}</span>
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
          <button onClick={fetchBiens} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.05)" }} title="Actualiser">
            <Ico.Refresh />
          </button>
          <button onClick={() => setFormMode("create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)", boxShadow: "0 4px 16px rgba(8,145,178,0.3)" }}>
            <Ico.Plus /> Nouveau bien
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatBar biens={biens} filterStatus={filterStatus} setFilterStatus={setFilterStatus} loading={loading} />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]" style={{ maxWidth: 300 }}>
          <span className="text-slate-600 shrink-0"><Ico.Search /></span>
          <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white transition-colors"><Ico.Close /></button>}
        </div>
        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.07)" }} />
        <select className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="Toutes">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
        </select>
        <div className="flex-1" />
        {!loading && <span className="text-[11px] text-slate-600 font-medium">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>}
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["table", "grid"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)} className="p-1.5 rounded-md transition-all"
              style={{ background: viewMode === m ? "rgba(14,165,233,0.2)" : "transparent", color: viewMode === m ? "#38bdf8" : "#475569" }}>
              {m === "table" ? <Ico.Table /> : <Ico.Grid />}
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={loading || filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <Ico.Export /> Exporter CSV
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl"
          style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)" }}>
          <span className="text-xs font-semibold text-sky-400">{selected.size} bien(s) sélectionné(s)</span>
          <button className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors" onClick={handleBulkDelete}>Supprimer la sélection</button>
          <button className="ml-auto text-xs text-slate-500 hover:text-white" onClick={() => setSelected(new Set())}>Annuler</button>
        </div>
      )}

      {/* ── TABLE ── */}
      {viewMode === "table" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ background: "#0f1824" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} className="accent-sky-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 w-10" />
                  <ColHeader label="Code" k="id" />
                  <ColHeader label="Désignation" k="designation" />
                  <ColHeader label="Catégorie" k="categorie" />
                  <ColHeader label="Département" k="departement" />
                  <ColHeader label="Valeur" k="valeur" />
                  <ColHeader label="Statut" k="status" />
                  <ColHeader label="Date achat" k="dateAchat" />
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-600">
                      Aucun bien ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : paginated.map((b, i) => {
                  const isSelected = selected.has(b.internalId);
                  const isExpanded = expandedId === b.internalId;
                  return (
                    // ✅ FIX : React.Fragment avec key au lieu de <> sans key
                    <React.Fragment key={b.internalId}>
                      <tr
                        style={{
                          borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.04)",
                          background: isSelected
                            ? "rgba(14,165,233,0.05)"
                            : isExpanded
                              ? "rgba(14,165,233,0.03)"
                              : i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.01)",
                        }}
                        className="group hover:bg-white/[0.025] transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(b.internalId)} className="accent-sky-500 cursor-pointer" onClick={e => e.stopPropagation()} />
                        </td>
                        <td className="px-2 py-3">
                          <button onClick={() => setExpandedId(isExpanded ? null : b.internalId)} className="p-1 rounded-md text-slate-600 hover:text-slate-300 transition-colors">
                            {isExpanded ? <Ico.Collapse /> : <Ico.Expand />}
                          </button>
                        </td>
                        <td className="px-4 py-3"><span className="text-[11px] font-mono text-slate-500">{b.id}</span></td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white leading-none"><Highlight text={b.designation} query={search} /></p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{b.marque || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{CAT_ICONS[b.categorie] ?? "📦"}</span>
                            <span className="text-xs text-slate-400">{b.categorie}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-400"><Highlight text={b.departement} query={search} /></span></td>
                        <td className="px-4 py-3"><span className="text-xs font-semibold text-white">{fmt(b.valeur)}</span></td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} onChange={s => handleStatusChange(b.internalId, s)} loading={statusUpdating === b.internalId} /></td>
                        <td className="px-4 py-3"><span className="text-xs text-slate-500">{fmtDate(b.dateAchat)}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button title="Voir détails" onClick={() => setDetailBien(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
                            <button title="Modifier" onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                            <button title="Supprimer" onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedRow bien={b} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "#0c1520" }}>
            <span className="text-[11px] text-slate-600">
              {loading ? "Chargement…" : filtered.length === 0 ? "Aucun résultat" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur ${filtered.length} biens`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ background: page === p ? "rgba(14,165,233,0.2)" : "transparent", color: page === p ? "#38bdf8" : "#475569" }}>{p}</button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GRID ── */}
      {viewMode === "grid" && (
        <>
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {[80, 120, 60].map((w, j) => (<div key={j} className="rounded-lg" style={{ height: 12, width: `${w}%`, background: "rgba(255,255,255,0.04)" }} />))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {paginated.length === 0 ? (
                <div className="col-span-3 py-16 text-center text-sm text-slate-600">Aucun bien ne correspond.</div>
              ) : paginated.map(b => (
                <div key={b.internalId}
                  className="group rounded-2xl p-5 flex flex-col gap-3 hover:border-sky-500/20 transition-all duration-200"
                  style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {CAT_ICONS[b.categorie] ?? "📦"}
                    </div>
                    <StatusBadge status={b.status} onChange={ns => handleStatusChange(b.internalId, ns)} loading={statusUpdating === b.internalId} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug"><Highlight text={b.designation} query={search} /></p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{b.marque || "—"}</p>
                  </div>
                  <div className="space-y-1.5">
                    {[["Département", b.departement], ["Localisation", b.localisation || "—"], ["Réf.", b.id]].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-[11px] text-slate-600">{k}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-sm font-bold text-white">{fmt(b.valeur)}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setDetailBien(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400    hover:bg-sky-400/10    transition-all"><Ico.Info /></button>
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400   hover:bg-red-400/10   transition-all"><Ico.Trash /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                  style={{ background: page === p ? "rgba(14,165,233,0.2)" : "transparent", color: page === p ? "#38bdf8" : "#475569" }}>{p}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {formMode && (
        <BienDrawer mode={formMode} initial={formInitial} departements={departements}
          onClose={() => { setFormMode(null); setEditTarget(null); }} onSave={handleSave} saving={saving} />
      )}
      {deleteTarget && (
        <DeleteModal bien={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} />
      )}
      {detailBien && (
        <DetailPanel bien={detailBien} onClose={() => setDetailBien(null)} onEdit={() => openEdit(detailBien)} />
      )}
    </div>
  );
}






// "use client";

// import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type Status   = "actif" | "maintenance" | "inactif" | "reforme";
// type ViewMode = "table" | "grid";
// type FormMode = "create" | "edit" | null;
// type SortDir  = "asc" | "desc";

// interface Departement {
//   id:          string;
//   nom:         string;
//   description: string | null;
// }

// interface Bien {
//   internalId:    string;
//   id:            string;
//   designation:   string;
//   categorie:     string;
//   marque:        string;
//   serial:        string;
//   departement:   string;
//   departementId: string;
//   responsable:   string;
//   dateAchat:     string;
//   valeur:        number;
//   status:        Status;
//   localisation:  string;
//   garantie:      string;
//   description:   string;
// }

// interface FormData {
//   codeInventaire: string;
//   designation:    string;
//   categorie:      string;
//   marque:         string;
//   serial:         string;
//   departementId:  string;
//   dateAchat:      string;
//   valeur:         string;
//   status:         Status;
//   localisation:   string;
//   garantie:       string;
//   description:    string;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────

// const CATEGORIES = [
//   "Informatique","Mobilier","Véhicule","Équipement",
//   "Électroménager","Télécommunication","Immobilier","Autre",
// ];
// const PAGE_SIZE = 8;

// const STATUS_MAP: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
//   actif:       { label: "Actif",       bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981" },
//   maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)",  text: "#f97316", dot: "#f97316" },
//   inactif:     { label: "Inactif",     bg: "rgba(100,116,139,0.15)", text: "#94a3b8", dot: "#64748b" },
//   reforme:     { label: "Réformé",     bg: "rgba(239,68,68,0.12)",   text: "#f87171", dot: "#ef4444" },
// };

// const CAT_ICONS: Record<string, string> = {
//   Informatique:"💻", Mobilier:"🪑", Véhicule:"🚗", Équipement:"⚙️",
//   Électroménager:"🔌", Télécommunication:"📡", Immobilier:"🏢", Autre:"📦",
// };

// // ✅ departementId vide — jamais une chaîne non-UUID
// const EMPTY_FORM: FormData = {
//   codeInventaire: "",
//   designation:    "",
//   categorie:      "Informatique",
//   marque:         "",
//   serial:         "",
//   departementId:  "",        // ← vide, pas "Direction Generale"
//   dateAchat:      "",
//   valeur:         "",
//   status:         "actif",
//   localisation:   "",
//   garantie:       "",
//   description:    "",
// };

// // ─── Mapper API → Bien ────────────────────────────────────────────────────────

// function mapApiToBien(api: any): Bien {
//   const aff = api.affectations?.[0];
//   const responsable = aff?.user ? `${aff.user.prenom} ${aff.user.nom}` : "";
//   return {
//     internalId:    api.id,
//     id:            api.codeInventaire,
//     designation:   api.nom           || "",
//     categorie:     api.categorie     || "Autre",
//     marque:        api.type          || "",
//     serial:        api.numeroSerie   || "",
//     departement:   api.departement?.nom || "—",
//     departementId: api.departementId || "",
//     responsable,
//     dateAchat:     api.dateAcquisition
//       ? new Date(api.dateAcquisition).toISOString().split("T")[0] : "",
//     valeur:        api.valeurAchat  ?? 0,
//     status:        (api.etat as Status) || "actif",
//     localisation:  api.localisation || "",
//     garantie:      api.garantieFin
//       ? new Date(api.garantieFin).toISOString().split("T")[0] : "",
//     description:   api.description  || "",
//   };
// }

// // ─── Icons ────────────────────────────────────────────────────────────────────

// const Ico = {
//   Plus:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
//   Search:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
//   Table:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
//   Grid:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
//   Edit:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
//   Trash:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
//   Close:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   Export:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
//   ChevDown: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
//   Check:    ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
//   SortA:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
//   SortD:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   Sort:     ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   Expand:   ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
//   Collapse: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
//   Info:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
//   Refresh:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
//   PrevPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
//   NextPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
//   Kbd:      ()=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/></svg>,
//   Spinner:  ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
//   Assign:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt = (n: number) =>
//   new Intl.NumberFormat("fr-CI", { style:"currency", currency:"XOF", maximumFractionDigits:0 }).format(n);

// const fmtDate = (d: string) =>
//   d ? new Date(d).toLocaleDateString("fr-CI", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// function Highlight({ text, query }: { text: string; query: string }) {
//   if (!query.trim()) return <>{text}</>;
//   const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
//   const parts = text.split(regex);
//   return (
//     <>
//       {parts.map((part, i) =>
//         regex.test(part)
//           ? <mark key={i} style={{ background:"rgba(56,189,248,0.3)", color:"#38bdf8", borderRadius:3, padding:"0 1px" }}>{part}</mark>
//           : <span key={i}>{part}</span>
//       )}
//     </>
//   );
// }

// // ─── Skeleton ─────────────────────────────────────────────────────────────────

// function SkeletonRows() {
//   return (
//     <>
//       {Array.from({ length: 6 }).map((_, i) => (
//         <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
//           {Array.from({ length: 10 }).map((_, j) => (
//             <td key={j} className="px-4 py-4">
//               <div className="rounded-lg" style={{ height:12, width: j===3?"80%":j===0?16:"60%", background:"rgba(255,255,255,0.04)", animation:`pulse 1.5s ease-in-out ${i*0.1}s infinite` }} />
//             </td>
//           ))}
//         </tr>
//       ))}
//     </>
//   );
// }

// // ─── Stat Bar ─────────────────────────────────────────────────────────────────

// function StatBar({ biens, filterStatus, setFilterStatus, loading }: {
//   biens: Bien[]; filterStatus: "tous"|Status; setFilterStatus: (s:"tous"|Status)=>void; loading: boolean;
// }) {
//   const total  = biens.length;
//   const valeur = biens.reduce((s,b)=>s+b.valeur, 0);
//   const counts = useMemo(()=>({
//     actif:       biens.filter(b=>b.status==="actif").length,
//     maintenance: biens.filter(b=>b.status==="maintenance").length,
//     inactif:     biens.filter(b=>b.status==="inactif").length,
//     reforme:     biens.filter(b=>b.status==="reforme").length,
//   }),[biens]);

//   const stats = [
//     { key:"tous"        as const, label:"Total",       value:total,              sub:fmt(valeur),                                          accent:"#38bdf8", bg:"rgba(14,165,233,0.08)",  border:"rgba(14,165,233,0.18)" },
//     { key:"actif"       as const, label:"Actifs",      value:counts.actif,       sub:total?`${Math.round(counts.actif/total*100)}%`:"0%",  accent:"#10b981", bg:"rgba(16,185,129,0.08)", border:"rgba(16,185,129,0.18)" },
//     { key:"maintenance" as const, label:"Maintenance", value:counts.maintenance, sub:"En cours",                                           accent:"#f97316", bg:"rgba(249,115,22,0.08)",  border:"rgba(249,115,22,0.18)" },
//     { key:"inactif"     as const, label:"Inactifs",    value:counts.inactif,     sub:"À réaffecter",                                       accent:"#94a3b8", bg:"rgba(100,116,139,0.08)", border:"rgba(100,116,139,0.15)" },
//     { key:"reforme"     as const, label:"Réformés",    value:counts.reforme,     sub:"Fin de vie",                                         accent:"#f87171", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.18)" },
//   ];

//   return (
//     <div className="grid grid-cols-5 gap-3">
//       {stats.map(s=>(
//         <button key={s.key} onClick={()=>setFilterStatus(filterStatus===s.key?"tous":s.key)} disabled={loading}
//           className="rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-default"
//           style={{ background:filterStatus===s.key?s.bg:"#0f1824", border:filterStatus===s.key?`1.5px solid ${s.border}`:"1px solid rgba(255,255,255,0.06)", boxShadow:filterStatus===s.key?`0 0 20px ${s.bg}`:"none" }}>
//           <p className="text-[24px] font-bold leading-none" style={{ color:filterStatus===s.key?s.accent:"#fff" }}>{loading?"—":s.value}</p>
//           <p className="text-[11px] font-semibold mt-1" style={{ color:filterStatus===s.key?s.accent:"#475569" }}>{s.label}</p>
//           <p className="text-[10px] mt-0.5 truncate" style={{ color:filterStatus===s.key?s.accent+"99":"#334155" }}>{loading?"…":s.sub}</p>
//           {filterStatus===s.key&&<div className="mt-2 h-0.5 rounded-full" style={{ background:s.accent }}/>}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── StatusBadge ──────────────────────────────────────────────────────────────

// function StatusBadge({ status, onChange, loading }: { status:Status; onChange:(s:Status)=>void; loading?:boolean }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);
//   const s = STATUS_MAP[status];

//   useEffect(()=>{
//     const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); };
//     document.addEventListener("mousedown",h);
//     return ()=>document.removeEventListener("mousedown",h);
//   },[]);

//   return (
//     <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
//       <button onClick={e=>{e.stopPropagation();if(!loading)setOpen(o=>!o);}} disabled={loading}
//         className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:opacity-80 disabled:cursor-default"
//         style={{ background:s.bg, color:s.text }}>
//         {loading?<Ico.Spinner/>:<span className="w-1.5 h-1.5 rounded-full" style={{ background:s.dot }}/>}
//         {s.label}
//         {!loading&&<Ico.ChevDown/>}
//       </button>
//       {open&&(
//         <div className="absolute left-0 z-30 mt-1 rounded-xl overflow-hidden"
//           style={{ background:"#0a1219", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 16px 48px rgba(0,0,0,0.6)", minWidth:140, top:"100%" }}>
//           {(Object.entries(STATUS_MAP) as [Status, typeof STATUS_MAP[Status]][]).map(([k,v])=>(
//             <button key={k} onClick={e=>{e.stopPropagation();onChange(k);setOpen(false);}}
//               className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-white/5"
//               style={{ color:k===status?v.text:"#94a3b8" }}>
//               <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:v.dot }}/>{v.label}
//               {k===status&&<span className="ml-auto"><Ico.Check/></span>}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Expanded row ─────────────────────────────────────────────────────────────

// function ExpandedRow({ bien }: { bien: Bien }) {
//   const fields = [
//     ["Numéro de série", bien.serial||"—"],
//     ["Responsable",     bien.responsable||"—"],
//     ["Localisation",    bien.localisation||"—"],
//     ["Fin de garantie", fmtDate(bien.garantie)],
//     ["Date d'achat",    fmtDate(bien.dateAchat)],
//     ["Valeur",          fmt(bien.valeur)],
//   ];
//   return (
//     <tr>
//       <td colSpan={10} style={{ padding:0, background:"rgba(14,165,233,0.03)", borderBottom:"1px solid rgba(14,165,233,0.12)" }}>
//         <div className="px-6 py-4 grid grid-cols-3 gap-x-8 gap-y-3">
//           <div className="col-span-2 grid grid-cols-3 gap-x-6 gap-y-3">
//             {fields.map(([k,v])=>(
//               <div key={k}>
//                 <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-0.5">{k}</p>
//                 <p className="text-[12px] text-slate-300 font-medium">{v}</p>
//               </div>
//             ))}
//           </div>
//           <div>
//             <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">Description</p>
//             <p className="text-[12px] text-slate-400 leading-relaxed">{bien.description||"—"}</p>
//           </div>
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ─── Detail panel ─────────────────────────────────────────────────────────────

// function DetailPanel({ bien, onClose, onEdit }: { bien:Bien; onClose:()=>void; onEdit:()=>void }) {
//   useEffect(()=>{
//     const h=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose(); };
//     window.addEventListener("keydown",h);
//     return ()=>window.removeEventListener("keydown",h);
//   },[onClose]);

//   const s = STATUS_MAP[bien.status];
//   const sections = [
//     { title:"Identification", rows:[["Code inventaire",bien.id],["Désignation",bien.designation],["Catégorie",`${CAT_ICONS[bien.categorie]??"📦"} ${bien.categorie}`],["Marque / Type",bien.marque||"—"],["N° de série",bien.serial||"—"]] },
//     { title:"Affectation",    rows:[["Département",bien.departement],["Responsable",bien.responsable||"—"],["Localisation",bien.localisation||"—"]] },
//     { title:"Financier",      rows:[["Valeur d'achat",fmt(bien.valeur)],["Date d'achat",fmtDate(bien.dateAchat)],["Fin de garantie",fmtDate(bien.garantie)]] },
//   ];

//   return (
//     <>
//       <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(3px)" }} onClick={onClose}/>
//       <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
//         style={{ width:400, background:"#0a1120", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}>
//         <div className="px-5 py-4 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-3">
//             <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background:"rgba(255,255,255,0.05)" }}>
//               {CAT_ICONS[bien.categorie]??"📦"}
//             </div>
//             <div className="flex items-center gap-2">
//               <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
//                 style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
//                 <Ico.Edit/> Modifier
//               </button>
//               <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close/></button>
//             </div>
//           </div>
//           <h2 className="text-sm font-bold text-white leading-snug">{bien.designation}</h2>
//           <div className="flex items-center gap-2 mt-1.5">
//             <span className="text-[11px] font-mono text-slate-600">{bien.id}</span>
//             <span className="text-slate-700">·</span>
//             <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background:s.bg, color:s.text }}>
//               <span className="w-1 h-1 rounded-full" style={{ background:s.dot }}/>{s.label}
//             </span>
//           </div>
//         </div>
//         <div className="mx-5 my-4 rounded-xl px-4 py-3 flex items-center justify-between shrink-0"
//           style={{ background:"rgba(14,165,233,0.07)", border:"1px solid rgba(14,165,233,0.15)" }}>
//           <div>
//             <p className="text-[10px] uppercase tracking-wider text-sky-600 font-semibold">Valeur patrimoniale</p>
//             <p className="text-xl font-bold text-white mt-0.5">{fmt(bien.valeur)}</p>
//           </div>
//           <div className="text-right">
//             <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Acquis le</p>
//             <p className="text-sm font-semibold text-slate-300 mt-0.5">{fmtDate(bien.dateAchat)}</p>
//           </div>
//         </div>
//         <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
//           {sections.map(section=>(
//             <div key={section.title}>
//               <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">{section.title}</p>
//               <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
//                 {section.rows.map(([k,v],i)=>(
//                   <div key={k} className="flex items-center justify-between px-4 py-2.5"
//                     style={{ borderBottom:i<section.rows.length-1?"1px solid rgba(255,255,255,0.04)":"none", background:i%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
//                     <span className="text-[11px] text-slate-600">{k}</span>
//                     <span className="text-[12px] text-slate-300 font-medium">{v}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ))}
//           {bien.description&&(
//             <div>
//               <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Description</p>
//               <div className="rounded-xl px-4 py-3 text-[12px] text-slate-400 leading-relaxed"
//                 style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
//                 {bien.description}
//               </div>
//             </div>
//           )}
//         </div>
//         <div className="px-5 py-3 flex items-center gap-2 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
//           <Ico.Kbd/>
//           <span className="text-[10px] text-slate-700">Appuyez sur <kbd className="text-slate-500">Echap</kbd> pour fermer</span>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Form field ───────────────────────────────────────────────────────────────

// function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
//   return (
//     <div>
//       <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
//         {label}{required&&<span className="text-sky-400 ml-0.5">*</span>}
//       </label>
//       {children}
//     </div>
//   );
// }

// const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-150 bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

// // ─── Bien Drawer ──────────────────────────────────────────────────────────────

// function BienDrawer({ mode, initial, departements, onClose, onSave, saving }: {
//   mode: "create"|"edit"; initial: FormData; departements: Departement[];
//   onClose: ()=>void; onSave: (data:FormData)=>void; saving: boolean;
// }) {
//   const [form, setForm] = useState<FormData>(initial);
//   const [step, setStep] = useState<1|2>(1);

//   useEffect(()=>{
//     const h=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose(); };
//     window.addEventListener("keydown",h);
//     return ()=>window.removeEventListener("keydown",h);
//   },[onClose]);

//   const set = (k:keyof FormData, v:string) => setForm(p=>({...p,[k]:v}));
//   const valid = form.designation.trim()!==""&&form.dateAchat!==""&&form.valeur.trim()!=="";
//   const currentDept = departements.find(d=>d.id===form.departementId);

//   return (
//     <>
//       <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }} onClick={onClose}/>
//       <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
//         style={{ width:520, background:"linear-gradient(180deg,#0f1824 0%,#0a1120 100%)", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-24px 0 80px rgba(0,0,0,0.6)" }}>

//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-xl flex items-center justify-center"
//               style={{ background:mode==="create"?"rgba(14,165,233,0.15)":"rgba(139,92,246,0.15)" }}>
//               <span style={{ color:mode==="create"?"#38bdf8":"#a78bfa" }}>
//                 {mode==="create"?<Ico.Plus/>:<Ico.Edit/>}
//               </span>
//             </div>
//             <div>
//               <h2 className="text-sm font-bold text-white leading-none">{mode==="create"?"Nouveau bien":"Modifier le bien"}</h2>
//               <p className="text-[11px] text-slate-500 mt-0.5">{mode==="create"?"Enregistrement d'un actif":`Modification — ${initial.codeInventaire||""}`}</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close/></button>
//         </div>

//         {/* Steps */}
//         <div className="flex px-6 pt-4 gap-1 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//           {([1,2] as const).map(s=>(
//             <button key={s} onClick={()=>setStep(s)}
//               className="flex items-center gap-2 px-4 pb-3 text-xs font-semibold transition-all relative"
//               style={{ color:step===s?"#38bdf8":"#475569" }}>
//               <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
//                 style={{ background:step===s?"rgba(14,165,233,0.2)":"rgba(255,255,255,0.05)", color:step===s?"#38bdf8":"#475569" }}>
//                 {s}
//               </span>
//               {s===1?"Identification":"Informations"}
//               {step===s&&<span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background:"linear-gradient(to right,#0ea5e9,#38bdf8)" }}/>}
//             </button>
//           ))}
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-6 py-5">
//           {step===1&&(
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Désignation" required>
//                   <input className={iBase} placeholder="ex. MacBook Pro 16 pouces" value={form.designation} onChange={e=>set("designation",e.target.value)}/>
//                 </Field>
//                 <Field label="Code inventaire">
//                   <input className={iBase} placeholder="Généré automatiquement" value={form.codeInventaire} onChange={e=>set("codeInventaire",e.target.value)}/>
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Catégorie">
//                   <select className={iBase+" appearance-none cursor-pointer"} value={form.categorie} onChange={e=>set("categorie",e.target.value)}>
//                     {CATEGORIES.map(c=><option key={c}>{c}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Statut">
//                   <select className={iBase+" appearance-none cursor-pointer"} value={form.status} onChange={e=>set("status",e.target.value as Status)}>
//                     {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
//                   </select>
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Marque / Type">
//                   <input className={iBase} placeholder="ex. Apple, Dell, HP…" value={form.marque} onChange={e=>set("marque",e.target.value)}/>
//                 </Field>
//                 <Field label="Numéro de série">
//                   <input className={iBase} placeholder="ex. C02XG1JVJG5H" value={form.serial} onChange={e=>set("serial",e.target.value)}/>
//                 </Field>
//               </div>
//               <Field label="Description">
//                 <textarea className={iBase+" resize-none"} rows={3} placeholder="Notes optionnelles…" value={form.description} onChange={e=>set("description",e.target.value)}/>
//               </Field>
//             </div>
//           )}

//           {step===2&&(
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Département">
//                   {/* ✅ Uniquement les vrais UUIDs depuis la DB — plus d'options hardcodées */}
//                   <select className={iBase+" appearance-none cursor-pointer"} value={form.departementId} onChange={e=>set("departementId",e.target.value)}>
//                     <option value="">— Aucun département —</option>
//                     {departements.map(d=>(
//                       <option key={d.id} value={d.id}>{d.nom}</option>
//                     ))}
//                   </select>
//                 </Field>
//                 <Field label="Localisation">
//                   <input className={iBase} placeholder="ex. Bât. A – Bureau 201" value={form.localisation} onChange={e=>set("localisation",e.target.value)}/>
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Date d'achat" required>
//                   <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.dateAchat} onChange={e=>set("dateAchat",e.target.value)}/>
//                 </Field>
//                 <Field label="Fin de garantie">
//                   <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.garantie} onChange={e=>set("garantie",e.target.value)}/>
//                 </Field>
//               </div>
//               <Field label="Valeur d'acquisition (FCFA)" required>
//                 <input type="number" min="0" className={iBase} placeholder="ex. 2400000" value={form.valeur} onChange={e=>set("valeur",e.target.value)}/>
//               </Field>

//               {/* Récapitulatif */}
//               {form.designation&&(
//                 <div className="rounded-xl p-4 mt-2 space-y-2" style={{ background:"rgba(14,165,233,0.05)", border:"1px solid rgba(14,165,233,0.12)" }}>
//                   <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Récapitulatif</p>
//                   <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
//                     {[
//                       ["Désignation", form.designation],
//                       ["Catégorie",   form.categorie],
//                       ["Marque",      form.marque||"—"],
//                       ["Département", currentDept?.nom||"Non assigné"],
//                       ["Valeur",      form.valeur?fmt(+form.valeur):"—"],
//                       ["Statut",      STATUS_MAP[form.status].label],
//                     ].map(([k,v])=>(
//                       <div key={k}>
//                         <p className="text-[10px] text-slate-600">{k}</p>
//                         <p className="text-[12px] text-slate-300 font-medium">{v}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="flex items-center justify-between px-6 py-4 gap-3 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
//           <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">Annuler</button>
//           <div className="flex items-center gap-2">
//             {step===2&&(
//               <button onClick={()=>setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>← Retour</button>
//             )}
//             {step===1?(
//               <button onClick={()=>setStep(2)} disabled={!form.designation}
//                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
//                 style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
//                 Suivant →
//               </button>
//             ):(
//               <button onClick={()=>valid&&onSave(form)} disabled={!valid||saving}
//                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
//                 style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
//                 {saving?<Ico.Spinner/>:<Ico.Check/>}
//                 {mode==="create"?"Enregistrer le bien":"Sauvegarder"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Delete modal ─────────────────────────────────────────────────────────────

// function DeleteModal({ bien, onClose, onConfirm, loading }: { bien:Bien; onClose:()=>void; onConfirm:()=>void; loading:boolean }) {
//   useEffect(()=>{
//     const h=(e:KeyboardEvent)=>{ if(e.key==="Escape"&&!loading) onClose(); };
//     window.addEventListener("keydown",h);
//     return ()=>window.removeEventListener("keydown",h);
//   },[onClose,loading]);

//   return (
//     <>
//       <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }} onClick={loading?undefined:onClose}/>
//       <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
//         style={{ background:"#0f1824", border:"1px solid rgba(239,68,68,0.2)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
//         <div className="flex items-center gap-3">
//           <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(239,68,68,0.12)", color:"#f87171" }}><Ico.Trash/></div>
//           <div>
//             <h3 className="text-sm font-bold text-white">Supprimer ce bien ?</h3>
//             <p className="text-[11px] text-slate-500 mt-0.5">{bien.id} — {bien.designation}</p>
//           </div>
//         </div>
//         <p className="text-sm text-slate-400">Cette action est <span className="text-red-400 font-semibold">irréversible</span>. Le bien sera définitivement retiré du registre patrimonial.</p>
//         <div className="flex gap-3 pt-1">
//           <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>Annuler</button>
//           <button disabled={loading} onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60" style={{ background:"linear-gradient(135deg,#dc2626,#b91c1c)" }}>
//             {loading?<><Ico.Spinner/>Suppression…</>:"Supprimer"}
//           </button>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────

// export default function BiensPage() {
//   const [biens,          setBiens]          = useState<Bien[]>([]);
//   const [departements,   setDepartements]   = useState<Departement[]>([]);
//   const [loading,        setLoading]        = useState(true);
//   const [saving,         setSaving]         = useState(false);
//   const [deleting,       setDeleting]       = useState(false);
//   const [statusUpdating, setStatusUpdating] = useState<string|null>(null);

//   const [search,       setSearch]       = useState("");
//   const [filterCat,    setFilterCat]    = useState("Toutes");
//   const [filterStatus, setFilterStatus] = useState<"tous"|Status>("tous");
//   const [viewMode,     setViewMode]     = useState<ViewMode>("table");
//   const [formMode,     setFormMode]     = useState<FormMode>(null);
//   const [editTarget,   setEditTarget]   = useState<Bien|null>(null);
//   const [deleteTarget, setDeleteTarget] = useState<Bien|null>(null);
//   const [detailBien,   setDetailBien]   = useState<Bien|null>(null);
//   const [selected,     setSelected]     = useState<Set<string>>(new Set());
//   const [expandedId,   setExpandedId]   = useState<string|null>(null);
//   const [sortKey,      setSortKey]      = useState<keyof Bien>("dateAchat");
//   const [sortDir,      setSortDir]      = useState<SortDir>("desc");
//   const [page,         setPage]         = useState(1);
//   const [toast,        setToast]        = useState<{msg:string;type:"success"|"error"}|null>(null);

//   const showToast = useCallback((msg:string, type:"success"|"error"="success")=>{
//     setToast({msg,type});
//     setTimeout(()=>setToast(null),3500);
//   },[]);

//   // ── Fetch biens ───────────────────────────────────────────────────────────
//   const fetchBiens = useCallback(async ()=>{
//     try {
//       setLoading(true);
//       const params = new URLSearchParams();
//       if(filterStatus!=="tous") params.set("etat",filterStatus);
//       const res  = await fetch(`/api/biens?${params}`);
//       if(!res.ok) throw new Error(await res.text());
//       const data = await res.json();
//       // L'API retourne un tableau direct
//       const arr  = Array.isArray(data) ? data : [];
//       setBiens(arr.map(mapApiToBien));
//     } catch {
//       showToast("Erreur lors du chargement des biens.","error");
//     } finally {
//       setLoading(false);
//     }
//   },[filterStatus,showToast]);

//   // ── Fetch départements ────────────────────────────────────────────────────
//   const fetchDepartements = useCallback(async ()=>{
//     try {
//       const res  = await fetch("/api/departements");
//       if(!res.ok) return;
//       const data = await res.json();
//       setDepartements(Array.isArray(data)?data:[]);
//     } catch {}
//   },[]);

//   useEffect(()=>{ fetchBiens(); },[fetchBiens]);
//   useEffect(()=>{ fetchDepartements(); },[fetchDepartements]);

//   // ── Keyboard shortcuts ────────────────────────────────────────────────────
//   useEffect(()=>{
//     const h=(e:KeyboardEvent)=>{
//       if(e.key==="Escape"){
//         if(detailBien)   { setDetailBien(null);  return; }
//         if(formMode)     { setFormMode(null); setEditTarget(null); return; }
//         if(deleteTarget) { setDeleteTarget(null); return; }
//         if(expandedId)   { setExpandedId(null);  return; }
//       }
//       if(e.key==="n"&&!formMode&&!deleteTarget&&!detailBien){
//         const tag=(e.target as HTMLElement).tagName;
//         if(tag!=="INPUT"&&tag!=="TEXTAREA"&&tag!=="SELECT") setFormMode("create");
//       }
//     };
//     window.addEventListener("keydown",h);
//     return ()=>window.removeEventListener("keydown",h);
//   },[detailBien,formMode,deleteTarget,expandedId]);

//   useEffect(()=>{ setPage(1); },[search,filterCat,filterStatus,sortKey,sortDir]);

//   // ── Filter + sort ─────────────────────────────────────────────────────────
//   const filtered = useMemo(()=>{
//     let list = biens.filter(b=>{
//       const q = search.toLowerCase();
//       const matchQ = !q||b.designation.toLowerCase().includes(q)||b.id.toLowerCase().includes(q)||b.departement.toLowerCase().includes(q)||b.marque.toLowerCase().includes(q)||b.categorie.toLowerCase().includes(q);
//       const matchCat    = filterCat==="Toutes"||b.categorie===filterCat;
//       const matchStatus = filterStatus==="tous"||b.status===filterStatus;
//       return matchQ&&matchCat&&matchStatus;
//     });
//     list = [...list].sort((a,b)=>{
//       let av:any=a[sortKey], bv:any=b[sortKey];
//       if(sortKey==="valeur")    { av=+av; bv=+bv; }
//       if(sortKey==="dateAchat") { av=new Date(av).getTime(); bv=new Date(bv).getTime(); }
//       if(av<bv) return sortDir==="asc"?-1:1;
//       if(av>bv) return sortDir==="asc"?1:-1;
//       return 0;
//     });
//     return list;
//   },[biens,search,filterCat,filterStatus,sortKey,sortDir]);

//   const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
//   const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

//   const handleSort = (key:keyof Bien)=>{
//     if(sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
//     else { setSortKey(key); setSortDir("asc"); }
//   };

//   const SortIcon = ({k}:{k:keyof Bien})=>{
//     if(sortKey!==k) return <span className="opacity-20"><Ico.Sort/></span>;
//     return sortDir==="asc"?<Ico.SortA/>:<Ico.SortD/>;
//   };

//   const ColHeader = ({label,k,className=""}:{label:string;k:keyof Bien;className?:string})=>(
//     <th className={`px-4 py-3 whitespace-nowrap cursor-pointer select-none group/col ${className}`} onClick={()=>handleSort(k)}>
//       <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover/col:text-slate-400 transition-colors">
//         {label} <span className={sortKey===k?"text-sky-400":""}><SortIcon k={k}/></span>
//       </div>
//     </th>
//   );

//   // ── CRUD ──────────────────────────────────────────────────────────────────
//   const handleSave = async (data:FormData)=>{
//     setSaving(true);
//     try {
//       const payload = {
//         codeInventaire:  data.codeInventaire.trim()||undefined,
//         nom:             data.designation,
//         type:            data.marque        ||null,
//         categorie:       data.categorie     ||null,
//         numeroSerie:     data.serial        ||null,
//         departementId:   data.departementId ||null,  // ✅ UUID réel ou null
//         dateAcquisition: data.dateAchat     ||null,
//         valeurAchat:     data.valeur ? parseFloat(data.valeur) : null,
//         garantieFin:     data.garantie      ||null,
//         etat:            data.status,
//         localisation:    data.localisation  ||null,
//         description:     data.description   ||null,
//       };

//       if(formMode==="create"){
//         const res = await fetch("/api/biens",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
//         if(!res.ok){ const err=await res.json(); throw new Error(err.error||"Erreur serveur"); }
//         showToast(`"${data.designation}" enregistré avec succès.`);
//       } else if(formMode==="edit"&&editTarget){
//         const res = await fetch(`/api/biens/${editTarget.internalId}`,{ method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
//         if(!res.ok){ const err=await res.json(); throw new Error(err.error||"Erreur serveur"); }
//         showToast(`"${data.designation}" mis à jour.`);
//       }

//       setFormMode(null); setEditTarget(null);
//       await fetchBiens();
//     } catch(err:any){
//       showToast(err.message||"Erreur lors de l'enregistrement.","error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = async ()=>{
//     if(!deleteTarget) return;
//     setDeleting(true);
//     try {
//       const res = await fetch(`/api/biens/${deleteTarget.internalId}`,{method:"DELETE"});
//       if(!res.ok) throw new Error("Erreur lors de la suppression");
//       showToast(`Bien "${deleteTarget.designation}" supprimé.`,"error");
//       setDeleteTarget(null);
//       if(detailBien?.internalId===deleteTarget.internalId) setDetailBien(null);
//       await fetchBiens();
//     } catch(err:any){
//       showToast(err.message||"Erreur lors de la suppression.","error");
//     } finally {
//       setDeleting(false);
//     }
//   };

//   const handleStatusChange = async (internalId:string, newStatus:Status)=>{
//     setStatusUpdating(internalId);
//     try {
//       setBiens(p=>p.map(b=>b.internalId===internalId?{...b,status:newStatus}:b));
//       if(detailBien?.internalId===internalId) setDetailBien(prev=>prev?{...prev,status:newStatus}:null);

//       const current = biens.find(b=>b.internalId===internalId);
//       if(!current) return;

//       const res = await fetch(`/api/biens/${internalId}`,{
//         method:"PUT", headers:{"Content-Type":"application/json"},
//         body:JSON.stringify({
//           nom:current.designation, type:current.marque||null, categorie:current.categorie||null,
//           numeroSerie:current.serial||null, departementId:current.departementId||null,
//           dateAcquisition:current.dateAchat||null, valeurAchat:current.valeur,
//           garantieFin:current.garantie||null, etat:newStatus,
//           localisation:current.localisation||null, description:current.description||null,
//         }),
//       });
//       if(!res.ok) throw new Error("Erreur mise à jour statut");
//       showToast(`Statut → ${STATUS_MAP[newStatus].label}`);
//     } catch {
//       await fetchBiens();
//       showToast("Erreur lors de la mise à jour du statut.","error");
//     } finally {
//       setStatusUpdating(null);
//     }
//   };

//   const handleBulkDelete = async ()=>{
//     const ids = biens.filter(b=>selected.has(b.internalId)).map(b=>b.internalId);
//     if(!ids.length) return;
//     try {
//       await Promise.all(ids.map(id=>fetch(`/api/biens/${id}`,{method:"DELETE"})));
//       setSelected(new Set());
//       showToast(`${ids.length} biens supprimés.`,"error");
//       await fetchBiens();
//     } catch {
//       showToast("Erreur lors de la suppression groupée.","error");
//     }
//   };

//   const toggleSelect = (id:string)=>setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
//   const toggleAll    = ()=> selected.size===paginated.length?setSelected(new Set()):setSelected(new Set(paginated.map(b=>b.internalId)));
//   const openEdit     = (b:Bien)=>{ setEditTarget(b); setFormMode("edit"); setDetailBien(null); };

//   const formInitial:FormData = editTarget ? {
//     codeInventaire: editTarget.id, designation: editTarget.designation, categorie: editTarget.categorie,
//     marque: editTarget.marque, serial: editTarget.serial, departementId: editTarget.departementId,
//     dateAchat: editTarget.dateAchat, valeur: String(editTarget.valeur), status: editTarget.status,
//     localisation: editTarget.localisation, garantie: editTarget.garantie, description: editTarget.description,
//   } : EMPTY_FORM;

//   const handleExport = ()=>{
//     const headers = ["Code","Désignation","Catégorie","Marque","N° Série","Département","Date achat","Valeur (FCFA)","Statut","Localisation","Fin garantie","Description"];
//     const rows = filtered.map(b=>[b.id,b.designation,b.categorie,b.marque,b.serial,b.departement,b.dateAchat,b.valeur,STATUS_MAP[b.status].label,b.localisation,b.garantie,`"${b.description}"`]);
//     const csv  = [headers,...rows].map(r=>r.join(";")).join("\n");
//     const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a"); a.href=url; a.download="registre-biens.csv"; a.click();
//     URL.revokeObjectURL(url);
//     showToast(`${filtered.length} biens exportés en CSV.`);
//   };

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-full px-7 py-6 space-y-5" style={{ fontFamily:"'DM Sans','Inter',sans-serif" }}>

//       {/* Toast */}
//       {toast&&(
//         <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white"
//           style={{ background:toast.type==="error"?"#1a0a0a":"#0f2d1f", border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.3)"}`, boxShadow:"0 16px 48px rgba(0,0,0,0.5)" }}>
//           <span style={{ color:toast.type==="error"?"#f87171":"#10b981" }}>{toast.type==="error"?"✕":"✓"}</span>
//           {toast.msg}
//         </div>
//       )}

//       {/* Header */}
//       <div className="flex items-end justify-between">
//         <div>
//           <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Registre patrimonial</p>
//           <h2 className="text-2xl font-bold text-white leading-none">Gestion des biens</h2>
//           <p className="text-sm text-slate-500 mt-1.5">
//             {loading?(
//               <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner/> Chargement…</span>
//             ):(
//               <>
//                 {biens.length} actifs · Valeur totale :{" "}
//                 <span className="text-sky-400 font-semibold">{fmt(biens.reduce((s,b)=>s+b.valeur,0))}</span>
//                 <span className="text-slate-700 mx-2">·</span>
//                 <span className="text-slate-600 text-[11px]">
//                   <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">N</kbd> nouveau ·{" "}
//                   <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">Echap</kbd> fermer
//                 </span>
//               </>
//             )}
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button onClick={fetchBiens} disabled={loading}
//             className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
//             style={{ background:"rgba(255,255,255,0.05)" }} title="Actualiser">
//             <Ico.Refresh/>
//           </button>
//           <button onClick={()=>setFormMode("create")}
//             className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
//             style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)", boxShadow:"0 4px 16px rgba(8,145,178,0.3)" }}>
//             <Ico.Plus/> Nouveau bien
//           </button>
//         </div>
//       </div>

//       {/* Stats */}
//       <StatBar biens={biens} filterStatus={filterStatus} setFilterStatus={setFilterStatus} loading={loading}/>

//       {/* Toolbar */}
//       <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//         <div className="flex items-center gap-2 flex-1 min-w-[200px]" style={{ maxWidth:300 }}>
//           <span className="text-slate-600 shrink-0"><Ico.Search/></span>
//           <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
//             placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}/>
//           {search&&<button onClick={()=>setSearch("")} className="text-slate-600 hover:text-white transition-colors"><Ico.Close/></button>}
//         </div>
//         <div className="w-px h-5" style={{ background:"rgba(255,255,255,0.07)" }}/>
//         <select className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
//           value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
//           <option value="Toutes">Toutes catégories</option>
//           {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
//         </select>
//         <div className="flex-1"/>
//         {!loading&&<span className="text-[11px] text-slate-600 font-medium">{filtered.length} résultat{filtered.length>1?"s":""}</span>}
//         <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background:"rgba(255,255,255,0.05)" }}>
//           {(["table","grid"] as ViewMode[]).map(m=>(
//             <button key={m} onClick={()=>setViewMode(m)} className="p-1.5 rounded-md transition-all"
//               style={{ background:viewMode===m?"rgba(14,165,233,0.2)":"transparent", color:viewMode===m?"#38bdf8":"#475569" }}>
//               {m==="table"?<Ico.Table/>:<Ico.Grid/>}
//             </button>
//           ))}
//         </div>
//         <button onClick={handleExport} disabled={loading||filtered.length===0}
//           className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-40"
//           style={{ background:"rgba(255,255,255,0.05)" }}>
//           <Ico.Export/> Exporter CSV
//         </button>
//       </div>

//       {/* Bulk bar */}
//       {selected.size>0&&(
//         <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl"
//           style={{ background:"rgba(14,165,233,0.08)", border:"1px solid rgba(14,165,233,0.2)" }}>
//           <span className="text-xs font-semibold text-sky-400">{selected.size} bien(s) sélectionné(s)</span>
//           <button className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors" onClick={handleBulkDelete}>Supprimer la sélection</button>
//           <button className="ml-auto text-xs text-slate-500 hover:text-white" onClick={()=>setSelected(new Set())}>Annuler</button>
//         </div>
//       )}

//       {/* ── TABLE ── */}
//       {viewMode==="table"&&(
//         <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
//           <div className="overflow-x-auto">
//             <table className="w-full text-left" style={{ background:"#0f1824" }}>
//               <thead>
//                 <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//                   <th className="px-4 py-3 w-10">
//                     <input type="checkbox" checked={selected.size===paginated.length&&paginated.length>0} onChange={toggleAll} className="accent-sky-500 cursor-pointer"/>
//                   </th>
//                   <th className="px-4 py-3 w-10"/>
//                   <ColHeader label="Code"        k="id"/>
//                   <ColHeader label="Désignation" k="designation"/>
//                   <ColHeader label="Catégorie"   k="categorie"/>
//                   <ColHeader label="Département" k="departement"/>
//                   <ColHeader label="Valeur"      k="valeur"/>
//                   <ColHeader label="Statut"      k="status"/>
//                   <ColHeader label="Date achat"  k="dateAchat"/>
//                   <th className="px-4 py-3 w-28"/>
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading?(
//                   <SkeletonRows/>
//                 ):paginated.length===0?(
//                   <tr><td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-600">Aucun bien ne correspond à votre recherche.</td></tr>
//                 ):paginated.map((b,i)=>{
//                   const isSelected = selected.has(b.internalId);
//                   const isExpanded = expandedId===b.internalId;
//                   return (
//                     <>
//                       <tr key={b.internalId}
//                         style={{ borderBottom:isExpanded?"none":"1px solid rgba(255,255,255,0.04)", background:isSelected?"rgba(14,165,233,0.05)":isExpanded?"rgba(14,165,233,0.03)":i%2===0?"transparent":"rgba(255,255,255,0.01)" }}
//                         className="group hover:bg-white/[0.025] transition-colors">
//                         <td className="px-4 py-3">
//                           <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(b.internalId)} className="accent-sky-500 cursor-pointer" onClick={e=>e.stopPropagation()}/>
//                         </td>
//                         <td className="px-2 py-3">
//                           <button onClick={()=>setExpandedId(isExpanded?null:b.internalId)} className="p-1 rounded-md text-slate-600 hover:text-slate-300 transition-colors">
//                             {isExpanded?<Ico.Collapse/>:<Ico.Expand/>}
//                           </button>
//                         </td>
//                         <td className="px-4 py-3"><span className="text-[11px] font-mono text-slate-500">{b.id}</span></td>
//                         <td className="px-4 py-3">
//                           <p className="text-sm font-medium text-white leading-none"><Highlight text={b.designation} query={search}/></p>
//                           <p className="text-[11px] text-slate-600 mt-0.5">{b.marque||"—"}</p>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-2">
//                             <span className="text-base">{CAT_ICONS[b.categorie]??"📦"}</span>
//                             <span className="text-xs text-slate-400">{b.categorie}</span>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3"><span className="text-xs text-slate-400"><Highlight text={b.departement} query={search}/></span></td>
//                         <td className="px-4 py-3"><span className="text-xs font-semibold text-white">{fmt(b.valeur)}</span></td>
//                         <td className="px-4 py-3"><StatusBadge status={b.status} onChange={s=>handleStatusChange(b.internalId,s)} loading={statusUpdating===b.internalId}/></td>
//                         <td className="px-4 py-3"><span className="text-xs text-slate-500">{fmtDate(b.dateAchat)}</span></td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                             <button title="Voir détails" onClick={()=>setDetailBien(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info/></button>
//                             <button title="Modifier"     onClick={()=>openEdit(b)}       className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit/></button>
//                             <button title="Supprimer"    onClick={()=>setDeleteTarget(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash/></button>
//                           </div>
//                         </td>
//                       </tr>
//                       {isExpanded&&<ExpandedRow key={`${b.internalId}-exp`} bien={b}/>}
//                     </>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//           <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)", background:"#0c1520" }}>
//             <span className="text-[11px] text-slate-600">
//               {loading?"Chargement…":filtered.length===0?"Aucun résultat":`${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE,filtered.length)} sur ${filtered.length} biens`}
//             </span>
//             {totalPages>1&&(
//               <div className="flex items-center gap-1">
//                 <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage/></button>
//                 {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
//                   <button key={p} onClick={()=>setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
//                     style={{ background:page===p?"rgba(14,165,233,0.2)":"transparent", color:page===p?"#38bdf8":"#475569" }}>{p}</button>
//                 ))}
//                 <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage/></button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ── GRID ── */}
//       {viewMode==="grid"&&(
//         <>
//           {loading?(
//             <div className="grid grid-cols-3 gap-4">
//               {Array.from({length:6}).map((_,i)=>(
//                 <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//                   {[80,120,60].map((w,j)=>(<div key={j} className="rounded-lg" style={{ height:12, width:`${w}%`, background:"rgba(255,255,255,0.04)" }}/>))}
//                 </div>
//               ))}
//             </div>
//           ):(
//             <div className="grid grid-cols-3 gap-4">
//               {paginated.length===0?(
//                 <div className="col-span-3 py-16 text-center text-sm text-slate-600">Aucun bien ne correspond.</div>
//               ):paginated.map(b=>(
//                 <div key={b.internalId}
//                   className="group rounded-2xl p-5 flex flex-col gap-3 hover:border-sky-500/20 transition-all duration-200"
//                   style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//                   <div className="flex items-start justify-between">
//                     <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background:"rgba(255,255,255,0.05)" }}>
//                       {CAT_ICONS[b.categorie]??"📦"}
//                     </div>
//                     <StatusBadge status={b.status} onChange={ns=>handleStatusChange(b.internalId,ns)} loading={statusUpdating===b.internalId}/>
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold text-white leading-snug"><Highlight text={b.designation} query={search}/></p>
//                     <p className="text-[11px] text-slate-600 mt-0.5">{b.marque||"—"}</p>
//                   </div>
//                   <div className="space-y-1.5">
//                     {[["Département",b.departement],["Localisation",b.localisation||"—"],["Réf.",b.id]].map(([k,v])=>(
//                       <div key={k} className="flex justify-between">
//                         <span className="text-[11px] text-slate-600">{k}</span>
//                         <span className="text-[11px] text-slate-400 font-medium">{v}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <div className="flex items-center justify-between pt-2" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
//                     <span className="text-sm font-bold text-white">{fmt(b.valeur)}</span>
//                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                       <button onClick={()=>setDetailBien(b)}   className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400    hover:bg-sky-400/10    transition-all"><Ico.Info/></button>
//                       <button onClick={()=>openEdit(b)}         className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit/></button>
//                       <button onClick={()=>setDeleteTarget(b)}  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400   hover:bg-red-400/10   transition-all"><Ico.Trash/></button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//           {totalPages>1&&(
//             <div className="flex justify-center gap-1 pt-2">
//               <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage/></button>
//               {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
//                 <button key={p} onClick={()=>setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
//                   style={{ background:page===p?"rgba(14,165,233,0.2)":"transparent", color:page===p?"#38bdf8":"#475569" }}>{p}</button>
//               ))}
//               <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage/></button>
//             </div>
//           )}
//         </>
//       )}

//       {/* Modals */}
//       {formMode&&(
//         <BienDrawer mode={formMode} initial={formInitial} departements={departements}
//           onClose={()=>{setFormMode(null);setEditTarget(null);}} onSave={handleSave} saving={saving}/>
//       )}
//       {deleteTarget&&(
//         <DeleteModal bien={deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}/>
//       )}
//       {detailBien&&(
//         <DetailPanel bien={detailBien} onClose={()=>setDetailBien(null)} onEdit={()=>openEdit(detailBien)}/>
//       )}
//     </div>
//   );
// }





// "use client";

// import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type Status   = "actif" | "maintenance" | "inactif" | "reforme";
// type ViewMode = "table" | "grid";
// type FormMode = "create" | "edit" | null;
// type SortDir  = "asc" | "desc";

// interface Departement {
//   id:          string;
//   nom:         string;
//   description: string | null;
// }

// interface Bien {
//   internalId:    string;   // UUID DB
//   id:            string;   // codeInventaire (affiché)
//   designation:   string;   // nom
//   categorie:     string;
//   marque:        string;   // type
//   serial:        string;   // numeroSerie
//   departement:   string;   // departement.nom
//   departementId: string;
//   responsable:   string;
//   dateAchat:     string;
//   valeur:        number;
//   status:        Status;
//   localisation:  string;
//   garantie:      string;
//   description:   string;
// }

// interface FormData {
//   codeInventaire: string;
//   designation:    string;
//   categorie:      string;
//   marque:         string;
//   serial:         string;
//   departementId:  string;
//   dateAchat:      string;
//   valeur:         string;
//   status:         Status;
//   localisation:   string;
//   garantie:       string;
//   description:    string;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────

// const CATEGORIES = [
//   "Informatique","Mobilier","Véhicule","Équipement",
//   "Électroménager","Télécommunication","Immobilier","Autre",
// ];
// const PAGE_SIZE = 8;

// const DEPARTEMENTS = [
//   "Direction Generale", "Informatique","Comptabiliter","Logitique",
//   "Fournisseurs","Ressources Humaine","Autre",
// ];
// const PAGE = 7;

// const STATUS_MAP: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
//   actif:       { label: "Actif",       bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981" },
//   maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)",  text: "#f97316", dot: "#f97316" },
//   inactif:     { label: "Inactif",     bg: "rgba(100,116,139,0.15)", text: "#94a3b8", dot: "#64748b" },
//   reforme:     { label: "Réformé",     bg: "rgba(239,68,68,0.12)",   text: "#f87171", dot: "#ef4444" },
// };

// const CAT_ICONS: Record<string, string> = {
//   Informatique:"💻", Mobilier:"🪑", Véhicule:"🚗", Équipement:"⚙️",
//   Électroménager:"🔌", Télécommunication:"📡", Immobilier:"🏢", Autre:"📦",
// };

// const EMPTY_FORM: FormData = {
//   codeInventaire: "", designation: "", categorie: "Informatique", marque: "",
//   serial: "", departementId: "Direction Generale", dateAchat: "", valeur: "",
//   status: "actif", localisation: "", garantie: "", description: "",
// };

// // ─── Mapper API → Bien ────────────────────────────────────────────────────────

// function mapApiToBien(api: any): Bien {
//   const aff = api.affectations?.[0];
//   const responsable = aff?.user
//     ? `${aff.user.prenom} ${aff.user.nom}`
//     : "";

//   return {
//     internalId:    api.id,
//     id:            api.codeInventaire,
//     designation:   api.nom           || "",
//     categorie:     api.categorie     || "Autre",
//     marque:        api.type          || "",
//     serial:        api.numeroSerie   || "",
//     departement:   api.departement?.nom || "—",
//     departementId: api.departementId || "",
//     responsable,
//     dateAchat:     api.dateAcquisition
//       ? new Date(api.dateAcquisition).toISOString().split("T")[0]
//       : "",
//     valeur:        api.valeurAchat  ?? 0,
//     status:        (api.etat as Status) || "actif",
//     localisation:  api.localisation || "",
//     garantie:      api.garantieFin
//       ? new Date(api.garantieFin).toISOString().split("T")[0]
//       : "",
//     description:   api.description  || "",
//   };
// }

// // ─── Icons ────────────────────────────────────────────────────────────────────

// const Ico = {
//   Plus:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
//   Search:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
//   Table:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
//   Grid:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
//   Edit:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
//   Trash:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
//   Close:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   Export:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
//   ChevDown: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
//   Check:    ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
//   SortA:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
//   SortD:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   Sort:     ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   Expand:   ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
//   Collapse: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
//   Info:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
//   Refresh:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
//   PrevPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
//   NextPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
//   Kbd:      ()=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/></svg>,
//   Spinner:  ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt = (n: number) =>
//   new Intl.NumberFormat("fr-CI", { style:"currency", currency:"XOF", maximumFractionDigits:0 }).format(n);

// const fmtDate = (d: string) =>
//   d ? new Date(d).toLocaleDateString("fr-CI", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// function Highlight({ text, query }: { text: string; query: string }) {
//   if (!query.trim()) return <>{text}</>;
//   const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
//   const parts = text.split(regex);
//   return (
//     <>
//       {parts.map((part, i) =>
//         regex.test(part) ? (
//           <mark key={i} style={{ background:"rgba(56,189,248,0.3)", color:"#38bdf8", borderRadius:3, padding:"0 1px" }}>
//             {part}
//           </mark>
//         ) : (
//           <span key={i}>{part}</span>
//         )
//       )}
//     </>
//   );
// }

// // ─── Skeleton row ─────────────────────────────────────────────────────────────

// function SkeletonRows() {
//   return (
//     <>
//       {Array.from({ length: 6 }).map((_, i) => (
//         <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
//           {Array.from({ length: 9 }).map((_, j) => (
//             <td key={j} className="px-4 py-4">
//               <div
//                 className="rounded-lg"
//                 style={{
//                   height: 12,
//                   width: j === 3 ? "80%" : j === 0 ? 16 : "60%",
//                   background: "rgba(255,255,255,0.04)",
//                   animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
//                 }}
//               />
//             </td>
//           ))}
//         </tr>
//       ))}
//     </>
//   );
// }

// // ─── Stat Bar ─────────────────────────────────────────────────────────────────

// function StatBar({ biens, filterStatus, setFilterStatus, loading }: {
//   biens: Bien[];
//   filterStatus: "tous" | Status;
//   setFilterStatus: (s: "tous" | Status) => void;
//   loading: boolean;
// }) {
//   const total   = biens.length;
//   const valeur  = biens.reduce((s, b) => s + b.valeur, 0);
//   const counts  = useMemo(() => ({
//     actif:       biens.filter(b => b.status === "actif").length,
//     maintenance: biens.filter(b => b.status === "maintenance").length,
//     inactif:     biens.filter(b => b.status === "inactif").length,
//     reforme:     biens.filter(b => b.status === "reforme").length,
//   }), [biens]);

//   const stats = [
//     { key:"tous"        as const, label:"Total",       value:total,              sub:fmt(valeur),                                     accent:"#38bdf8", bg:"rgba(14,165,233,0.08)",  border:"rgba(14,165,233,0.18)" },
//     { key:"actif"       as const, label:"Actifs",      value:counts.actif,       sub:total?`${Math.round(counts.actif/total*100)}%`:"0%", accent:"#10b981", bg:"rgba(16,185,129,0.08)", border:"rgba(16,185,129,0.18)" },
//     { key:"maintenance" as const, label:"Maintenance", value:counts.maintenance, sub:"En cours",                                      accent:"#f97316", bg:"rgba(249,115,22,0.08)",  border:"rgba(249,115,22,0.18)" },
//     { key:"inactif"     as const, label:"Inactifs",    value:counts.inactif,     sub:"À réaffecter",                                  accent:"#94a3b8", bg:"rgba(100,116,139,0.08)", border:"rgba(100,116,139,0.15)" },
//     { key:"reforme"     as const, label:"Réformés",    value:counts.reforme,     sub:"Fin de vie",                                    accent:"#f87171", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.18)" },
//   ];

//   return (
//     <div className="grid grid-cols-5 gap-3">
//       {stats.map(s => (
//         <button
//           key={s.key}
//           onClick={() => setFilterStatus(filterStatus === s.key ? "tous" : s.key)}
//           disabled={loading}
//           className="rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-default"
//           style={{
//             background: filterStatus === s.key ? s.bg : "#0f1824",
//             border: filterStatus === s.key ? `1.5px solid ${s.border}` : "1px solid rgba(255,255,255,0.06)",
//             boxShadow: filterStatus === s.key ? `0 0 20px ${s.bg}` : "none",
//           }}
//         >
//           <p className="text-[24px] font-bold leading-none" style={{ color:filterStatus===s.key?s.accent:"#fff" }}>
//             {loading ? "—" : s.value}
//           </p>
//           <p className="text-[11px] font-semibold mt-1" style={{ color:filterStatus===s.key?s.accent:"#475569" }}>
//             {s.label}
//           </p>
//           <p className="text-[10px] mt-0.5 truncate" style={{ color:filterStatus===s.key?s.accent+"99":"#334155" }}>
//             {loading ? "…" : s.sub}
//           </p>
//           {filterStatus === s.key && <div className="mt-2 h-0.5 rounded-full" style={{ background:s.accent }} />}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── StatusBadge ──────────────────────────────────────────────────────────────

// function StatusBadge({ status, onChange, loading }: { status: Status; onChange: (s: Status) => void; loading?: boolean }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);
//   const s = STATUS_MAP[status];

//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   return (
//     <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
//       <button
//         onClick={(e) => { e.stopPropagation(); if (!loading) setOpen(o => !o); }}
//         disabled={loading}
//         className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:opacity-80 disabled:cursor-default"
//         style={{ background:s.bg, color:s.text }}
//         title="Cliquer pour changer le statut"
//       >
//         {loading ? <Ico.Spinner /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background:s.dot }} />}
//         {s.label}
//         {!loading && <Ico.ChevDown />}
//       </button>

//       {open && (
//         <div className="absolute left-0 z-30 mt-1 rounded-xl overflow-hidden"
//           style={{ background:"#0a1219", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 16px 48px rgba(0,0,0,0.6)", minWidth:140, top:"100%" }}>
//           {(Object.entries(STATUS_MAP) as [Status, typeof STATUS_MAP[Status]][]).map(([k, v]) => (
//             <button key={k}
//               onClick={(e) => { e.stopPropagation(); onChange(k); setOpen(false); }}
//               className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-white/5"
//               style={{ color: k === status ? v.text : "#94a3b8" }}>
//               <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:v.dot }} />
//               {v.label}
//               {k === status && <span className="ml-auto"><Ico.Check /></span>}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Expanded row ─────────────────────────────────────────────────────────────

// function ExpandedRow({ bien }: { bien: Bien }) {
//   const fields = [
//     ["Numéro de série",  bien.serial       || "—"],
//     ["Responsable",      bien.responsable   || "—"],
//     ["Localisation",     bien.localisation  || "—"],
//     ["Fin de garantie",  fmtDate(bien.garantie)],
//     ["Date d'achat",     fmtDate(bien.dateAchat)],
//     ["Valeur",           fmt(bien.valeur)],
//   ];
//   return (
//     <tr>
//       <td colSpan={9} style={{ padding:0, background:"rgba(14,165,233,0.03)", borderBottom:"1px solid rgba(14,165,233,0.12)" }}>
//         <div className="px-6 py-4 grid grid-cols-3 gap-x-8 gap-y-3">
//           <div className="col-span-2 grid grid-cols-3 gap-x-6 gap-y-3">
//             {fields.map(([k, v]) => (
//               <div key={k}>
//                 <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-0.5">{k}</p>
//                 <p className="text-[12px] text-slate-300 font-medium">{v}</p>
//               </div>
//             ))}
//           </div>
//           <div>
//             <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">Description</p>
//             <p className="text-[12px] text-slate-400 leading-relaxed">{bien.description || "—"}</p>
//           </div>
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ─── Detail panel ─────────────────────────────────────────────────────────────

// function DetailPanel({ bien, onClose, onEdit }: { bien: Bien; onClose: () => void; onEdit: () => void }) {
//   useEffect(() => {
//     const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, [onClose]);

//   const s = STATUS_MAP[bien.status];
//   const sections = [
//     {
//       title:"Identification",
//       rows:[
//         ["Code inventaire", bien.id],
//         ["Désignation",     bien.designation],
//         ["Catégorie",       `${CAT_ICONS[bien.categorie] ?? "📦"} ${bien.categorie}`],
//         ["Marque / Type",   bien.marque   || "—"],
//         ["N° de série",     bien.serial   || "—"],
//       ],
//     },
//     {
//       title:"Affectation",
//       rows:[
//         ["Département",   bien.departement],
//         ["Responsable",   bien.responsable  || "—"],
//         ["Localisation",  bien.localisation || "—"],
//       ],
//     },
//     {
//       title:"Financier",
//       rows:[
//         ["Valeur d'achat",  fmt(bien.valeur)],
//         ["Date d'achat",    fmtDate(bien.dateAchat)],
//         ["Fin de garantie", fmtDate(bien.garantie)],
//       ],
//     },
//   ];

//   return (
//     <>
//       <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(3px)" }} onClick={onClose} />
//       <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
//         style={{ width:400, background:"#0a1120", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}>
//         <div className="px-5 py-4 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-3">
//             <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background:"rgba(255,255,255,0.05)" }}>
//               {CAT_ICONS[bien.categorie] ?? "📦"}
//             </div>
//             <div className="flex items-center gap-2">
//               <button onClick={onEdit}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
//                 style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
//                 <Ico.Edit /> Modifier
//               </button>
//               <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
//             </div>
//           </div>
//           <h2 className="text-sm font-bold text-white leading-snug">{bien.designation}</h2>
//           <div className="flex items-center gap-2 mt-1.5">
//             <span className="text-[11px] font-mono text-slate-600">{bien.id}</span>
//             <span className="text-slate-700">·</span>
//             <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background:s.bg, color:s.text }}>
//               <span className="w-1 h-1 rounded-full" style={{ background:s.dot }} />{s.label}
//             </span>
//           </div>
//         </div>

//         <div className="mx-5 my-4 rounded-xl px-4 py-3 flex items-center justify-between shrink-0"
//           style={{ background:"rgba(14,165,233,0.07)", border:"1px solid rgba(14,165,233,0.15)" }}>
//           <div>
//             <p className="text-[10px] uppercase tracking-wider text-sky-600 font-semibold">Valeur patrimoniale</p>
//             <p className="text-xl font-bold text-white mt-0.5">{fmt(bien.valeur)}</p>
//           </div>
//           <div className="text-right">
//             <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Acquis le</p>
//             <p className="text-sm font-semibold text-slate-300 mt-0.5">{fmtDate(bien.dateAchat)}</p>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
//           {sections.map(section => (
//             <div key={section.title}>
//               <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">{section.title}</p>
//               <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
//                 {section.rows.map(([k, v], i) => (
//                   <div key={k} className="flex items-center justify-between px-4 py-2.5"
//                     style={{ borderBottom: i < section.rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
//                     <span className="text-[11px] text-slate-600">{k}</span>
//                     <span className="text-[12px] text-slate-300 font-medium">{v}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ))}
//           {bien.description && (
//             <div>
//               <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Description</p>
//               <div className="rounded-xl px-4 py-3 text-[12px] text-slate-400 leading-relaxed"
//                 style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
//                 {bien.description}
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="px-5 py-3 flex items-center gap-2 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
//           <Ico.Kbd />
//           <span className="text-[10px] text-slate-700">Appuyez sur <kbd className="text-slate-500">Echap</kbd> pour fermer</span>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Form field ───────────────────────────────────────────────────────────────

// function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
//   return (
//     <div>
//       <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
//         {label}{required && <span className="text-sky-400 ml-0.5">*</span>}
//       </label>
//       {children}
//     </div>
//   );
// }

// const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-150 bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

// // ─── Bien Drawer ──────────────────────────────────────────────────────────────

// function BienDrawer({ mode, initial, departements, onClose, onSave, saving }: {
//   mode:         "create" | "edit";
//   initial:      FormData;
//   departements: Departement[];
//   onClose:      () => void;
//   onSave:       (data: FormData) => void;
//   saving:       boolean;
// }) {
//   const [form, setForm] = useState<FormData>(initial);
//   const [step, setStep] = useState<1|2>(1);

//   useEffect(() => {
//     const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, [onClose]);

//   const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));
//   const valid = form.designation.trim() !== "" && form.dateAchat !== "" && form.valeur.trim() !== "";
//   const currentDept = departements.find(d => d.id === form.departementId);

//   return (
//     <>
//       <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }} onClick={onClose} />
//       <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
//         style={{ width:520, background:"linear-gradient(180deg,#0f1824 0%,#0a1120 100%)", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-24px 0 80px rgba(0,0,0,0.6)" }}>

//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-xl flex items-center justify-center"
//               style={{ background:mode==="create"?"rgba(14,165,233,0.15)":"rgba(139,92,246,0.15)" }}>
//               <span style={{ color:mode==="create"?"#38bdf8":"#a78bfa" }}>
//                 {mode === "create" ? <Ico.Plus /> : <Ico.Edit />}
//               </span>
//             </div>
//             <div>
//               <h2 className="text-sm font-bold text-white leading-none">{mode === "create" ? "Nouveau bien" : "Modifier le bien"}</h2>
//               <p className="text-[11px] text-slate-500 mt-0.5">{mode === "create" ? "Enregistrement d'un actif" : `Modification — ${initial.codeInventaire || ""}`}</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
//         </div>

//         {/* Step tabs */}
//         <div className="flex px-6 pt-4 gap-1 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//           {([1, 2] as const).map(s => (
//             <button key={s} onClick={() => setStep(s)}
//               className="flex items-center gap-2 px-4 pb-3 text-xs font-semibold transition-all relative"
//               style={{ color:step===s?"#38bdf8":"#475569" }}>
//               <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
//                 style={{ background:step===s?"rgba(14,165,233,0.2)":"rgba(255,255,255,0.05)", color:step===s?"#38bdf8":"#475569" }}>
//                 {s}
//               </span>
//               {s === 1 ? "Identification" : "Informations"}
//               {step === s && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background:"linear-gradient(to right,#0ea5e9,#38bdf8)" }} />}
//             </button>
//           ))}
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-6 py-5">
//           {step === 1 && (
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Désignation" required>
//                   <input className={iBase} placeholder="ex. MacBook Pro 16 pouces" value={form.designation} onChange={e => set("designation", e.target.value)} />
//                 </Field>
//                 <Field label="Code inventaire">
//                   <input className={iBase} placeholder="ex. BN-0142 (auto si vide)" value={form.codeInventaire} onChange={e => set("codeInventaire", e.target.value)} />
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Catégorie">
//                   <select className={iBase + " appearance-none cursor-pointer"} value={form.categorie} onChange={e => set("categorie", e.target.value)}>
//                     {CATEGORIES.map(c => <option key={c}>{c}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Statut">
//                   <select className={iBase + " appearance-none cursor-pointer"} value={form.status} onChange={e => set("status", e.target.value as Status)}>
//                     {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
//                   </select>
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Marque / Type">
//                   <input className={iBase} placeholder="ex. Apple, Dell, HP…" value={form.marque} onChange={e => set("marque", e.target.value)} />
//                 </Field>
//                 <Field label="Numéro de série">
//                   <input className={iBase} placeholder="ex. C02XG1JVJG5H" value={form.serial} onChange={e => set("serial", e.target.value)} />
//                 </Field>
//               </div>
//               <Field label="Description">
//                 <textarea className={iBase + " resize-none"} rows={3} placeholder="Notes…" value={form.description} onChange={e => set("description", e.target.value)} />
//               </Field>
//             </div>
//           )}

//           {step === 2 && (
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Département">
//                   <select className={iBase + " appearance-none cursor-pointer"} value={form.departementId} onChange={e => set("departementId", e.target.value)}>
//                     <option value="Direction Generale">DG</option>
//                     <option value="Informatique">Informatique</option>
//                     <option value="Comptabiliter">Comptabiliter</option>
//                     <option value="Ressource Hummaine">RH</option>
//                     <option value="Logistique">Logistique</option>
//                     {departements.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Localisation">
//                   <input className={iBase} placeholder="ex. Bât. A – Bureau 201" value={form.localisation} onChange={e => set("localisation", e.target.value)} />
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Date d'achat" required>
//                   <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.dateAchat} onChange={e => set("dateAchat", e.target.value)} />
//                 </Field>
//                 <Field label="Fin de garantie">
//                   <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.garantie} onChange={e => set("garantie", e.target.value)} />
//                 </Field>
//               </div>
//               <Field label="Valeur d'acquisition (FCFA)" required>
//                 <input type="number" className={iBase} placeholder="ex. 2400000" value={form.valeur} onChange={e => set("valeur", e.target.value)} />
//               </Field>

//               {/* Récapitulatif */}
//               {form.designation && (
//                 <div className="rounded-xl p-4 mt-2 space-y-2" style={{ background:"rgba(14,165,233,0.05)", border:"1px solid rgba(14,165,233,0.12)" }}>
//                   <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Récapitulatif</p>
//                   <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
//                     {[
//                       ["Désignation", form.designation],
//                       ["Catégorie",   form.categorie],
//                       ["Marque",      form.marque||"—"],
//                       ["Département", currentDept?.nom||"—"],
//                       ["Valeur",      form.valeur?fmt(+form.valeur):"—"],
//                       ["Statut",      STATUS_MAP[form.status].label],
//                     ].map(([k,v])=>(
//                       <div key={k}>
//                         <p className="text-[10px] text-slate-600">{k}</p>
//                         <p className="text-[12px] text-slate-300 font-medium">{v}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="flex items-center justify-between px-6 py-4 gap-3 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
//           <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">Annuler</button>
//           <div className="flex items-center gap-2">
//             {step === 2 && (
//               <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>← Retour</button>
//             )}
//             {step === 1 ? (
//               <button onClick={() => setStep(2)} disabled={!form.designation}
//                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
//                 style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
//                 Suivant →
//               </button>
//             ) : (
//               <button onClick={() => valid && onSave(form)} disabled={!valid || saving}
//                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
//                 style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
//                 {saving ? <Ico.Spinner /> : <Ico.Check />}
//                 {mode === "create" ? "Enregistrer le bien" : "Sauvegarder"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Delete modal ─────────────────────────────────────────────────────────────

// function DeleteModal({ bien, onClose, onConfirm, loading }: { bien: Bien; onClose: () => void; onConfirm: () => void; loading: boolean }) {
//   useEffect(() => {
//     const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, [onClose, loading]);

//   return (
//     <>
//       <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }} onClick={loading?undefined:onClose} />
//       <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
//         style={{ background:"#0f1824", border:"1px solid rgba(239,68,68,0.2)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
//         <div className="flex items-center gap-3">
//           <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(239,68,68,0.12)", color:"#f87171" }}><Ico.Trash /></div>
//           <div>
//             <h3 className="text-sm font-bold text-white">Supprimer ce bien ?</h3>
//             <p className="text-[11px] text-slate-500 mt-0.5">{bien.id} — {bien.designation}</p>
//           </div>
//         </div>
//         <p className="text-sm text-slate-400">Cette action est <span className="text-red-400 font-semibold">irréversible</span>. Le bien sera définitivement retiré du registre patrimonial.</p>
//         <div className="flex gap-3 pt-1">
//           <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>Annuler</button>
//           <button disabled={loading} onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60" style={{ background:"linear-gradient(135deg,#dc2626,#b91c1c)" }}>
//             {loading ? <><Ico.Spinner /> Suppression…</> : "Supprimer"}
//           </button>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────

// export default function BiensPage() {
//   // Data state
//   const [biens,        setBiens]        = useState<Bien[]>([]);
//   const [departements, setDepartements] = useState<Departement[]>([]);
//   const [loading,      setLoading]      = useState(true);
//   const [saving,       setSaving]       = useState(false);
//   const [deleting,     setDeleting]     = useState(false);
//   const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

//   // UI state
//   const [search,       setSearch]       = useState("");
//   const [filterCat,    setFilterCat]    = useState("Toutes");
//   const [filterStatus, setFilterStatus] = useState<"tous" | Status>("tous");
//   const [viewMode,     setViewMode]     = useState<ViewMode>("table");
//   const [formMode,     setFormMode]     = useState<FormMode>(null);
//   const [editTarget,   setEditTarget]   = useState<Bien | null>(null);
//   const [deleteTarget, setDeleteTarget] = useState<Bien | null>(null);
//   const [detailBien,   setDetailBien]   = useState<Bien | null>(null);
//   const [selected,     setSelected]     = useState<Set<string>>(new Set());
//   const [expandedId,   setExpandedId]   = useState<string | null>(null);
//   const [sortKey,      setSortKey]      = useState<keyof Bien>("dateAchat");
//   const [sortDir,      setSortDir]      = useState<SortDir>("desc");
//   const [page,         setPage]         = useState(1);
//   const [toast,        setToast]        = useState<{ msg: string; type: "success"|"error" } | null>(null);

//   // ── Toast helper ──────────────────────────────────────────────────────────
//   const showToast = useCallback((msg: string, type: "success"|"error" = "success") => {
//     setToast({ msg, type });
//     setTimeout(() => setToast(null), 3000);
//   }, []);

//   // ── Fetch biens ───────────────────────────────────────────────────────────
//   const fetchBiens = useCallback(async () => {
//     try {
//       setLoading(true);
//       const params = new URLSearchParams();
//       if (filterStatus !== "tous") params.set("etat", filterStatus);
//       const res  = await fetch(`/api/biens?${params}`);
//       if (!res.ok) throw new Error(await res.text());
//       const data = await res.json();
//       setBiens(data.map(mapApiToBien));
//     } catch (err) {
//       showToast("Erreur lors du chargement des biens.", "error");
//     } finally {
//       setLoading(false);
//     }
//   }, [filterStatus, showToast]);

//   // ── Fetch departements ────────────────────────────────────────────────────
//   const fetchDepartements = useCallback(async () => {
//     try {
//       const res  = await fetch("/api/departements");
//       if (!res.ok) return;
//       const data = await res.json();
//       setDepartements(data);
//     } catch {}
//   }, []);

//   useEffect(() => { fetchBiens();       }, [fetchBiens]);
//   useEffect(() => { fetchDepartements(); }, [fetchDepartements]);

//   // ── Keyboard shortcuts ────────────────────────────────────────────────────
//   useEffect(() => {
//     const h = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         if (detailBien)   { setDetailBien(null);   return; }
//         if (formMode)     { setFormMode(null); setEditTarget(null); return; }
//         if (deleteTarget) { setDeleteTarget(null);  return; }
//         if (expandedId)   { setExpandedId(null);    return; }
//       }
//       if (e.key === "n" && !formMode && !deleteTarget && !detailBien) {
//         const tag = (e.target as HTMLElement).tagName;
//         if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") setFormMode("create");
//       }
//     };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, [detailBien, formMode, deleteTarget, expandedId]);

//   // Reset page on filter change
//   useEffect(() => { setPage(1); }, [search, filterCat, filterStatus, sortKey, sortDir]);

//   // ── Client-side filter + sort ─────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     let list = biens.filter(b => {
//       const q = search.toLowerCase();
//       const matchQ = !q
//         || b.designation.toLowerCase().includes(q)
//         || b.id.toLowerCase().includes(q)
//         || b.departement.toLowerCase().includes(q)
//         || b.marque.toLowerCase().includes(q)
//         || b.categorie.toLowerCase().includes(q);
//       const matchCat    = filterCat    === "Toutes" || b.categorie === filterCat;
//       const matchStatus = filterStatus === "tous"   || b.status    === filterStatus;
//       return matchQ && matchCat && matchStatus;
//     });

//     list = [...list].sort((a, b) => {
//       let av: any = a[sortKey], bv: any = b[sortKey];
//       if (sortKey === "valeur")    { av = +av; bv = +bv; }
//       if (sortKey === "dateAchat") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
//       if (av < bv) return sortDir === "asc" ? -1 : 1;
//       if (av > bv) return sortDir === "asc" ? 1  : -1;
//       return 0;
//     });

//     return list;
//   }, [biens, search, filterCat, filterStatus, sortKey, sortDir]);

//   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
//   const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   // ── Sort helper ───────────────────────────────────────────────────────────
//   const handleSort = (key: keyof Bien) => {
//     if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
//     else { setSortKey(key); setSortDir("asc"); }
//   };

//   const SortIcon = ({ k }: { k: keyof Bien }) => {
//     if (sortKey !== k) return <span className="opacity-20"><Ico.Sort /></span>;
//     return sortDir === "asc" ? <Ico.SortA /> : <Ico.SortD />;
//   };

//   const ColHeader = ({ label, k, className="" }: { label:string; k:keyof Bien; className?:string }) => (
//     <th className={`px-4 py-3 whitespace-nowrap cursor-pointer select-none group/col ${className}`} onClick={() => handleSort(k)}>
//       <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover/col:text-slate-400 transition-colors">
//         {label} <span className={sortKey===k?"text-sky-400":""}><SortIcon k={k} /></span>
//       </div>
//     </th>
//   );

//   // ── CRUD handlers ─────────────────────────────────────────────────────────
//   const handleSave = async (data: FormData) => {
//     setSaving(true);
//     try {
//       const payload = {
//         codeInventaire: data.codeInventaire.trim() || undefined,
//         nom:            data.designation,
//         type:           data.marque      || null,
//         categorie:      data.categorie   || null,
//         numeroSerie:    data.serial      || null,
//         departementId:  data.departementId || null,
//         dateAcquisition: data.dateAchat  || null,
//         valeurAchat:    data.valeur ? parseFloat(data.valeur) : null,
//         garantieFin:    data.garantie    || null,
//         etat:           data.status,
//         localisation:   data.localisation || null,
//         description:    data.description  || null,
//       };

//       if (formMode === "create") {
//         const res = await fetch("/api/biens", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(payload),
//         });
//         if (!res.ok) {
//           const err = await res.json();
//           throw new Error(err.error || "Erreur serveur");
//         }
//         showToast(`"${data.designation}" enregistré avec succès.`);
//       } else if (formMode === "edit" && editTarget) {
//         const res = await fetch(`/api/biens/${editTarget.internalId}`, {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(payload),
//         });
//         if (!res.ok) {
//           const err = await res.json();
//           throw new Error(err.error || "Erreur serveur");
//         }
//         showToast(`"${data.designation}" mis à jour.`);
//       }

//       setFormMode(null);
//       setEditTarget(null);
//       await fetchBiens();
//     } catch (err: any) {
//       showToast(err.message || "Erreur lors de l'enregistrement.", "error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!deleteTarget) return;
//     setDeleting(true);
//     try {
//       const res = await fetch(`/api/biens/${deleteTarget.internalId}`, { method: "DELETE" });
//       if (!res.ok) throw new Error("Erreur lors de la suppression");
//       showToast(`Bien "${deleteTarget.designation}" supprimé.`, "error");
//       setDeleteTarget(null);
//       if (detailBien?.internalId === deleteTarget.internalId) setDetailBien(null);
//       await fetchBiens();
//     } catch (err: any) {
//       showToast(err.message || "Erreur lors de la suppression.", "error");
//     } finally {
//       setDeleting(false);
//     }
//   };

//   const handleStatusChange = async (internalId: string, newStatus: Status) => {
//     setStatusUpdating(internalId);
//     try {
//       // Optimistic update
//       setBiens(p => p.map(b => b.internalId === internalId ? { ...b, status: newStatus } : b));
//       if (detailBien?.internalId === internalId) setDetailBien(prev => prev ? { ...prev, status: newStatus } : null);

//       const current = biens.find(b => b.internalId === internalId);
//       if (!current) return;

//       const res = await fetch(`/api/biens/${internalId}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           nom:           current.designation,
//           type:          current.marque      || null,
//           categorie:     current.categorie   || null,
//           numeroSerie:   current.serial      || null,
//           departementId: current.departementId || null,
//           dateAcquisition: current.dateAchat  || null,
//           valeurAchat:   current.valeur,
//           garantieFin:   current.garantie    || null,
//           etat:          newStatus,
//           localisation:  current.localisation || null,
//           description:   current.description  || null,
//         }),
//       });
//       if (!res.ok) throw new Error("Erreur lors de la mise à jour du statut");
//       showToast(`Statut mis à jour → ${STATUS_MAP[newStatus].label}`);
//     } catch {
//       // Rollback
//       await fetchBiens();
//       showToast("Erreur lors de la mise à jour du statut.", "error");
//     } finally {
//       setStatusUpdating(null);
//     }
//   };

//   const handleBulkDelete = async () => {
//     const ids = biens.filter(b => selected.has(b.internalId)).map(b => b.internalId);
//     if (!ids.length) return;
//     try {
//       await Promise.all(ids.map(id => fetch(`/api/biens/${id}`, { method: "DELETE" })));
//       setSelected(new Set());
//       showToast(`${ids.length} biens supprimés.`, "error");
//       await fetchBiens();
//     } catch {
//       showToast("Erreur lors de la suppression groupée.", "error");
//     }
//   };

//   // ── Selection ─────────────────────────────────────────────────────────────
//   const toggleSelect = (internalId: string) => setSelected(prev => {
//     const n = new Set(prev);
//     n.has(internalId) ? n.delete(internalId) : n.add(internalId);
//     return n;
//   });
//   const toggleAll = () =>
//     selected.size === paginated.length
//       ? setSelected(new Set())
//       : setSelected(new Set(paginated.map(b => b.internalId)));

//   // ── Open edit ─────────────────────────────────────────────────────────────
//   const openEdit = (b: Bien) => { setEditTarget(b); setFormMode("edit"); setDetailBien(null); };

//   const formInitial: FormData = editTarget
//     ? {
//         codeInventaire: editTarget.id,
//         designation:    editTarget.designation,
//         categorie:      editTarget.categorie,
//         marque:         editTarget.marque,
//         serial:         editTarget.serial,
//         departementId:  editTarget.departementId,
//         dateAchat:      editTarget.dateAchat,
//         valeur:         String(editTarget.valeur),
//         status:         editTarget.status,
//         localisation:   editTarget.localisation,
//         garantie:       editTarget.garantie,
//         description:    editTarget.description,
//       }
//     : EMPTY_FORM;

//   // ── Export CSV ────────────────────────────────────────────────────────────
//   const handleExport = () => {
//     const headers = ["Code","Désignation","Catégorie","Marque","N° Série","Département","Date achat","Valeur (FCFA)","Statut","Localisation","Fin garantie","Description"];
//     const rows = filtered.map(b => [b.id,b.designation,b.categorie,b.marque,b.serial,b.departement,b.dateAchat,b.valeur,STATUS_MAP[b.status].label,b.localisation,b.garantie,`"${b.description}"`]);
//     const csv  = [headers, ...rows].map(r => r.join(";")).join("\n");
//     const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a"); a.href = url; a.download = "registre-biens.csv"; a.click();
//     URL.revokeObjectURL(url);
//     showToast(`${filtered.length} biens exportés en CSV.`);
//   };

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-full px-7 py-6 space-y-5" style={{ fontFamily:"'DM Sans','Inter',sans-serif" }}>

//       {/* Toast */}
//       {toast && (
//         <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white"
//           style={{
//             background: toast.type==="error"?"#1a0a0a":"#0f2d1f",
//             border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.3)"}`,
//             boxShadow:"0 16px 48px rgba(0,0,0,0.5)",
//           }}>
//           <span style={{ color:toast.type==="error"?"#f87171":"#10b981" }}>
//             {toast.type==="error"?"✕":"✓"}
//           </span>
//           {toast.msg}
//         </div>
//       )}

//       {/* Header */}
//       <div className="flex items-end justify-between">
//         <div>
//           <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Registre patrimonial</p>
//           <h2 className="text-2xl font-bold text-white leading-none">Gestion des biens</h2>
//           <p className="text-sm text-slate-500 mt-1.5">
//             {loading ? (
//               <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner /> Chargement…</span>
//             ) : (
//               <>
//                 {biens.length} actifs · Valeur totale :{" "}
//                 <span className="text-sky-400 font-semibold">{fmt(biens.reduce((s,b)=>s+b.valeur,0))}</span>
//                 <span className="text-slate-700 mx-2">·</span>
//                 <span className="text-slate-600 text-[11px]">
//                   <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">N</kbd> nouveau bien
//                   <span className="mx-1">·</span>
//                   <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">Echap</kbd> fermer
//                 </span>
//               </>
//             )}
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button onClick={fetchBiens} disabled={loading}
//             className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
//             style={{ background:"rgba(255,255,255,0.05)" }}
//             title="Actualiser">
//             <Ico.Refresh />
//           </button>
//           <button onClick={() => setFormMode("create")}
//             className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
//             style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)", boxShadow:"0 4px 16px rgba(8,145,178,0.3)" }}>
//             <Ico.Plus /> Nouveau bien
//           </button>
//         </div>
//       </div>

//       {/* Stats */}
//       <StatBar biens={biens} filterStatus={filterStatus} setFilterStatus={setFilterStatus} loading={loading} />

//       {/* Toolbar */}
//       <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//         <div className="flex items-center gap-2 flex-1 min-w-[200px]" style={{ maxWidth:300 }}>
//           <span className="text-slate-600 shrink-0"><Ico.Search /></span>
//           <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
//             placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
//           {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white transition-colors"><Ico.Close /></button>}
//         </div>

//         <div className="w-px h-5" style={{ background:"rgba(255,255,255,0.07)" }} />

//         <select className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
//           value={filterCat} onChange={e => setFilterCat(e.target.value)}>
//           <option value="Toutes">Toutes catégories</option>
//           {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
//         </select>

//         <div className="flex-1" />

//         {!loading && (
//           <span className="text-[11px] text-slate-600 font-medium">{filtered.length} résultat{filtered.length>1?"s":""}</span>
//         )}

//         <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background:"rgba(255,255,255,0.05)" }}>
//           {(["table","grid"] as ViewMode[]).map(m => (
//             <button key={m} onClick={() => setViewMode(m)}
//               className="p-1.5 rounded-md transition-all"
//               style={{ background:viewMode===m?"rgba(14,165,233,0.2)":"transparent", color:viewMode===m?"#38bdf8":"#475569" }}>
//               {m === "table" ? <Ico.Table /> : <Ico.Grid />}
//             </button>
//           ))}
//         </div>

//         <button onClick={handleExport} disabled={loading||filtered.length===0}
//           className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-40"
//           style={{ background:"rgba(255,255,255,0.05)" }}>
//           <Ico.Export /> Exporter CSV
//         </button>
//       </div>

//       {/* Bulk bar */}
//       {selected.size > 0 && (
//         <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl"
//           style={{ background:"rgba(14,165,233,0.08)", border:"1px solid rgba(14,165,233,0.2)" }}>
//           <span className="text-xs font-semibold text-sky-400">{selected.size} bien(s) sélectionné(s)</span>
//           <button className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors" onClick={handleBulkDelete}>
//             Supprimer la sélection
//           </button>
//           <button className="ml-auto text-xs text-slate-500 hover:text-white" onClick={() => setSelected(new Set())}>Annuler</button>
//         </div>
//       )}

//       {/* ── TABLE VIEW ── */}
//       {viewMode === "table" && (
//         <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
//           <div className="overflow-x-auto">
//             <table className="w-full text-left" style={{ background:"#0f1824" }}>
//               <thead>
//                 <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//                   <th className="px-4 py-3 w-10">
//                     <input type="checkbox" checked={selected.size===paginated.length&&paginated.length>0} onChange={toggleAll} className="accent-sky-500 cursor-pointer" />
//                   </th>
//                   <th className="px-4 py-3 w-10" />
//                   <ColHeader label="Code"        k="id" />
//                   <ColHeader label="Désignation" k="designation" />
//                   <ColHeader label="Catégorie"   k="categorie" />
//                   <ColHeader label="Département" k="departement" />
//                   <ColHeader label="Valeur"      k="valeur" />
//                   <ColHeader label="Statut"      k="status" />
//                   <ColHeader label="Date achat"  k="dateAchat" />
//                   <th className="px-4 py-3 w-24" />
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   <SkeletonRows />
//                 ) : paginated.length === 0 ? (
//                   <tr>
//                     <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-600">
//                       Aucun bien ne correspond à votre recherche.
//                     </td>
//                   </tr>
//                 ) : paginated.map((b, i) => {
//                   const isSelected = selected.has(b.internalId);
//                   const isExpanded = expandedId === b.internalId;
//                   return (
//                     <>
//                       <tr key={b.internalId}
//                         style={{
//                           borderBottom: isExpanded?"none":"1px solid rgba(255,255,255,0.04)",
//                           background: isSelected?"rgba(14,165,233,0.05)":isExpanded?"rgba(14,165,233,0.03)":i%2===0?"transparent":"rgba(255,255,255,0.01)",
//                         }}
//                         className="group hover:bg-white/[0.025] transition-colors">
//                         <td className="px-4 py-3">
//                           <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(b.internalId)} className="accent-sky-500 cursor-pointer" onClick={e => e.stopPropagation()} />
//                         </td>
//                         <td className="px-2 py-3">
//                           <button onClick={() => setExpandedId(isExpanded?null:b.internalId)}
//                             className="p-1 rounded-md text-slate-600 hover:text-slate-300 transition-colors">
//                             {isExpanded ? <Ico.Collapse /> : <Ico.Expand />}
//                           </button>
//                         </td>
//                         <td className="px-4 py-3"><span className="text-[11px] font-mono text-slate-500">{b.id}</span></td>
//                         <td className="px-4 py-3">
//                           <div>
//                             <p className="text-sm font-medium text-white leading-none">
//                               <Highlight text={b.designation} query={search} />
//                             </p>
//                             <p className="text-[11px] text-slate-600 mt-0.5">{b.marque || "—"}</p>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-2">
//                             <span className="text-base">{CAT_ICONS[b.categorie] ?? "📦"}</span>
//                             <span className="text-xs text-slate-400">{b.categorie}</span>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-xs text-slate-400"><Highlight text={b.departement} query={search} /></span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-xs font-semibold text-white">{fmt(b.valeur)}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <StatusBadge status={b.status} onChange={s => handleStatusChange(b.internalId, s)} loading={statusUpdating===b.internalId} />
//                         </td>
//                         <td className="px-4 py-3"><span className="text-xs text-slate-500">{fmtDate(b.dateAchat)}</span></td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                             <button title="Voir détails" onClick={() => setDetailBien(b)}
//                               className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
//                             <button title="Modifier" onClick={() => openEdit(b)}
//                               className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
//                             <button title="Supprimer" onClick={() => setDeleteTarget(b)}
//                               className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
//                           </div>
//                         </td>
//                       </tr>
//                       {isExpanded && <ExpandedRow key={`${b.internalId}-exp`} bien={b} />}
//                     </>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination */}
//           <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)", background:"#0c1520" }}>
//             <span className="text-[11px] text-slate-600">
//               {loading?"Chargement…":filtered.length===0?"Aucun résultat":`${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE,filtered.length)} sur ${filtered.length} biens`}
//             </span>
//             {totalPages > 1 && (
//               <div className="flex items-center gap-1">
//                 <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
//                 {Array.from({ length:totalPages },(_,i)=>i+1).map(p => (
//                   <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
//                     style={{ background:page===p?"rgba(14,165,233,0.2)":"transparent", color:page===p?"#38bdf8":"#475569" }}>{p}</button>
//                 ))}
//                 <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ── GRID VIEW ── */}
//       {viewMode === "grid" && (
//         <>
//           {loading ? (
//             <div className="grid grid-cols-3 gap-4">
//               {Array.from({ length: 6 }).map((_, i) => (
//                 <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//                   {[80, 120, 60].map((w, j) => (
//                     <div key={j} className="rounded-lg" style={{ height:12, width:`${w}%`, background:"rgba(255,255,255,0.04)" }} />
//                   ))}
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="grid grid-cols-3 gap-4">
//               {paginated.length === 0 ? (
//                 <div className="col-span-3 py-16 text-center text-sm text-slate-600">Aucun bien ne correspond.</div>
//               ) : paginated.map(b => {
//                 const s = STATUS_MAP[b.status];
//                 return (
//                   <div key={b.internalId}
//                     className="group rounded-2xl p-5 flex flex-col gap-3 hover:border-sky-500/20 transition-all duration-200"
//                     style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//                     <div className="flex items-start justify-between">
//                       <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background:"rgba(255,255,255,0.05)" }}>
//                         {CAT_ICONS[b.categorie] ?? "📦"}
//                       </div>
//                       <StatusBadge status={b.status} onChange={ns => handleStatusChange(b.internalId, ns)} loading={statusUpdating===b.internalId} />
//                     </div>
//                     <div>
//                       <p className="text-sm font-semibold text-white leading-snug"><Highlight text={b.designation} query={search} /></p>
//                       <p className="text-[11px] text-slate-600 mt-0.5">{b.marque || "—"}</p>
//                     </div>
//                     <div className="space-y-1.5">
//                       {[["Département",b.departement],["Localisation",b.localisation||"—"],["Réf.",b.id]].map(([k,v])=>(
//                         <div key={k} className="flex justify-between">
//                           <span className="text-[11px] text-slate-600">{k}</span>
//                           <span className="text-[11px] text-slate-400 font-medium">{v}</span>
//                         </div>
//                       ))}
//                     </div>
//                     <div className="flex items-center justify-between pt-2" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
//                       <span className="text-sm font-bold text-white">{fmt(b.valeur)}</span>
//                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                         <button onClick={() => setDetailBien(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
//                         <button onClick={() => openEdit(b)}      className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
//                         <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//           {totalPages > 1 && (
//             <div className="flex justify-center gap-1 pt-2">
//               <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
//               {Array.from({ length:totalPages },(_,i)=>i+1).map(p => (
//                 <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
//                   style={{ background:page===p?"rgba(14,165,233,0.2)":"transparent", color:page===p?"#38bdf8":"#475569" }}>{p}</button>
//               ))}
//               <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
//             </div>
//           )}
//         </>
//       )}

//       {/* Modals & panels */}
//       {formMode && (
//         <BienDrawer
//           mode={formMode}
//           initial={formInitial}
//           departements={departements}
//           onClose={() => { setFormMode(null); setEditTarget(null); }}
//           onSave={handleSave}
//           saving={saving}
//         />
//       )}
//       {deleteTarget && (
//         <DeleteModal
//           bien={deleteTarget}
//           onClose={() => setDeleteTarget(null)}
//           onConfirm={handleDelete}
//           loading={deleting}
//         />
//       )}
//       {detailBien && (
//         <DetailPanel
//           bien={detailBien}
//           onClose={() => setDetailBien(null)}
//           onEdit={() => openEdit(detailBien)}
//         />
//       )}
//     </div>
//   );
// }





// "use client";

// import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type Status   = "actif" | "maintenance" | "inactif" | "reforme";
// type ViewMode = "table" | "grid";
// type FormMode = "create" | "edit" | null;
// type SortDir  = "asc" | "desc";

// interface Bien {
//   id:           string;
//   designation:  string;
//   categorie:    string;
//   marque:       string;
//   modele:       string;
//   serial:       string;
//   departement:  string;
//   responsable:  string;
//   dateAchat:    string;
//   valeur:       number;
//   status:       Status;
//   localisation: string;
//   garantie:     string;
//   description:  string;
// }

// interface FormData {
//   designation:  string;
//   categorie:    string;
//   marque:       string;
//   modele:       string;
//   serial:       string;
//   departement:  string;
//   responsable:  string;
//   dateAchat:    string;
//   valeur:       string;
//   status:       Status;
//   localisation: string;
//   garantie:     string;
//   description:  string;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────

// const CATEGORIES = ["Informatique","Mobilier","Véhicule","Équipement","Électroménager","Télécommunication","Immobilier","Autre"];
// const DEPARTEMENTS = ["DSI","Ressources Humaines","Comptabilité","Direction Générale","Logistique","Commercial","Juridique"];
// const PAGE_SIZE = 8;

// const STATUS_MAP: Record<Status, { label: string; bg: string; text: string; dot: string; next: Status }> = {
//   actif:       { label: "Actif",       bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981", next: "maintenance" },
//   maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)",  text: "#f97316", dot: "#f97316", next: "inactif"     },
//   inactif:     { label: "Inactif",     bg: "rgba(100,116,139,0.15)", text: "#94a3b8", dot: "#64748b", next: "reforme"    },
//   reforme:     { label: "Réformé",     bg: "rgba(239,68,68,0.12)",   text: "#f87171", dot: "#ef4444", next: "actif"      },
// };

// const CAT_ICONS: Record<string, string> = {
//   Informatique:"💻", Mobilier:"🪑", Véhicule:"🚗", Équipement:"⚙️",
//   Électroménager:"🔌", Télécommunication:"📡", Immobilier:"🏢", Autre:"📦",
// };

// const EMPTY_FORM: FormData = {
//   designation:"", categorie:"Informatique", marque:"", modele:"", serial:"",
//   departement:"DSI", responsable:"", dateAchat:"", valeur:"", status:"actif",
//   localisation:"", garantie:"", description:"",
// };

// const SEED: Bien[] = [
//   { id:"BN-0142", designation:"MacBook Pro 16″",          categorie:"Informatique",      marque:"Apple",    modele:"MK193FN/A",   serial:"C02XG1JVJG5H", departement:"DSI",              responsable:"Konan Yao",      dateAchat:"2024-10-22", valeur:2400000,  status:"actif",       localisation:"Bât. A – Bureau 201", garantie:"2026-10-22", description:"Machine principale du chef de projet DSI." },
//   { id:"BN-0141", designation:"Climatiseur DAIKIN 18000", categorie:"Équipement",        marque:"DAIKIN",   modele:"FTXM50R",     serial:"DK2024-0088",  departement:"Ressources Humaines",responsable:"Bamba Sita",     dateAchat:"2024-10-20", valeur:650000,   status:"actif",       localisation:"Salle de réunion B",  garantie:"2026-10-20", description:"Climatiseur split inverter." },
//   { id:"BN-0140", designation:"Imprimante HP LaserJet",   categorie:"Informatique",      marque:"HP",       modele:"M404dn",      serial:"VNB3R70922",   departement:"Comptabilité",       responsable:"Dosso Fatoumata",dateAchat:"2024-10-18", valeur:380000,   status:"maintenance", localisation:"Bât. C – Bureau 105", garantie:"2026-10-18", description:"Rouleau d'entraînement à remplacer." },
//   { id:"BN-0139", designation:"Toyota RAV4 2023",         categorie:"Véhicule",          marque:"Toyota",   modele:"RAV4 Hybrid", serial:"CI-428-BB",    departement:"Direction Générale", responsable:"Touré Adama",    dateAchat:"2024-10-15", valeur:14500000, status:"actif",       localisation:"Parking souterrain",  garantie:"2027-10-15", description:"Véhicule de direction." },
//   { id:"BN-0138", designation:"Serveur Dell PowerEdge",   categorie:"Informatique",      marque:"Dell",     modele:"R750xs",      serial:"5XKJM13",      departement:"DSI",              responsable:"Konan Yao",      dateAchat:"2024-10-12", valeur:5800000,  status:"actif",       localisation:"Salle serveurs",      garantie:"2027-10-12", description:"Serveur principal de production." },
//   { id:"BN-0137", designation:"Bureau direction",         categorie:"Mobilier",          marque:"Steelcase",modele:"Flex",        serial:"SC-2024-012",  departement:"Direction Générale", responsable:"Kouamé DG",      dateAchat:"2024-09-05", valeur:420000,   status:"actif",       localisation:"Bureau DG",           garantie:"2026-09-05", description:"Bureau ergonomique direction." },
//   { id:"BN-0136", designation:"Switch HP Aruba 24 ports", categorie:"Télécommunication", marque:"HP",       modele:"Aruba 1930",  serial:"CN4BKN204Z",   departement:"DSI",              responsable:"Bah Mamadou",    dateAchat:"2024-08-14", valeur:890000,   status:"actif",       localisation:"Baie réseau R-1",     garantie:"2027-08-14", description:"Switch cœur de réseau." },
//   { id:"BN-0135", designation:"Photocopieur Ricoh",       categorie:"Équipement",        marque:"Ricoh",    modele:"IM C3000",    serial:"E184M500003",  departement:"Logistique",         responsable:"N'Goran Pierre", dateAchat:"2024-07-22", valeur:1200000,  status:"inactif",     localisation:"Entrepôt B",          garantie:"2026-07-22", description:"En attente de réaffectation." },
//   { id:"BN-0134", designation:"Véhicule Iveco Daily",     categorie:"Véhicule",          marque:"Iveco",    modele:"Daily 35S",   serial:"CI-201-TS",    departement:"Logistique",         responsable:"Coulibaly Luc",  dateAchat:"2023-11-10", valeur:8700000,  status:"reforme",     localisation:"Parc véhicules",      garantie:"2025-11-10", description:"Véhicule réformé — kilométrage dépassé." },
//   { id:"BN-0133", designation:"Tableau blanc interactif", categorie:"Équipement",        marque:"Samsung",  modele:"Flip 4",      serial:"SB2023-455",   departement:"Commercial",         responsable:"Koné Awa",       dateAchat:"2023-06-01", valeur:920000,   status:"actif",       localisation:"Salle Confé. 1",      garantie:"2025-06-01", description:"Écran interactif pour réunions." },
//   { id:"BN-0132", designation:"UPS APC 3000VA",           categorie:"Informatique",      marque:"APC",      modele:"SUA3000I",    serial:"AS1206100427",  departement:"DSI",              responsable:"Bah Mamadou",    dateAchat:"2023-04-18", valeur:580000,   status:"maintenance", localisation:"Salle serveurs",      garantie:"2025-04-18", description:"Onduleur en cours de maintenance préventive." },
// ];

// // ─── Icons ────────────────────────────────────────────────────────────────────

// const Ico = {
//   Plus:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
//   Search:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
//   Table:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
//   Grid:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
//   Edit:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
//   Trash:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
//   Close:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   Export:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
//   ChevDown: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
//   ChevUp:   ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
//   Check:    ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
//   SortA:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
//   SortD:    ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   Sort:     ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   Expand:   ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
//   Collapse: ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
//   Info:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
//   Refresh:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
//   PrevPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
//   NextPage: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
//   Kbd:      ()=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="10" x2="18" y2="14"/></svg>,
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt = (n: number) =>
//   new Intl.NumberFormat("fr-CI", { style:"currency", currency:"XOF", maximumFractionDigits:0 }).format(n);

// const fmtDate = (d: string) =>
//   d ? new Date(d).toLocaleDateString("fr-CI", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// const nextId = (list: Bien[]) => {
//   const max = list.reduce((m, b) => Math.max(m, parseInt(b.id.split("-")[1])), 0);
//   return `BN-${String(max + 1).padStart(4, "0")}`;
// };

// // Highlight search query in text
// function Highlight({ text, query }: { text: string; query: string }) {
//   if (!query.trim()) return <>{text}</>;
//   const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
//   const parts = text.split(regex);
//   return (
//     <>
//       {parts.map((part, i) =>
//         regex.test(part) ? (
//           <mark key={i} style={{ background: "rgba(56,189,248,0.3)", color: "#38bdf8", borderRadius: 3, padding: "0 1px" }}>
//             {part}
//           </mark>
//         ) : (
//           <span key={i}>{part}</span>
//         )
//       )}
//     </>
//   );
// }

// // ─── Stat Bar ─────────────────────────────────────────────────────────────────

// function StatBar({ biens, filterStatus, setFilterStatus }: {
//   biens: Bien[];
//   filterStatus: "tous" | Status;
//   setFilterStatus: (s: "tous" | Status) => void;
// }) {
//   const total   = biens.length;
//   const valeur  = biens.reduce((s, b) => s + b.valeur, 0);
//   const counts  = useMemo(() => ({
//     actif:       biens.filter(b => b.status === "actif").length,
//     maintenance: biens.filter(b => b.status === "maintenance").length,
//     inactif:     biens.filter(b => b.status === "inactif").length,
//     reforme:     biens.filter(b => b.status === "reforme").length,
//   }), [biens]);

//   const stats = [
//     { key: "tous" as const,      label: "Total",       value: total,              sub: fmt(valeur),            accent: "#38bdf8", bg: "rgba(14,165,233,0.08)",  border: "rgba(14,165,233,0.18)" },
//     { key: "actif" as const,     label: "Actifs",      value: counts.actif,       sub: `${Math.round(counts.actif/total*100)}%`, accent: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.18)" },
//     { key: "maintenance" as const,label: "Maintenance", value: counts.maintenance, sub: "En cours",             accent: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.18)" },
//     { key: "inactif" as const,   label: "Inactifs",    value: counts.inactif,     sub: "À réaffecter",         accent: "#94a3b8", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.15)" },
//     { key: "reforme" as const,   label: "Réformés",    value: counts.reforme,     sub: "Fin de vie",           accent: "#f87171", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.18)" },
//   ];

//   return (
//     <div className="grid grid-cols-5 gap-3">
//       {stats.map(s => (
//         <button
//           key={s.key}
//           onClick={() => setFilterStatus(filterStatus === s.key ? "tous" : s.key)}
//           className="rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
//           style={{
//             background: filterStatus === s.key ? s.bg : "#0f1824",
//             border: filterStatus === s.key ? `1.5px solid ${s.border}` : "1px solid rgba(255,255,255,0.06)",
//             boxShadow: filterStatus === s.key ? `0 0 20px ${s.bg}` : "none",
//           }}
//         >
//           <p className="text-[24px] font-bold leading-none" style={{ color: filterStatus === s.key ? s.accent : "#fff" }}>
//             {s.value}
//           </p>
//           <p className="text-[11px] font-semibold mt-1" style={{ color: filterStatus === s.key ? s.accent : "#475569" }}>
//             {s.label}
//           </p>
//           <p className="text-[10px] mt-0.5 truncate" style={{ color: filterStatus === s.key ? s.accent + "99" : "#334155" }}>
//             {s.sub}
//           </p>
//           {filterStatus === s.key && (
//             <div className="mt-2 h-0.5 rounded-full" style={{ background: s.accent }} />
//           )}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── Inline status badge (clickable cycle) ────────────────────────────────────

// function StatusBadge({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);
//   const s = STATUS_MAP[status];

//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   return (
//     <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
//       <button
//         onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
//         className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all hover:opacity-80"
//         style={{ background: s.bg, color: s.text }}
//         title="Cliquer pour changer le statut"
//       >
//         <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
//         {s.label}
//         <Ico.ChevDown />
//       </button>

//       {open && (
//         <div
//           className="absolute left-0 z-30 mt-1 rounded-xl overflow-hidden"
//           style={{
//             background: "#0a1219",
//             border: "1px solid rgba(255,255,255,0.1)",
//             boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
//             minWidth: 140,
//             top: "100%",
//           }}
//         >
//           {(Object.entries(STATUS_MAP) as [Status, typeof STATUS_MAP[Status]][]).map(([k, v]) => (
//             <button
//               key={k}
//               onClick={(e) => { e.stopPropagation(); onChange(k); setOpen(false); }}
//               className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] font-medium transition-colors hover:bg-white/5"
//               style={{ color: k === status ? v.text : "#94a3b8" }}
//             >
//               <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: v.dot }} />
//               {v.label}
//               {k === status && <span className="ml-auto"><Ico.Check /></span>}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Expandable row detail ────────────────────────────────────────────────────

// function ExpandedRow({ bien }: { bien: Bien }) {
//   const fields = [
//     ["Numéro de série",  bien.serial       || "—"],
//     ["Responsable",      bien.responsable   || "—"],
//     ["Localisation",     bien.localisation  || "—"],
//     ["Fin de garantie",  fmtDate(bien.garantie)],
//     ["Date d'achat",     fmtDate(bien.dateAchat)],
//     ["Valeur",           fmt(bien.valeur)],
//   ];

//   return (
//     <tr>
//       <td colSpan={9} style={{ padding: 0, background: "rgba(14,165,233,0.03)", borderBottom: "1px solid rgba(14,165,233,0.12)" }}>
//         <div className="px-6 py-4 grid grid-cols-3 gap-x-8 gap-y-3">
//           {/* Left: fields */}
//           <div className="col-span-2 grid grid-cols-3 gap-x-6 gap-y-3">
//             {fields.map(([k, v]) => (
//               <div key={k}>
//                 <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-0.5">{k}</p>
//                 <p className="text-[12px] text-slate-300 font-medium">{v}</p>
//               </div>
//             ))}
//           </div>
//           {/* Right: description */}
//           <div>
//             <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-1">Description</p>
//             <p className="text-[12px] text-slate-400 leading-relaxed">{bien.description || "—"}</p>
//           </div>
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ─── Detail side panel ────────────────────────────────────────────────────────

// function DetailPanel({ bien, onClose, onEdit }: { bien: Bien; onClose: () => void; onEdit: () => void }) {
//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
//     window.addEventListener("keydown", handler);
//     return () => window.removeEventListener("keydown", handler);
//   }, [onClose]);

//   const s = STATUS_MAP[bien.status];
//   const sections = [
//     {
//       title: "Identification",
//       rows: [
//         ["ID",            bien.id],
//         ["Désignation",   bien.designation],
//         ["Catégorie",     `${CAT_ICONS[bien.categorie] ?? "📦"} ${bien.categorie}`],
//         ["Marque",        bien.marque   || "—"],
//         ["Modèle",        bien.modele   || "—"],
//         ["N° de série",   bien.serial   || "—"],
//       ],
//     },
//     {
//       title: "Affectation",
//       rows: [
//         ["Département",   bien.departement],
//         ["Responsable",   bien.responsable  || "—"],
//         ["Localisation",  bien.localisation || "—"],
//       ],
//     },
//     {
//       title: "Financier",
//       rows: [
//         ["Valeur d'achat",  fmt(bien.valeur)],
//         ["Date d'achat",    fmtDate(bien.dateAchat)],
//         ["Fin de garantie", fmtDate(bien.garantie)],
//       ],
//     },
//   ];

//   return (
//     <>
//       <div
//         className="fixed inset-0 z-40"
//         style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
//         onClick={onClose}
//       />
//       <div
//         className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
//         style={{
//           width: 400,
//           background: "#0a1120",
//           borderLeft: "1px solid rgba(255,255,255,0.07)",
//           boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
//         }}
//       >
//         {/* Header */}
//         <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-3">
//             <div
//               className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
//               style={{ background: "rgba(255,255,255,0.05)" }}
//             >
//               {CAT_ICONS[bien.categorie] ?? "📦"}
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={onEdit}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
//                 style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
//               >
//                 <Ico.Edit /> Modifier
//               </button>
//               <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all">
//                 <Ico.Close />
//               </button>
//             </div>
//           </div>
//           <h2 className="text-sm font-bold text-white leading-snug">{bien.designation}</h2>
//           <div className="flex items-center gap-2 mt-1.5">
//             <span className="text-[11px] font-mono text-slate-600">{bien.id}</span>
//             <span className="text-slate-700">·</span>
//             <span
//               className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
//               style={{ background: s.bg, color: s.text }}
//             >
//               <span className="w-1 h-1 rounded-full" style={{ background: s.dot }} />
//               {s.label}
//             </span>
//           </div>
//         </div>

//         {/* Valeur hero */}
//         <div
//           className="mx-5 my-4 rounded-xl px-4 py-3 flex items-center justify-between shrink-0"
//           style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.15)" }}
//         >
//           <div>
//             <p className="text-[10px] uppercase tracking-wider text-sky-600 font-semibold">Valeur patrimoniale</p>
//             <p className="text-xl font-bold text-white mt-0.5">{fmt(bien.valeur)}</p>
//           </div>
//           <div className="text-right">
//             <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Acquis le</p>
//             <p className="text-sm font-semibold text-slate-300 mt-0.5">{fmtDate(bien.dateAchat)}</p>
//           </div>
//         </div>

//         {/* Sections */}
//         <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
//           {sections.map(section => (
//             <div key={section.title}>
//               <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">{section.title}</p>
//               <div
//                 className="rounded-xl overflow-hidden"
//                 style={{ border: "1px solid rgba(255,255,255,0.06)" }}
//               >
//                 {section.rows.map(([k, v], i) => (
//                   <div
//                     key={k}
//                     className="flex items-center justify-between px-4 py-2.5"
//                     style={{
//                       borderBottom: i < section.rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
//                       background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
//                     }}
//                   >
//                     <span className="text-[11px] text-slate-600">{k}</span>
//                     <span className="text-[12px] text-slate-300 font-medium">{v}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ))}

//           {bien.description && (
//             <div>
//               <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Description</p>
//               <div className="rounded-xl px-4 py-3 text-[12px] text-slate-400 leading-relaxed"
//                 style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
//                 {bien.description}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Footer shortcut hint */}
//         <div
//           className="px-5 py-3 flex items-center gap-2 shrink-0"
//           style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
//         >
//           <Ico.Kbd />
//           <span className="text-[10px] text-slate-700">Appuyez sur <kbd className="text-slate-500">Echap</kbd> pour fermer</span>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Form components ──────────────────────────────────────────────────────────

// function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
//   return (
//     <div>
//       <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
//         {label}{required && <span className="text-sky-400 ml-0.5">*</span>}
//       </label>
//       {children}
//     </div>
//   );
// }

// const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-150 bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

// function BienDrawer({ mode, initial, onClose, onSave }: {
//   mode: "create" | "edit";
//   initial: FormData;
//   onClose: () => void;
//   onSave: (data: FormData) => void;
// }) {
//   const [form, setForm] = useState<FormData>(initial);
//   const [step, setStep] = useState<1 | 2>(1);

//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
//     window.addEventListener("keydown", handler);
//     return () => window.removeEventListener("keydown", handler);
//   }, [onClose]);

//   const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));
//   const valid = form.designation.trim() !== "" && form.marque.trim() !== "" && form.dateAchat !== "" && form.valeur.trim() !== "";

//   return (
//     <>
//       <div className="fixed inset-0 z-40 transition-opacity" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose} />
//       <div
//         className="fixed right-0 top-0 h-full z-50 flex flex-col"
//         style={{
//           width: 520,
//           background: "linear-gradient(180deg,#0f1824 0%,#0a1120 100%)",
//           borderLeft: "1px solid rgba(255,255,255,0.07)",
//           boxShadow: "-24px 0 80px rgba(0,0,0,0.6)",
//         }}
//       >
//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-xl flex items-center justify-center"
//               style={{ background: mode === "create" ? "rgba(14,165,233,0.15)" : "rgba(139,92,246,0.15)" }}>
//               <span style={{ color: mode === "create" ? "#38bdf8" : "#a78bfa" }}>
//                 {mode === "create" ? <Ico.Plus /> : <Ico.Edit />}
//               </span>
//             </div>
//             <div>
//               <h2 className="text-sm font-bold text-white leading-none">{mode === "create" ? "Nouveau bien" : "Modifier le bien"}</h2>
//               <p className="text-[11px] text-slate-500 mt-0.5">{mode === "create" ? "Enregistrement d'un actif" : `Modification — ${(initial as any).id || ""}`}</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
//         </div>

//         {/* Step tabs */}
//         <div className="flex px-6 pt-4 gap-1 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
//           {([1, 2] as const).map(s => (
//             <button key={s} onClick={() => setStep(s)}
//               className="flex items-center gap-2 px-4 pb-3 text-xs font-semibold transition-all relative"
//               style={{ color: step === s ? "#38bdf8" : "#475569" }}>
//               <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
//                 style={{ background: step === s ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.05)", color: step === s ? "#38bdf8" : "#475569" }}>
//                 {s}
//               </span>
//               {s === 1 ? "Identification" : "Informations"}
//               {step === s && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "linear-gradient(to right,#0ea5e9,#38bdf8)" }} />}
//             </button>
//           ))}
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-6 py-5">
//           {step === 1 && (
//             <div className="space-y-4">
//               <Field label="Désignation" required>
//                 <input className={iBase} placeholder="ex. MacBook Pro 16 pouces" value={form.designation} onChange={e => set("designation", e.target.value)} />
//               </Field>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Catégorie" required>
//                   <select className={iBase + " appearance-none cursor-pointer"} value={form.categorie} onChange={e => set("categorie", e.target.value)}>
//                     {CATEGORIES.map(c => <option key={c}>{c}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Statut" required>
//                   <select className={iBase + " appearance-none cursor-pointer"} value={form.status} onChange={e => set("status", e.target.value as Status)}>
//                     {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
//                   </select>
//                 </Field>
//               </div>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Marque" required>
//                   <input className={iBase} placeholder="ex. Apple, Dell, HP…" value={form.marque} onChange={e => set("marque", e.target.value)} />
//                 </Field>
//                 <Field label="Modèle">
//                   <input className={iBase} placeholder="ex. MK193FN/A" value={form.modele} onChange={e => set("modele", e.target.value)} />
//                 </Field>
//               </div>
//               <Field label="Numéro de série">
//                 <input className={iBase} placeholder="ex. C02XG1JVJG5H" value={form.serial} onChange={e => set("serial", e.target.value)} />
//               </Field>
//               <Field label="Description">
//                 <textarea className={iBase + " resize-none"} rows={3} placeholder="Notes…" value={form.description} onChange={e => set("description", e.target.value)} />
//               </Field>
//             </div>
//           )}
//           {step === 2 && (
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Département" required>
//                   <select className={iBase + " appearance-none cursor-pointer"} value={form.departement} onChange={e => set("departement", e.target.value)}>
//                     {DEPARTEMENTS.map(d => <option key={d}>{d}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Responsable">
//                   <input className={iBase} placeholder="Nom complet" value={form.responsable} onChange={e => set("responsable", e.target.value)} />
//                 </Field>
//               </div>
//               <Field label="Localisation">
//                 <input className={iBase} placeholder="ex. Bât. A – Bureau 201" value={form.localisation} onChange={e => set("localisation", e.target.value)} />
//               </Field>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Date d'achat" required>
//                   <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.dateAchat} onChange={e => set("dateAchat", e.target.value)} />
//                 </Field>
//                 <Field label="Fin de garantie">
//                   <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.garantie} onChange={e => set("garantie", e.target.value)} />
//                 </Field>
//               </div>
//               <Field label="Valeur d'acquisition (FCFA)" required>
//                 <input type="number" className={iBase} placeholder="ex. 2400000" value={form.valeur} onChange={e => set("valeur", e.target.value)} />
//               </Field>
//               {form.designation && (
//                 <div className="rounded-xl p-4 mt-2 space-y-2" style={{ background:"rgba(14,165,233,0.05)", border:"1px solid rgba(14,165,233,0.12)" }}>
//                   <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Récapitulatif</p>
//                   <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
//                     {[["Désignation",form.designation],["Catégorie",form.categorie],["Marque",form.marque||"—"],["Département",form.departement],["Valeur",form.valeur?fmt(+form.valeur):"—"],["Statut",STATUS_MAP[form.status].label]].map(([k,v])=>(
//                       <div key={k}>
//                         <p className="text-[10px] text-slate-600">{k}</p>
//                         <p className="text-[12px] text-slate-300 font-medium">{v}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="flex items-center justify-between px-6 py-4 gap-3 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
//           <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">Annuler</button>
//           <div className="flex items-center gap-2">
//             {step === 2 && (
//               <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>← Retour</button>
//             )}
//             {step === 1 ? (
//               <button onClick={() => setStep(2)} disabled={!form.designation || !form.marque}
//                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
//                 style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
//                 Suivant →
//               </button>
//             ) : (
//               <button onClick={() => valid && onSave(form)} disabled={!valid}
//                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
//                 style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
//                 <Ico.Check />
//                 {mode === "create" ? "Enregistrer le bien" : "Sauvegarder"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Delete modal ─────────────────────────────────────────────────────────────

// function DeleteModal({ bien, onClose, onConfirm }: { bien: Bien; onClose: () => void; onConfirm: () => void }) {
//   useEffect(() => {
//     const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, [onClose]);

//   return (
//     <>
//       <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }} onClick={onClose} />
//       <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
//         style={{ background:"#0f1824", border:"1px solid rgba(239,68,68,0.2)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
//         <div className="flex items-center gap-3">
//           <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(239,68,68,0.12)", color:"#f87171" }}><Ico.Trash /></div>
//           <div>
//             <h3 className="text-sm font-bold text-white">Supprimer ce bien ?</h3>
//             <p className="text-[11px] text-slate-500 mt-0.5">{bien.id} — {bien.designation}</p>
//           </div>
//         </div>
//         <p className="text-sm text-slate-400">Cette action est <span className="text-red-400 font-semibold">irréversible</span>. Le bien sera définitivement retiré du registre patrimonial.</p>
//         <div className="flex gap-3 pt-1">
//           <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>Annuler</button>
//           <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background:"linear-gradient(135deg,#dc2626,#b91c1c)" }}>Supprimer</button>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────

// export default function BiensPage() {
//   const [biens,        setBiens]        = useState<Bien[]>(SEED);
//   const [search,       setSearch]       = useState("");
//   const [filterCat,    setFilterCat]    = useState("Toutes");
//   const [filterStatus, setFilterStatus] = useState<"tous" | Status>("tous");
//   const [viewMode,     setViewMode]     = useState<ViewMode>("table");
//   const [formMode,     setFormMode]     = useState<FormMode>(null);
//   const [editTarget,   setEditTarget]   = useState<Bien | null>(null);
//   const [deleteTarget, setDeleteTarget] = useState<Bien | null>(null);
//   const [detailBien,   setDetailBien]   = useState<Bien | null>(null);
//   const [selected,     setSelected]     = useState<Set<string>>(new Set());
//   const [expandedId,   setExpandedId]   = useState<string | null>(null);
//   const [sortKey,      setSortKey]      = useState<keyof Bien>("dateAchat");
//   const [sortDir,      setSortDir]      = useState<SortDir>("desc");
//   const [page,         setPage]         = useState(1);
//   const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);

//   const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
//     setToast({ msg, type });
//     setTimeout(() => setToast(null), 3000);
//   }, []);

//   // Global ESC handler
//   useEffect(() => {
//     const h = (e: KeyboardEvent) => {
//       if (e.key === "Escape") {
//         if (detailBien)   { setDetailBien(null);   return; }
//         if (formMode)     { setFormMode(null); setEditTarget(null); return; }
//         if (deleteTarget) { setDeleteTarget(null);  return; }
//         if (expandedId)   { setExpandedId(null);    return; }
//       }
//       // N = new
//       if (e.key === "n" && !formMode && !deleteTarget && !detailBien) {
//         const tag = (e.target as HTMLElement).tagName;
//         if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") setFormMode("create");
//       }
//     };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, [detailBien, formMode, deleteTarget, expandedId]);

//   // Reset page on filter change
//   useEffect(() => { setPage(1); }, [search, filterCat, filterStatus, sortKey, sortDir]);

//   const filtered = useMemo(() => {
//     let list = biens.filter(b => {
//       const q = search.toLowerCase();
//       const matchQ = !q || b.designation.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
//         || b.departement.toLowerCase().includes(q) || b.marque.toLowerCase().includes(q)
//         || b.categorie.toLowerCase().includes(q);
//       const matchCat    = filterCat    === "Toutes" || b.categorie === filterCat;
//       const matchStatus = filterStatus === "tous"   || b.status    === filterStatus;
//       return matchQ && matchCat && matchStatus;
//     });

//     list = [...list].sort((a, b) => {
//       let av: any = a[sortKey], bv: any = b[sortKey];
//       if (sortKey === "valeur")    { av = +av; bv = +bv; }
//       if (sortKey === "dateAchat") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
//       if (av < bv) return sortDir === "asc" ? -1 : 1;
//       if (av > bv) return sortDir === "asc" ? 1  : -1;
//       return 0;
//     });

//     return list;
//   }, [biens, search, filterCat, filterStatus, sortKey, sortDir]);

//   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
//   const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   const handleSort = (key: keyof Bien) => {
//     if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
//     else { setSortKey(key); setSortDir("asc"); }
//   };

//   const SortIcon = ({ k }: { k: keyof Bien }) => {
//     if (sortKey !== k) return <span className="opacity-20"><Ico.Sort /></span>;
//     return sortDir === "asc" ? <Ico.SortA /> : <Ico.SortD />;
//   };

//   const ColHeader = ({ label, k, className = "" }: { label: string; k: keyof Bien; className?: string }) => (
//     <th
//       className={`px-4 py-3 whitespace-nowrap cursor-pointer select-none group/col ${className}`}
//       onClick={() => handleSort(k)}
//     >
//       <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover/col:text-slate-400 transition-colors">
//         {label}
//         <span className={sortKey === k ? "text-sky-400" : ""}><SortIcon k={k} /></span>
//       </div>
//     </th>
//   );

//   const handleSave = (data: FormData) => {
//     if (formMode === "create") {
//       const newBien: Bien = { id: nextId(biens), ...data, valeur: parseFloat(data.valeur) || 0 };
//       setBiens(p => [newBien, ...p]);
//       showToast(`"${data.designation}" enregistré avec succès.`);
//     } else if (formMode === "edit" && editTarget) {
//       setBiens(p => p.map(b => b.id === editTarget.id ? { ...b, ...data, valeur: parseFloat(data.valeur) || b.valeur } : b));
//       showToast(`"${data.designation}" mis à jour.`);
//     }
//     setFormMode(null); setEditTarget(null);
//   };

//   const handleDelete = () => {
//     if (!deleteTarget) return;
//     setBiens(p => p.filter(b => b.id !== deleteTarget.id));
//     showToast(`Bien "${deleteTarget.designation}" supprimé.`, "error");
//     setDeleteTarget(null);
//   };

//   const handleStatusChange = (id: string, newStatus: Status) => {
//     setBiens(p => p.map(b => b.id === id ? { ...b, status: newStatus } : b));
//     showToast(`Statut mis à jour → ${STATUS_MAP[newStatus].label}`);
//     // Update detailBien if open
//     if (detailBien?.id === id) setDetailBien(prev => prev ? { ...prev, status: newStatus } : null);
//   };

//   const toggleSelect = (id: string) => setSelected(prev => {
//     const n = new Set(prev);
//     n.has(id) ? n.delete(id) : n.add(id);
//     return n;
//   });

//   const toggleAll = () => selected.size === paginated.length ? setSelected(new Set()) : setSelected(new Set(paginated.map(b => b.id)));

//   const openEdit = (b: Bien) => { setEditTarget(b); setFormMode("edit"); setDetailBien(null); };
//   const openDetail = (b: Bien) => { setDetailBien(b); };

//   const formInitial: FormData = editTarget ? { ...editTarget, valeur: String(editTarget.valeur) } : EMPTY_FORM;

//   // Export CSV
//   const handleExport = () => {
//     const headers = ["ID","Désignation","Catégorie","Marque","Modèle","Numéro de série","Département","Responsable","Date d'achat","Valeur (FCFA)","Statut","Localisation","Fin de garantie","Description"];
//     const rows = filtered.map(b => [b.id,b.designation,b.categorie,b.marque,b.modele,b.serial,b.departement,b.responsable,b.dateAchat,b.valeur,STATUS_MAP[b.status].label,b.localisation,b.garantie,`"${b.description}"`]);
//     const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
//     const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a"); a.href = url; a.download = "registre-biens.csv"; a.click();
//     URL.revokeObjectURL(url);
//     showToast(`${filtered.length} biens exportés en CSV.`);
//   };

//   return (
//     <div className="min-h-full px-7 py-6 space-y-5" style={{ fontFamily:"'DM Sans','Inter',sans-serif" }}>

//       {/* Toast */}
//       {toast && (
//         <div
//           className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white"
//           style={{
//             background: toast.type === "error" ? "#1a0a0a" : "#0f2d1f",
//             border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
//             boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
//           }}
//         >
//           <span style={{ color: toast.type === "error" ? "#f87171" : "#10b981" }}>
//             {toast.type === "error" ? "✕" : "✓"}
//           </span>
//           {toast.msg}
//         </div>
//       )}

//       {/* ── Header ── */}
//       <div className="flex items-end justify-between">
//         <div>
//           <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Registre patrimonial</p>
//           <h2 className="text-2xl font-bold text-white leading-none">Gestion des biens</h2>
//           <p className="text-sm text-slate-500 mt-1.5">
//             {biens.length} actifs · Valeur totale :{" "}
//             <span className="text-sky-400 font-semibold">{fmt(biens.reduce((s, b) => s + b.valeur, 0))}</span>
//             <span className="text-slate-700 mx-2">·</span>
//             <span className="text-slate-600 text-[11px]">
//               <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">N</kbd> nouveau bien
//               <span className="mx-1">·</span>
//               <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">Echap</kbd> fermer
//             </span>
//           </p>
//         </div>
//         <button
//           onClick={() => setFormMode("create")}
//           className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
//           style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)", boxShadow:"0 4px 16px rgba(8,145,178,0.3)" }}
//         >
//           <Ico.Plus /> Nouveau bien
//         </button>
//       </div>

//       {/* ── Stats bar ── */}
//       <StatBar biens={biens} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />

//       {/* ── Toolbar ── */}
//       <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//         {/* Search */}
//         <div className="flex items-center gap-2 flex-1 min-w-[200px]" style={{ maxWidth:300 }}>
//           <span className="text-slate-600 shrink-0"><Ico.Search /></span>
//           <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
//             placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
//           {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white transition-colors"><Ico.Close /></button>}
//         </div>

//         <div className="w-px h-5" style={{ background:"rgba(255,255,255,0.07)" }} />

//         {/* Cat filter */}
//         <select
//           className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
//           value={filterCat} onChange={e => setFilterCat(e.target.value)}
//         >
//           <option value="Toutes">Toutes catégories</option>
//           {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
//         </select>

//         <div className="flex-1" />

//         <span className="text-[11px] text-slate-600 font-medium">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>

//         {/* View toggle */}
//         <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background:"rgba(255,255,255,0.05)" }}>
//           {(["table","grid"] as ViewMode[]).map(m => (
//             <button key={m} onClick={() => setViewMode(m)}
//               className="p-1.5 rounded-md transition-all"
//               style={{ background: viewMode === m ? "rgba(14,165,233,0.2)" : "transparent", color: viewMode === m ? "#38bdf8" : "#475569" }}>
//               {m === "table" ? <Ico.Table /> : <Ico.Grid />}
//             </button>
//           ))}
//         </div>

//         <button onClick={handleExport}
//           className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
//           style={{ background:"rgba(255,255,255,0.05)" }}>
//           <Ico.Export /> Exporter CSV
//         </button>
//       </div>

//       {/* ── Bulk bar ── */}
//       {selected.size > 0 && (
//         <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl"
//           style={{ background:"rgba(14,165,233,0.08)", border:"1px solid rgba(14,165,233,0.2)" }}>
//           <span className="text-xs font-semibold text-sky-400">{selected.size} bien(s) sélectionné(s)</span>
//           <button className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
//             onClick={() => {
//               setBiens(p => p.filter(b => !selected.has(b.id)));
//               setSelected(new Set());
//               showToast(`${selected.size} biens supprimés.`, "error");
//             }}>
//             Supprimer la sélection
//           </button>
//           <button className="ml-auto text-xs text-slate-500 hover:text-white" onClick={() => setSelected(new Set())}>Annuler</button>
//         </div>
//       )}

//       {/* ── TABLE VIEW ── */}
//       {viewMode === "table" && (
//         <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
//           <div className="overflow-x-auto">
//             <table className="w-full text-left" style={{ background:"#0f1824" }}>
//               <thead>
//                 <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
//                   <th className="px-4 py-3 w-10">
//                     <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0}
//                       onChange={toggleAll} className="accent-sky-500 cursor-pointer" />
//                   </th>
//                   <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600 w-10"></th>
//                   <ColHeader label="ID"           k="id" />
//                   <ColHeader label="Désignation"  k="designation" />
//                   <ColHeader label="Catégorie"    k="categorie" />
//                   <ColHeader label="Département"  k="departement" />
//                   <ColHeader label="Valeur"       k="valeur" />
//                   <ColHeader label="Statut"       k="status" />
//                   <ColHeader label="Date achat"   k="dateAchat" />
//                   <th className="px-4 py-3 w-24"></th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {paginated.length === 0 ? (
//                   <tr>
//                     <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-600">
//                       Aucun bien ne correspond à votre recherche.
//                     </td>
//                   </tr>
//                 ) : paginated.map((b, i) => {
//                   const isSelected = selected.has(b.id);
//                   const isExpanded = expandedId === b.id;
//                   return (
//                     <>
//                       <tr
//                         key={b.id}
//                         style={{
//                           borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.04)",
//                           background: isSelected ? "rgba(14,165,233,0.05)" : isExpanded ? "rgba(14,165,233,0.03)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
//                           cursor: "default",
//                         }}
//                         className="group hover:bg-white/[0.025] transition-colors"
//                       >
//                         <td className="px-4 py-3">
//                           <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(b.id)} className="accent-sky-500 cursor-pointer" onClick={e => e.stopPropagation()} />
//                         </td>
//                         {/* Expand toggle */}
//                         <td className="px-2 py-3">
//                           <button
//                             onClick={() => setExpandedId(isExpanded ? null : b.id)}
//                             className="p-1 rounded-md text-slate-600 hover:text-slate-300 transition-colors"
//                             title={isExpanded ? "Réduire" : "Voir détails"}
//                           >
//                             {isExpanded ? <Ico.Collapse /> : <Ico.Expand />}
//                           </button>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-[11px] font-mono text-slate-500">{b.id}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div>
//                             <p className="text-sm font-medium text-white leading-none">
//                               <Highlight text={b.designation} query={search} />
//                             </p>
//                             <p className="text-[11px] text-slate-600 mt-0.5">{b.marque} {b.modele}</p>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-2">
//                             <span className="text-base">{CAT_ICONS[b.categorie] ?? "📦"}</span>
//                             <span className="text-xs text-slate-400">{b.categorie}</span>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-xs text-slate-400">
//                             <Highlight text={b.departement} query={search} />
//                           </span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-xs font-semibold text-white">{fmt(b.valeur)}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <StatusBadge status={b.status} onChange={s => handleStatusChange(b.id, s)} />
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className="text-xs text-slate-500">{fmtDate(b.dateAchat)}</span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                             <button title="Voir détails" onClick={() => openDetail(b)}
//                               className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all">
//                               <Ico.Info />
//                             </button>
//                             <button title="Modifier" onClick={() => openEdit(b)}
//                               className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all">
//                               <Ico.Edit />
//                             </button>
//                             <button title="Supprimer" onClick={() => setDeleteTarget(b)}
//                               className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
//                               <Ico.Trash />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                       {isExpanded && <ExpandedRow key={`${b.id}-exp`} bien={b} />}
//                     </>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination footer */}
//           <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)", background:"#0c1520" }}>
//             <span className="text-[11px] text-slate-600">
//               {filtered.length === 0 ? "Aucun résultat" : `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, filtered.length)} sur ${filtered.length} biens`}
//             </span>
//             {totalPages > 1 && (
//               <div className="flex items-center gap-1">
//                 <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
//                   className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 transition-colors">
//                   <Ico.PrevPage />
//                 </button>
//                 {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
//                   <button key={p} onClick={() => setPage(p)}
//                     className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
//                     style={{
//                       background: page === p ? "rgba(14,165,233,0.2)" : "transparent",
//                       color:      page === p ? "#38bdf8" : "#475569",
//                     }}>
//                     {p}
//                   </button>
//                 ))}
//                 <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
//                   className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 transition-colors">
//                   <Ico.NextPage />
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ── GRID VIEW ── */}
//       {viewMode === "grid" && (
//         <>
//           <div className="grid grid-cols-3 gap-4">
//             {paginated.length === 0 ? (
//               <div className="col-span-3 py-16 text-center text-sm text-slate-600">Aucun bien ne correspond.</div>
//             ) : paginated.map(b => {
//               const s = STATUS_MAP[b.status];
//               return (
//                 <div key={b.id}
//                   className="group rounded-2xl p-5 flex flex-col gap-3 hover:border-sky-500/20 transition-all duration-200 cursor-default"
//                   style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
//                   <div className="flex items-start justify-between">
//                     <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background:"rgba(255,255,255,0.05)" }}>
//                       {CAT_ICONS[b.categorie] ?? "📦"}
//                     </div>
//                     <StatusBadge status={b.status} onChange={ns => handleStatusChange(b.id, ns)} />
//                   </div>
//                   <div>
//                     <p className="text-sm font-semibold text-white leading-snug">
//                       <Highlight text={b.designation} query={search} />
//                     </p>
//                     <p className="text-[11px] text-slate-600 mt-0.5">{b.marque} {b.modele && `· ${b.modele}`}</p>
//                   </div>
//                   <div className="space-y-1.5">
//                     {[["Département", b.departement],["Localisation",b.localisation||"—"],["Réf.", b.id]].map(([k,v])=>(
//                       <div key={k} className="flex justify-between">
//                         <span className="text-[11px] text-slate-600">{k}</span>
//                         <span className="text-[11px] text-slate-400 font-medium">{v}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <div className="flex items-center justify-between pt-2" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
//                     <span className="text-sm font-bold text-white">{fmt(b.valeur)}</span>
//                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                       <button onClick={() => openDetail(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
//                       <button onClick={() => openEdit(b)}   className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
//                       <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//           {totalPages > 1 && (
//             <div className="flex justify-center gap-1 pt-2">
//               <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
//               {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
//                 <button key={p} onClick={() => setPage(p)}
//                   className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
//                   style={{ background: page === p ? "rgba(14,165,233,0.2)" : "transparent", color: page === p ? "#38bdf8" : "#475569" }}>
//                   {p}
//                 </button>
//               ))}
//               <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.NextPage /></button>
//             </div>
//           )}
//         </>
//       )}

//       {/* ── Modals & panels ── */}
//       {formMode && <BienDrawer mode={formMode} initial={formInitial} onClose={() => { setFormMode(null); setEditTarget(null); }} onSave={handleSave} />}
//       {deleteTarget && <DeleteModal bien={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
//       {detailBien && <DetailPanel bien={detailBien} onClose={() => setDetailBien(null)} onEdit={() => { openEdit(detailBien); }} />}
//     </div>
//   );
// }