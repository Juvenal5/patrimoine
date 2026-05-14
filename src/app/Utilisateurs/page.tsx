"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "ADMIN" | "USER";
type ViewMode = "table" | "grid";
type FormMode = "create" | "edit" | null;
type SortDir = "asc" | "desc";

interface Departement {
  id: string;
  nom: string;
}

interface AffLight {
  id: string;
  statut: string | null;
  dateAffectation: string;
  datePrevisionRetour: string | null;
  dateRetour: string | null;
  commentaire: string | null;
  bien: {
    id: string;
    codeInventaire: string;
    nom: string;
    categorie: string | null;
    etat: string | null;
    departement: { id: string; nom: string } | null;
  };
}

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: UserRole;
  actif: boolean;
  createdAt: string;
  updatedAt?: string;
  departement: Departement | null;
  _count?: { affectations: number };
}

interface UserDetail extends User {
  affectations: AffLight[];
  historiques: { id: string; action: string; entite: string; date: string }[];
}

interface FormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: UserRole;
  actif: boolean;
  departementId: string;
  password: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  nom: "", prenom: "", email: "", telephone: "",
  role: "USER", actif: true, departementId: "", password: "",
};

const PAGE_SIZE = 10;

const ROLE_STYLES: Record<UserRole, { label: string; bg: string; text: string; dot: string }> = {
  ADMIN: { label: "Admin", bg: "rgba(139,92,246,0.15)", text: "#a78bfa", dot: "#8b5cf6" },
  USER: { label: "Utilisateur", bg: "rgba(14,165,233,0.12)", text: "#38bdf8", dot: "#0ea5e9" },
};

