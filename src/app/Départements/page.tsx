"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeptStats {
  totalUsers: number;
  totalBiens: number;
  biensActifs: number;
  biensMaint: number;
  biensInactifs: number;
  valeurTotale: number;
  categories: string[];
}

interface Departement {
  id: string;
  nom: string;
  description: string | null;
  responsableId: string | null;
  createdAt: string;
  stats: DeptStats;
  users: UserLight[];
  biens: BienLight[];
}

interface UserLight {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  actif?: boolean;
}

interface BienLight {
  id: string;
  etat: string | null;
  valeurAchat: number | null;
  categorie: string | null;
}

interface FormData {
  nom: string;
  description: string;
}

type SortDir = "asc" | "desc";
type ViewMode = "grid" | "table";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f97316",
  "#ec4899", "#f59e0b", "#14b8a6", "#6366f1",
];

const CAT_ICONS: Record<string, string> = {
  Informatique: "💻", Mobilier: "🪑", Véhicule: "🚗", Équipement: "⚙️",
  Électroménager: "🔌", Télécommunication: "📡", Immobilier: "🏢", Autre: "📦",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function colorForDept(index: number) {
  return DEPT_COLORS[index % DEPT_COLORS.length];
}

function initials(nom: string) {
  return nom.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Edit: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Refresh: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>,
  Users: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Package: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  SortA: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  SortD: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Sort: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  Table: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="9" x2="9" y2="21" /></svg>,
  Grid: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  Info: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  Money: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  Spinner: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>,
  PrevPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>,
  NextPage: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>,
};

// ─── Stat Card (header) ───────────────────────────────────────────────────────

function GlobalStatCard({ label, value, sub, accent, loading }: {
  label: string; value: number | string; sub: string; accent: string; loading: boolean;
}) {
  return (
    <div className="rounded-2xl px-5 py-4 flex flex-col gap-1"
      style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[26px] font-bold leading-none" style={{ color: accent }}>
        {loading ? "—" : value}
      </p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="text-[10px] text-slate-700">{loading ? "…" : sub}</p>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ dept, color, onClose, onEdit }: {
  dept: Departement;
  color: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 440, background: "#0a1120", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold"
                style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                {initials(dept.nom)}
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">{dept.nom}</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Créé le {fmtDate(dept.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Ico.Edit /> Modifier
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all">
                <Ico.Close />
              </button>
            </div>
          </div>

          {dept.description && (
            <p className="text-sm text-slate-400 leading-relaxed">{dept.description}</p>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 mx-5 my-4 rounded-xl overflow-hidden shrink-0"
          style={{ border: `1px solid ${color}25`, background: `${color}08` }}>
          {[
            { label: "Biens", value: dept.stats.totalBiens, icon: <Ico.Package />, accent: color },
            { label: "Actifs", value: dept.stats.biensActifs, icon: null, accent: "#10b981" },
            { label: "Maint.", value: dept.stats.biensMaint, icon: null, accent: "#f97316" },
            { label: "Agents", value: dept.stats.totalUsers, icon: <Ico.Users />, accent: "#8b5cf6" },
          ].map(({ label, value, accent: a }) => (
            <div key={label} className="text-center px-2 py-3">
              <p className="text-lg font-bold leading-none" style={{ color: a }}>{value}</p>
              <p className="text-[10px] text-slate-600 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">

          {/* Valeur */}
          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.15)" }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-sky-600 font-semibold">Valeur totale du parc</p>
              <p className="text-xl font-bold text-white mt-0.5">{fmt(dept.stats.valeurTotale)}</p>
            </div>
            <div className="text-sky-800 opacity-40"><Ico.Money /></div>
          </div>

          {/* Catégories */}
          {dept.stats.categories.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Catégories</p>
              <div className="flex flex-wrap gap-2">
                {dept.stats.categories.map(c => (
                  <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {CAT_ICONS[c] ?? "📦"} {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Utilisateurs */}
          {dept.users.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">
                Agents ({dept.users.length})
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {dept.users.map((u, i) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: i < dept.users.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: `${color}18`, color }}>
                      {u.prenom[0]}{u.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white leading-none">{u.prenom} {u.nom}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 truncate">{u.email}</p>
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: u.role === "ADMIN" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)", color: u.role === "ADMIN" ? "#a78bfa" : "#475569" }}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dept.users.length === 0 && dept.stats.totalBiens === 0 && (
            <div className="text-center py-8 text-slate-700 text-sm">Département vide — aucun agent ni bien rattaché.</div>
          )}
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] text-slate-700">
            Appuyez sur <kbd className="text-slate-500 font-mono">Echap</kbd> pour fermer
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Form Drawer ──────────────────────────────────────────────────────────────

const iBase = "w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-150 bg-[#0a0f1a] border border-white/[0.07] focus:border-sky-500/40";

function DeptDrawer({ mode, initial, onClose, onSave, saving }: {
  mode: "create" | "edit";
  initial: FormData;
  onClose: () => void;
  onSave: (data: FormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.nom.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width: 460, background: "linear-gradient(180deg,#0f1824 0%,#0a1120 100%)", borderLeft: "1px solid rgba(255,255,255,0.07)", boxShadow: "-24px 0 80px rgba(0,0,0,0.6)" }}>

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
              <h2 className="text-sm font-bold text-white leading-none">
                {mode === "create" ? "Nouveau département" : "Modifier le département"}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {mode === "create" ? "Créer une unité organisationnelle" : "Mettre à jour les informations"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all">
            <Ico.Close />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Nom du département<span className="text-sky-400 ml-0.5">*</span>
            </label>
            <input
              className={iBase}
              placeholder="ex. Direction Informatique"
              value={form.nom}
              onChange={e => set("nom", e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <textarea
              className={iBase + " resize-none"}
              rows={4}
              placeholder="Description des missions et responsabilités du département…"
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          {/* Preview */}
          {form.nom.trim() && (
            <div className="rounded-xl p-4" style={{ background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)" }}>
              <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-3">Aperçu</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background: "rgba(14,165,233,0.15)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.2)" }}>
                  {initials(form.nom)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{form.nom}</p>
                  {form.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{form.description}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 gap-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">
            Annuler
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid || saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)" }}>
            {saving ? <Ico.Spinner /> : <Ico.Check />}
            {mode === "create" ? "Créer le département" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ dept, onClose, onConfirm, loading }: {
  dept: Departement; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  const hasContent = dept.stats.totalUsers > 0 || dept.stats.totalBiens > 0;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={loading ? undefined : onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "#0f1824", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            <Ico.Trash />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Supprimer ce département ?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{dept.nom}</p>
          </div>
        </div>

        {hasContent ? (
          <div className="rounded-xl px-4 py-3 text-[12px]"
            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#fb923c" }}>
            ⚠ Ce département contient <strong>{dept.stats.totalUsers} agent(s)</strong> et <strong>{dept.stats.totalBiens} bien(s)</strong>. Réaffectez-les avant la suppression.
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Cette action est <span className="text-red-400 font-semibold">irréversible</span>. Le département sera définitivement supprimé.
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button disabled={loading} onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 transition-all"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            Annuler
          </button>
          <button disabled={loading || hasContent} onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}>
            {loading ? <><Ico.Spinner />Suppression…</> : "Supprimer"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div className="space-y-2 flex-1">
              <div className="h-3 rounded-lg w-3/4" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-2 rounded-lg w-1/2" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(j => (
              <div key={j} className="rounded-xl py-3" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
          <div className="h-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepartementsPage() {
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Departement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Departement | null>(null);
  const [detailDept, setDetailDept] = useState<Departement | null>(null);
  const [sortKey, setSortKey] = useState<"nom" | "totalBiens" | "totalUsers" | "valeurTotale">("nom");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departements");
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data = await res.json();
      setDepartements(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailDept) { setDetailDept(null); return; }
        if (formMode) { setFormMode(null); setEditTarget(null); return; }
        if (deleteTarget) { setDeleteTarget(null); return; }
      }
      if (e.key === "n" && !formMode && !deleteTarget && !detailDept) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") setFormMode("create");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [detailDept, formMode, deleteTarget]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = departements.filter(d => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return d.nom.toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q);
    });

    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "nom") { av = a.nom.toLowerCase(); bv = b.nom.toLowerCase(); }
      else if (sortKey === "totalBiens") { av = a.stats.totalBiens; bv = b.stats.totalBiens; }
      else if (sortKey === "totalUsers") { av = a.stats.totalUsers; bv = b.stats.totalUsers; }
      else if (sortKey === "valeurTotale") { av = a.stats.valeurTotale; bv = b.stats.valeurTotale; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [departements, search, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) => {
    if (sortKey !== k) return <span className="opacity-20"><Ico.Sort /></span>;
    return sortDir === "asc" ? <Ico.SortA /> : <Ico.SortD />;
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = { nom: data.nom.trim(), description: data.description.trim() || null };

      if (formMode === "create") {
        const res = await fetch("/api/departements", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur serveur"); }
        showToast(`Département "${data.nom}" créé avec succès.`);
      } else if (editTarget) {
        const res = await fetch(`/api/departements/${editTarget.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur serveur"); }
        showToast(`Département "${data.nom}" mis à jour.`);
      }

      setFormMode(null); setEditTarget(null);
      await fetchDepts();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/departements/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Erreur lors de la suppression"); }
      showToast(`Département "${deleteTarget.nom}" supprimé.`, "error");
      setDeleteTarget(null);
      if (detailDept?.id === deleteTarget.id) setDetailDept(null);
      await fetchDepts();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally { setDeleting(false); }
  };

  const openEdit = (d: Departement) => {
    setEditTarget(d);
    setFormMode("edit");
    setDetailDept(null);
  };

  const formInitial: FormData = editTarget
    ? { nom: editTarget.nom, description: editTarget.description || "" }
    : { nom: "", description: "" };

  // ── Global stats ───────────────────────────────────────────────────────────
  const globalStats = useMemo(() => ({
    totalDepts: departements.length,
    totalBiens: departements.reduce((s, d) => s + d.stats.totalBiens, 0),
    totalUsers: departements.reduce((s, d) => s + d.stats.totalUsers, 0),
    valeurTotale: departements.reduce((s, d) => s + d.stats.valeurTotale, 0),
  }), [departements]);

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
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Organisation</p>
          <h2 className="text-2xl font-bold text-white leading-none">Départements</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner /> Chargement…</span>
            ) : (
              <>
                {departements.length} département{departements.length > 1 ? "s" : ""}
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
          <button onClick={fetchDepts} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.05)" }} title="Actualiser">
            <Ico.Refresh />
          </button>
          <button onClick={() => setFormMode("create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#0891b2,#0e7490)", boxShadow: "0 4px 16px rgba(8,145,178,0.3)" }}>
            <Ico.Plus /> Nouveau département
          </button>
        </div>
      </div>

      {/* ── Global stats ── */}
      <div className="grid grid-cols-4 gap-3">
        <GlobalStatCard label="Départements" value={globalStats.totalDepts} sub="Unités actives" accent="#38bdf8" loading={loading} />
        <GlobalStatCard label="Agents" value={globalStats.totalUsers} sub="Tous départements" accent="#8b5cf6" loading={loading} />
        <GlobalStatCard label="Biens gérés" value={globalStats.totalBiens} sub="Parc total" accent="#10b981" loading={loading} />
        <GlobalStatCard label="Valeur totale" value={fmt(globalStats.valeurTotale)} sub="Estimation patrimoniale" accent="#f97316" loading={loading} />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3"
        style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth: 300 }}>
          <span className="text-slate-600 shrink-0"><Ico.Search /></span>
          <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Rechercher un département…"
            value={search}
            onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white transition-colors"><Ico.Close /></button>
          )}
        </div>

        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Sort selector */}
        <select
          className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
          value={sortKey}
          onChange={e => setSortKey(e.target.value as typeof sortKey)}>
          <option value="nom">Trier par nom</option>
          <option value="totalBiens">Trier par biens</option>
          <option value="totalUsers">Trier par agents</option>
          <option value="valeurTotale">Trier par valeur</option>
        </select>

        <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}
          title={sortDir === "asc" ? "Croissant" : "Décroissant"}>
          {sortDir === "asc" ? <Ico.SortA /> : <Ico.SortD />}
        </button>

        <div className="flex-1" />

        {!loading && (
          <span className="text-[11px] text-slate-600 font-medium">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        )}

        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["grid", "table"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className="p-1.5 rounded-md transition-all"
              style={{ background: viewMode === m ? "rgba(14,165,233,0.2)" : "transparent", color: viewMode === m ? "#38bdf8" : "#475569" }}>
              {m === "grid" ? <Ico.Grid /> : <Ico.Table />}
            </button>
          ))}
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === "grid" && (
        loading ? <SkeletonGrid /> : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-600 text-sm">
            {search ? "Aucun département ne correspond à votre recherche." : "Aucun département. Créez-en un !"}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((dept, idx) => {
              const color = colorForDept(idx);
              const pctActif = dept.stats.totalBiens > 0
                ? Math.round((dept.stats.biensActifs / dept.stats.totalBiens) * 100)
                : 0;

              return (
                <div key={dept.id}
                  className="group rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                  style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}
                  onClick={() => setDetailDept(dept)}>

                  {/* Top */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold shrink-0"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}>
                        {initials(dept.nom)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{dept.nom}</h3>
                        {dept.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{dept.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(dept)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all">
                        <Ico.Edit />
                      </button>
                      <button onClick={() => setDeleteTarget(dept)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                        <Ico.Trash />
                      </button>
                    </div>
                  </div>

                  {/* Stats mini-grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Biens", value: dept.stats.totalBiens, accent: color },
                      { label: "Agents", value: dept.stats.totalUsers, accent: "#8b5cf6" },
                      { label: "Actifs", value: dept.stats.biensActifs, accent: "#10b981" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl px-3 py-2.5 text-center"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <p className="text-lg font-bold leading-none" style={{ color: s.accent }}>{s.value}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Valeur */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Valeur parc</span>
                    <span className="text-xs font-semibold text-slate-300">{fmt(dept.stats.valeurTotale)}</span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] text-slate-600">Taux d'activité</span>
                      <span className="text-[10px] font-semibold" style={{ color }}>{pctActif}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pctActif}%`, background: `linear-gradient(to right, ${color}80, ${color})` }} />
                    </div>
                  </div>

                  {/* Agents avatars */}
                  {dept.users.length > 0 && (
                    <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex -space-x-2">
                        {dept.users.slice(0, 5).map(u => (
                          <div key={u.id}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 shrink-0"
                            style={{ background: `${color}20`, color, boxShadow: "#0f1824" }}>
                            {u.prenom[0]}{u.nom[0]}
                          </div>
                        ))}
                        {dept.users.length > 5 && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2"
                            style={{ background: "rgba(255,255,255,0.08)", color: "#475569", boxShadow: "#0f1824" }}>
                            +{dept.users.length - 5}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-600">
                        {dept.users.length} agent{dept.users.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ background: "#0f1824" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {([
                    ["Département", "nom"],
                    ["Agents", "totalUsers"],
                    ["Biens", "totalBiens"],
                    ["Actifs", null],
                    ["Valeur parc", "valeurTotale"],
                    ["", null],
                  ] as [string, typeof sortKey | null][]).map(([label, k], i) => (
                    k ? (
                      <th key={i} className="px-4 py-3 whitespace-nowrap cursor-pointer select-none group/col"
                        onClick={() => handleSort(k)}>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 group-hover/col:text-slate-400 transition-colors">
                          {label} <span className={sortKey === k ? "text-sky-400" : ""}><SortIcon k={k} /></span>
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
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded-lg" style={{ width: j === 0 ? "60%" : "40%", background: "rgba(255,255,255,0.04)", animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-slate-600">Aucun département ne correspond.</td></tr>
                ) : filtered.map((dept, idx) => {
                  const color = colorForDept(idx);
                  const pctActif = dept.stats.totalBiens > 0
                    ? Math.round((dept.stats.biensActifs / dept.stats.totalBiens) * 100) : 0;
                  return (
                    <tr key={dept.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                      className="group hover:bg-white/[0.025] transition-colors cursor-pointer"
                      onClick={() => setDetailDept(dept)}>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}25` }}>
                            {initials(dept.nom)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{dept.nom}</p>
                            {dept.description && <p className="text-[11px] text-slate-600 mt-0.5 max-w-xs truncate">{dept.description}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: "#8b5cf6" }}>{dept.stats.totalUsers}</span>
                          {dept.users.length > 0 && (
                            <div className="flex -space-x-1">
                              {dept.users.slice(0, 3).map(u => (
                                <div key={u.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ring-1"
                                  style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa", boxShadow: "#0f1824" }}>
                                  {u.prenom[0]}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color }}>{dept.stats.totalBiens}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pctActif}%`, background: "#10b981" }} />
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-500 w-8 text-right">{pctActif}%</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-slate-300">{fmt(dept.stats.valeurTotale)}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setDetailDept(dept)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
                          <button onClick={() => openEdit(dept)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                          <button onClick={() => setDeleteTarget(dept)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals & Panels ── */}
      {formMode && (
        <DeptDrawer
          mode={formMode}
          initial={formInitial}
          onClose={() => { setFormMode(null); setEditTarget(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          dept={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
      {detailDept && (
        <DetailPanel
          dept={detailDept}
          color={colorForDept(filtered.indexOf(detailDept))}
          onClose={() => setDetailDept(null)}
          onEdit={() => openEdit(detailDept)}
        />
      )}
    </div>
  );
}





// "use client";

// export default function Departements() {
//   return (
//     <div className="min-h-screen flex items-center justify-center" style={{ background: "#070d16" }}>
//       <div className="text-center space-y-3">
//         <div className="text-5xl">🏢</div>
//         <h1 className="text-white text-2xl font-bold">Gestion des départements</h1>
//         <p className="text-slate-500 text-sm">Page en cours de développement</p>
//       </div>
//     </div>
//   );
// }