const ETAT_STYLES: Record<string, { bg: string; text: string }> = {
  actif: { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  maintenance: { bg: "rgba(249,115,22,0.12)", text: "#f97316" },
  inactif: { bg: "rgba(100,116,139,0.15)", text: "#64748b" },
  reforme: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
};

const STATUT_COLORS: Record<string, string> = {
  en_cours: "#38bdf8",
  retourne: "#10b981",
  en_attente: "#fbbf24",
  annule: "#f87171",
};

const STATUT_LABELS: Record<string, string> = {
  en_cours: "En cours",
  retourne: "Retourné",
  en_attente: "En attente",
  annule: "Annulé",
};

const CAT_ICONS: Record<string, string> = {
  Informatique: "💻", Mobilier: "🪑", Véhicule: "🚗", Équipement: "⚙️",
  Électroménager: "🔌", Télécommunication: "📡", Immobilier: "🏢", Autre: "📦",
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-CI", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateShort = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-CI", { day: "2-digit", month: "short" }) : "—";

function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["data", "users", "utilisateurs", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
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
  Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  SortA: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  SortD: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Sort: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Info: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  Refresh: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  PrevPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>,
  NextPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>,
  User: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Mail: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  Phone: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5a2 2 0 0 1 1.99-2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6.06 6.06l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.2z" /></svg>,
  Building: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  Shield: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  Calendar: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  Package: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  Eye: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  EyeOff: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  Lock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  ChevDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Toggle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7" /><circle cx="16" cy="12" r="3" /></svg>,
  Spinner: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>,
  History: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  Link: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
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
          ? <mark key={i} style={{ background: "rgba(56,189,248,0.25)", color: "#38bdf8", borderRadius: 3, padding: "0 1px" }}>{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 36 }: { user: Pick<User, "prenom" | "nom" | "role">; size?: number }) {
  const colors = user.role === "ADMIN"
    ? { bg: "rgba(139,92,246,0.2)", text: "#a78bfa" }
    : { bg: "rgba(14,165,233,0.15)", text: "#38bdf8" };
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3, background: colors.bg, color: colors.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, flexShrink: 0
    }}>
      {user.prenom[0]}{user.nom[0]}
    </div>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ users, filter, setFilter, loading }: {
  users: User[];
  filter: string;
  setFilter: (f: string) => void;
  loading: boolean;
}) {
  const counts = useMemo(() => ({
    all: users.length,
    actif: users.filter(u => u.actif).length,
    inactif: users.filter(u => !u.actif).length,
    admin: users.filter(u => u.role === "ADMIN").length,
    user: users.filter(u => u.role === "USER").length,
  }), [users]);

  const stats = [
    { key: "all", label: "Total", value: counts.all, sub: "Utilisateurs", accent: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
    { key: "actif", label: "Actifs", value: counts.actif, sub: "En service", accent: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
    { key: "inactif", label: "Inactifs", value: counts.inactif, sub: "Désactivés", accent: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
    { key: "ADMIN", label: "Admins", value: counts.admin, sub: "Droits complets", accent: "#a78bfa", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
    { key: "USER", label: "Standard", value: counts.user, sub: "Droits limités", accent: "#38bdf8", bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.2)" },
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
          <p className="text-[26px] font-bold leading-none" style={{ color: filter === s.key ? s.accent : "#fff" }}>
            {loading ? "—" : s.value}
          </p>
          <p className="text-[11px] font-semibold mt-1" style={{ color: filter === s.key ? s.accent : "#475569" }}>{s.label}</p>
          <p className="text-[10px] mt-0.5" style={{ color: filter === s.key ? s.accent + "80" : "#334155" }}>{loading ? "…" : s.sub}</p>
          {filter === s.key && <div className="mt-2 h-0.5 rounded-full" style={{ background: s.accent }} />}
        </button>
      ))}
    </div>
  );
}

// ─── Form Drawer ──────────────────────────────────────────────────────────────

function UserDrawer({ mode, initial, depts, onClose, onSave, saving }: {
  mode: "create" | "edit";
  initial: FormData;
  depts: Departement[];
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(p => ({ ...p, [k]: v }));

  const valid = form.nom.trim() && form.prenom.trim() && form.email.trim() &&
    (mode === "edit" || form.password.trim());

  const handleSubmit = async () => {
    setError("");
    if (!valid) { setError("Champs obligatoires manquants."); return; }
    try { await onSave(form); }
    catch (e: any) { setError(e.message || "Erreur lors de l'enregistrement."); }
  };

  const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

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
              <span style={{ color: mode === "create" ? "#38bdf8" : "#a78bfa", display: "flex" }}>
                <Ico.User />
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{mode === "create" ? "Nouvel utilisateur" : "Modifier l'utilisateur"}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{mode === "create" ? "Créer un compte utilisateur" : "Mettre à jour les informations"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {error && (
            <div className="px-4 py-3 rounded-xl text-[12px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          {/* Identité */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Prénom <span className="text-sky-400">*</span></label>
                <input className={iBase} placeholder="Jean" value={form.prenom} onChange={e => set("prenom", e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nom <span className="text-sky-400">*</span></label>
                <input className={iBase} placeholder="Dupont" value={form.nom} onChange={e => set("nom", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Contact</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email <span className="text-sky-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Mail /></span>
                  <input className={iBase + " pl-9"} placeholder="jean.dupont@example.com" type="email"
                    value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Téléphone</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Phone /></span>
                  <input className={iBase + " pl-9"} placeholder="+225 07 00 00 00 00"
                    value={form.telephone} onChange={e => set("telephone", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Organisation */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Organisation</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Département</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Building /></span>
                  <select className={iBase + " pl-9 appearance-none cursor-pointer"} value={form.departementId} onChange={e => set("departementId", e.target.value)}>
                    <option value="">Aucun</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Rôle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Shield /></span>
                  <select className={iBase + " pl-9 appearance-none cursor-pointer"} value={form.role} onChange={e => set("role", e.target.value as UserRole)}>
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Sécurité</p>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Mot de passe {mode === "create" && <span className="text-sky-400">*</span>}
                {mode === "edit" && <span className="text-slate-700 normal-case ml-1">(laisser vide pour ne pas changer)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><Ico.Lock /></span>
                <input className={iBase + " pl-9 pr-10"} placeholder={mode === "edit" ? "••••••••" : "Minimum 8 caractères"}
                  type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                  {showPwd ? <Ico.EyeOff /> : <Ico.Eye />}
                </button>
              </div>
            </div>
          </div>

          {/* Statut */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Statut du compte</p>
            <button type="button" onClick={() => set("actif", !form.actif)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
              style={{
                background: form.actif ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.06)",
                border: `1px solid ${form.actif ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)"}`,
              }}>
              <div className="w-10 h-5 rounded-full relative transition-all" style={{ background: form.actif ? "#10b981" : "#374151" }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.actif ? "calc(100% - 18px)" : "2px" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: form.actif ? "#10b981" : "#f87171" }}>
                  {form.actif ? "Compte actif" : "Compte désactivé"}
                </p>
                <p className="text-[11px] text-slate-600">
                  {form.actif ? "L'utilisateur peut se connecter" : "Accès bloqué"}
                </p>
              </div>
            </button>
          </div>

          {/* Aperçu */}
          {(form.prenom || form.nom) && (
            <div className="rounded-xl p-4" style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.1)" }}>
              <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider mb-3">Aperçu</p>
              <div className="flex items-center gap-3">
                <Avatar user={{ prenom: form.prenom || "?", nom: form.nom || "?", role: form.role }} size={44} />
                <div>
                  <p className="text-sm font-bold text-white">{form.prenom} {form.nom}</p>
                  <p className="text-[11px] text-slate-500">{form.email || "email@example.com"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: ROLE_STYLES[form.role].bg, color: ROLE_STYLES[form.role].text }}>
                      {ROLE_STYLES[form.role].label}
                    </span>
                    {depts.find(d => d.id === form.departementId)?.nom && (
                      <span className="text-[10px] text-slate-600">
                        {depts.find(d => d.id === form.departementId)?.nom}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">Annuler</button>
          <button onClick={handleSubmit} disabled={!valid || saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
            {saving ? <Ico.Spinner /> : <Ico.Check />}
            {mode === "create" ? "Créer l'utilisateur" : "Enregistrer"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ user, onClose, onConfirm, loading }: {
  user: User; onClose: () => void; onConfirm: (force: boolean) => void; loading: boolean;
}) {
  const affCount = user._count?.affectations ?? 0;
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={loading ? undefined : onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "#0f1824", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            <Ico.Trash />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Supprimer l'utilisateur ?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{user.prenom} {user.nom}</p>
          </div>
        </div>
        {affCount > 0 ? (
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
            Cet utilisateur a <strong>{affCount} affectation(s)</strong>. Il sera <strong>désactivé</strong> plutôt que supprimé définitivement.
          </div>
        ) : (
          <p className="text-sm text-slate-400">Cette action est irréversible. L'utilisateur sera supprimé définitivement.</p>
        )}
        <div className="flex gap-3 pt-1">
          <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 disabled:opacity-50" style={{ background: "rgba(255,255,255,0.05)" }}>Annuler</button>
          <button disabled={loading} onClick={() => onConfirm(affCount === 0)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: affCount > 0 ? "linear-gradient(135deg,#b45309,#92400e)" : "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
            {loading ? <><Ico.Spinner />{affCount > 0 ? "Désactivation…" : "Suppression…"}</> : affCount > 0 ? "Désactiver" : "Supprimer"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ user, onClose, onEdit }: {
  user: UserDetail;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState<"affectations" | "historique">("affectations");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const role = ROLE_STYLES[user.role];
  const affsEnCours = user.affectations.filter(a => a.statut === "en_cours");

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 460, background: "#0a1120", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="px-5 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <Avatar user={user} size={52} />
              <div>
                <p className="text-base font-bold text-white">{user.prenom} {user.nom}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: role.bg, color: role.text }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: role.dot }} />
                    {role.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: user.actif ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: user.actif ? "#10b981" : "#f87171" }}>
                    {user.actif ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Ico.Edit /> Modifier
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
            </div>
          </div>

          {/* Info rapide */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Biens affectés", value: affsEnCours.length, color: "#38bdf8" },
              { label: "Total affectat.", value: user._count?.affectations ?? user.affectations.length, color: "#94a3b8" },
              { label: "Département", value: user.departement?.nom || "—", color: "#a78bfa" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-base font-bold" style={{ color }}>{value}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Infos de contact */}
        <div className="mx-5 mt-4 rounded-xl overflow-hidden shrink-0" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { icon: <Ico.Phone />, label: "Téléphone", value: user.telephone || "—" },
            { icon: <Ico.Building />, label: "Département", value: user.departement?.nom || "—" },
            { icon: <Ico.Calendar />, label: "Créé le", value: fmtDate(user.createdAt) },
          ].map(({ icon, label, value }, i) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <span className="text-slate-600 shrink-0">{icon}</span>
              <span className="text-[11px] text-slate-600 w-24 shrink-0">{label}</span>
              <span className="text-[12px] text-slate-300 font-medium truncate">{value}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mt-4 rounded-xl overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {([
            { key: "affectations" as const, label: `Affectations (${user.affectations.length})` },
            { key: "historique" as const, label: `Historique (${user.historiques.length})` },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2 text-[11px] font-semibold transition-all"
              style={{
                background: tab === t.key ? "rgba(14,165,233,0.15)" : "transparent", color: tab === t.key ? "#38bdf8" : "#475569",
                borderBottom: tab === t.key ? "2px solid #0ea5e9" : "2px solid transparent"
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">

          {tab === "affectations" && (
            user.affectations.length === 0 ? (
              <div className="py-10 text-center text-slate-600 text-sm">Aucune affectation</div>
            ) : user.affectations.map(a => {
              const sColor = STATUT_COLORS[a.statut ?? ""] ?? "#64748b";
              const sLabel = STATUT_LABELS[a.statut ?? ""] ?? a.statut ?? "—";
              return (
                <div key={a.id} className="rounded-xl p-3.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{CAT_ICONS[a.bien.categorie ?? ""] ?? "📦"}</span>
                      <div>
                        <p className="text-[12px] font-semibold text-white">{a.bien.nom}</p>
                        <p className="text-[10px] font-mono text-slate-600">{a.bien.codeInventaire}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${sColor}20`, color: sColor }}>
                      {sLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-600">
                    <span className="flex items-center gap-1"><Ico.Calendar /> {fmtDateShort(a.dateAffectation)}</span>
                    {a.datePrevisionRetour && <span>→ {fmtDateShort(a.datePrevisionRetour)}</span>}
                    {a.bien.departement && <span className="flex items-center gap-1"><Ico.Building /> {a.bien.departement.nom}</span>}
                  </div>
                </div>
              );
            })
          )}

          {tab === "historique" && (
            user.historiques.length === 0 ? (
              <div className="py-10 text-center text-slate-600 text-sm">Aucun historique</div>
            ) : user.historiques.map(h => (
              <div key={h.id} className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-slate-600 mt-0.5 shrink-0"><Ico.History /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-slate-300 font-medium">
                    <span className="text-sky-400">{h.action}</span> · {h.entite}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{fmtDate(h.date)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <span className="font-mono text-[10px]">Esc</span> Fermer
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows({ cols = 7 }: { cols?: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="rounded-lg" style={{
                height: 12, width: j === 0 ? "60%" : j === 1 ? "45%" : "50%",
                background: "rgba(255,255,255,0.04)",
                animation: `pulse 1.4s ease-in-out ${i * 0.08}s infinite`,
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [depts, setDepts] = useState<Departement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch("/api/Utilisateurs"),
        fetch("/api/Dashboard/departements"),
      ]);
      if (!usersRes.ok) throw new Error("Erreur chargement utilisateurs");

      const [usersRaw, deptsRaw] = await Promise.all([
        usersRes.json(),
        deptsRes.ok ? deptsRes.json() : [],
      ]);

      setUsers(extractArray<User>(usersRaw));
      setDepts(extractArray<{ id: string; nom: string }>(deptsRaw).map(d => ({ id: d.id, nom: d.nom })));
    } catch (err: any) {
      showToast(err.message || "Erreur de chargement", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [search, filter, sortKey, sortDir]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailUser) { setDetailUser(null); return; }
        if (formMode) { setFormMode(null); setEditTarget(null); return; }
        if (deleteTarget) { setDeleteTarget(null); return; }
      }
      if (e.key === "n" && !formMode && !deleteTarget && !detailUser) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") setFormMode("create");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [detailUser, formMode, deleteTarget]);

  // ── Ouvrir le détail ──────────────────────────────────────────────────────
  const openDetail = async (user: User) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/Utilisateurs/${user.id}`);
      if (!res.ok) throw new Error();
      const data: UserDetail = await res.json();
      setDetailUser(data);
    } catch {
      showToast("Impossible de charger le détail.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Filter + Sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = users.filter(u => {
      const q = search.toLowerCase();
      const matchQ = !q
        || u.nom.toLowerCase().includes(q)
        || u.prenom.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || (u.telephone || "").toLowerCase().includes(q)
        || (u.departement?.nom || "").toLowerCase().includes(q);
      const matchF =
        filter === "all" ? true :
          filter === "actif" ? u.actif :
            filter === "inactif" ? !u.actif :
              filter === "ADMIN" ? u.role === "ADMIN" :
                filter === "USER" ? u.role === "USER" :
                  true;
      return matchQ && matchF;
    });

    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "nom") { av = `${a.prenom} ${a.nom}`; bv = `${b.prenom} ${b.nom}`; }
      else if (sortKey === "dept") { av = a.departement?.nom || ""; bv = b.departement?.nom || ""; }
      else { av = (a as any)[sortKey]; bv = (b as any)[sortKey]; }
      if (typeof av === "string" && !isNaN(Date.parse(av))) { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, filter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <span className="opacity-20"><Ico.Sort /></span>;
    return sortDir === "asc" ? <Ico.SortA /> : <Ico.SortD />;
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        nom: data.nom.trim(),
        prenom: data.prenom.trim(),
        email: data.email.trim(),
        telephone: data.telephone.trim() || null,
        role: data.role,
        actif: data.actif,
        departementId: data.departementId || null,
        ...(data.password.trim() ? { password: data.password } : {}),
      };

      if (formMode === "create") {
        const res = await fetch("/api/Utilisateurs", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, password: data.password }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur serveur"); }
        showToast("Utilisateur créé avec succès.");
      } else if (editTarget) {
        const res = await fetch(`/api/Utilisateurs/${editTarget.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur serveur"); }
        showToast("Utilisateur mis à jour.");
      }
      setFormMode(null); setEditTarget(null);
      await fetchAll();
    } finally { setSaving(false); }
  };

  const handleDelete = async (force: boolean) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/Utilisateurs/${deleteTarget.id}?force=${force}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      const data = await res.json();
      showToast(data.deactivated ? "Utilisateur désactivé (avait des affectations)." : "Utilisateur supprimé.", data.deactivated ? "success" : "error");
      setDeleteTarget(null);
      if (detailUser?.id === deleteTarget.id) setDetailUser(null);
      await fetchAll();
    } catch (err: any) {
      showToast(err.message || "Erreur.", "error");
    } finally { setDeleting(false); }
  };

  const openEdit = (u: User) => { setEditTarget(u); setFormMode("edit"); setDetailUser(null); };

  // Toggle actif rapide
  const handleToggleActif = async (u: User) => {
    const optimistic = users.map(x => x.id === u.id ? { ...x, actif: !u.actif } : x);
    setUsers(optimistic);
    try {
      const res = await fetch(`/api/Utilisateurs/${u.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: u.nom, prenom: u.prenom, email: u.email, telephone: u.telephone,
          role: u.role, actif: !u.actif, departementId: u.departement?.id || null
        }),
      });
      if (!res.ok) throw new Error();
      showToast(`${u.prenom} ${u.nom} — compte ${!u.actif ? "activé" : "désactivé"}.`);
    } catch {
      setUsers(users); // rollback
      showToast("Erreur lors de la mise à jour.", "error");
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ["ID", "Prénom", "Nom", "Email", "Téléphone", "Rôle", "Actif", "Département", "Créé le", "Affectations"];
    const rows = filtered.map(u => [
      u.id, u.prenom, u.nom, u.email, u.telephone || "",
      u.role, u.actif ? "Oui" : "Non", u.departement?.nom || "",
      u.createdAt?.split("T")[0] || "", u._count?.affectations ?? 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = "utilisateurs.csv"; el.click();
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} utilisateur(s) exporté(s).`);
  };

  const formInitial: FormData = editTarget
    ? {
      nom: editTarget.nom, prenom: editTarget.prenom, email: editTarget.email,
      telephone: editTarget.telephone || "", role: editTarget.role,
      actif: editTarget.actif, departementId: editTarget.departement?.id || "", password: ""
    }
    : EMPTY_FORM;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full px-7 py-6 space-y-5" style={{ fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

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
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Gestion des accès</p>
          <h2 className="text-2xl font-bold text-white leading-none">Utilisateurs</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner /> Chargement…</span>
            ) : (
              <>
                {users.length} utilisateur{users.length > 1 ? "s" : ""} enregistré{users.length > 1 ? "s" : ""}
                <span className="text-slate-700 mx-2">·</span>
                <span className="text-slate-600 text-[11px]">
                  <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">N</kbd> nouveau
                  <span className="mx-1">·</span>
                  <kbd className="font-mono bg-white/5 px-1 rounded text-slate-500">Echap</kbd> fermer
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-white transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <Ico.Refresh />
          </button>
          <button onClick={() => setFormMode("create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)", boxShadow: "0 4px 16px rgba(8,145,178,0.3)" }}>
            <Ico.Plus /> Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Stat bar */}
      <StatBar users={users} filter={filter} setFilter={setFilter} loading={loading} />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth: 320 }}>
          <span className="text-slate-600 shrink-0"><Ico.Search /></span>
          <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Nom, email, téléphone, département…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white"><Ico.Close /></button>}
        </div>
        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="flex-1" />
        {!loading && <span className="text-[11px] text-slate-600 font-medium">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>}
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["table", "grid"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className="p-1.5 rounded-md transition-all"
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

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ background: "#0f1824" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {([
                    { label: "Utilisateur", k: "nom" },
                    { label: "Email", k: "email" },
                    { label: "Département", k: "dept" },
                    { label: "Rôle", k: "role" },
                    { label: "Affectations", k: "aff" },
                    { label: "Statut", k: "actif" },
                    { label: "Depuis", k: "createdAt" },
                    { label: "", k: null },
                  ]).map(({ label, k }, i) => (
                    k ? (
                      <th key={i} className="px-4 py-3 whitespace-nowrap cursor-pointer select-none group/col" onClick={() => handleSort(k)}>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover/col:text-slate-400 transition-colors">
                          {label} <span className={sortKey === k ? "text-sky-400" : ""}><SortIcon k={k} /></span>
                        </div>
                      </th>
                    ) : (
                      <th key={i} className="px-4 py-3 w-8" />
                    )
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={8} />
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-600">Aucun utilisateur ne correspond.</td></tr>
                ) : paginated.map((u, i) => {
                  const role = ROLE_STYLES[u.role];
                  return (
                    <tr key={u.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                      className="group hover:bg-white/[0.025] transition-colors">

                      {/* Utilisateur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} size={34} />
                          <div>
                            <p className="text-[13px] font-semibold text-white leading-none">
                              <Highlight text={`${u.prenom} ${u.nom}`} query={search} />
                            </p>
                            <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                              <Ico.Phone />
                              <Highlight text={u.telephone || "—"} query={search} />
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-slate-400 font-mono">
                          <Highlight text={u.email} query={search} />
                        </span>
                      </td>

                      {/* Département */}
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-slate-400">
                          <Highlight text={u.departement?.nom || "—"} query={search} />
                        </span>
                      </td>

                      {/* Rôle */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: role.bg, color: role.text }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: role.dot }} />
                          {role.label}
                        </span>
                      </td>

                      {/* Affectations */}
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-semibold"
                          style={{ color: (u._count?.affectations ?? 0) > 0 ? "#38bdf8" : "#334155" }}>
                          {u._count?.affectations ?? 0}
                        </span>
                      </td>

                      {/* Statut toggle */}
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleActif(u)}
                          className="flex items-center gap-2 transition-all hover:opacity-80"
                          title={u.actif ? "Désactiver" : "Activer"}>
                          <div className="w-8 h-4 rounded-full relative transition-all" style={{ background: u.actif ? "#10b981" : "#374151" }}>
                            <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: u.actif ? "calc(100% - 14px)" : "2px" }} />
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: u.actif ? "#10b981" : "#f87171" }}>
                            {u.actif ? "Actif" : "Inactif"}
                          </span>
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-slate-600">{fmtDate(u.createdAt)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button title="Voir détail" onClick={() => openDetail(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all">
                            {detailLoading ? <Ico.Spinner /> : <Ico.Info />}
                          </button>
                          <button title="Modifier" onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                          <button title="Supprimer" onClick={() => setDeleteTarget(u)}
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
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "#0c1520" }}>
            <span className="text-[11px] text-slate-600">
              {loading ? "Chargement…" : filtered.length === 0 ? "Aucun résultat" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur ${filtered.length}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-white disabled:opacity-30"><Ico.PrevPage /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages).map((p, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span key={`e${p}`} className="text-slate-700 px-1">…</span>}
                    <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-all"
                      style={{ background: page === p ? "rgba(14,165,233,0.2)" : "transparent", color: page === p ? "#38bdf8" : "#475569" }}>{p}</button>
                  </>
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
                <div key={i} className="rounded-2xl p-5 space-y-3 animate-pulse" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)", height: 160 }} />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-600">Aucun utilisateur ne correspond.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {paginated.map(u => {
                const role = ROLE_STYLES[u.role];
                return (
                  <div key={u.id}
                    className="group rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200"
                    style={{ background: "#0f1824", border: `1px solid ${!u.actif ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}` }}>

                    {/* Top */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size={42} />
                        <div>
                          <p className="text-[13px] font-bold text-white leading-none">{u.prenom} {u.nom}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{u.departement?.nom || "—"}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                        style={{ background: role.bg, color: role.text }}>
                        {role.label}
                      </span>
                    </div>

                    {/* Contact */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Ico.Mail /><span className="truncate">{u.email}</span>
                      </div>
                      {u.telephone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Ico.Phone /><span>{u.telephone}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold" style={{ color: (u._count?.affectations ?? 0) > 0 ? "#38bdf8" : "#334155" }}>
                          {u._count?.affectations ?? 0} affectation{(u._count?.affectations ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <button onClick={() => handleToggleActif(u)}
                        className="flex items-center gap-1.5 transition-all hover:opacity-80">
                        <div className="w-7 h-3.5 rounded-full relative" style={{ background: u.actif ? "#10b981" : "#374151" }}>
                          <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all" style={{ left: u.actif ? "calc(100% - 13px)" : "2px" }} />
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: u.actif ? "#10b981" : "#f87171" }}>
                          {u.actif ? "Actif" : "Inactif"}
                        </span>
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                      <button onClick={() => openDetail(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                      <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                    </div>
                  </div>
                );
              })}
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

      {/* ── Modals & panels ── */}
      {formMode && (
        <UserDrawer
          mode={formMode}
          initial={formInitial}
          depts={depts}
          onClose={() => { setFormMode(null); setEditTarget(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
      {detailUser && (
        <DetailPanel
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => openEdit(detailUser)}
        />
      )}
    </div>
  );
}