"use client";

import { useState, useMemo, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FournisseurStats {
  totalBiens:           number;
  totalMaintenances:    number;
  coutMaintenances:     number;
  valeurBiens:          number;
  maintenancesActives:  number;
  contratExpire:        boolean;
  contratBientotFin:    boolean;
}

interface BienLight {
  id:             string;
  codeInventaire: string;
  nom:            string;
  categorie:      string | null;
  etat:           string | null;
  valeurAchat:    number | null;
  departement:    { id: string; nom: string } | null;
}

interface MaintenanceLight {
  id:       string;
  statut:   string | null;
  cout:     number | null;
  type:     string | null;
  dateDebut: string | null;
  dateFin:   string | null;
}

interface Fournisseur {
  id:          string;
  nom:         string;
  email:       string | null;
  telephone:   string | null;
  adresse:     string | null;
  type:        string | null;
  contratDebut: string | null;
  contratFin:   string | null;
  createdAt:   string;
  stats:       FournisseurStats;
  biens:       BienLight[];
  maintenances: MaintenanceLight[];
}

interface FormData {
  nom:         string;
  email:       string;
  telephone:   string;
  adresse:     string;
  type:        string;
  contratDebut: string;
  contratFin:   string;
}

type ViewMode = "grid" | "table";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_FOURN: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  maintenance:  { label:"Maintenance",  color:"#f97316", bg:"rgba(249,115,22,0.12)",  icon:"🔧" },
  informatique: { label:"Informatique", color:"#38bdf8", bg:"rgba(14,165,233,0.12)",  icon:"💻" },
  mobilier:     { label:"Mobilier",     color:"#10b981", bg:"rgba(16,185,129,0.12)",  icon:"🪑" },
  vehicule:     { label:"Véhicule",     color:"#8b5cf6", bg:"rgba(139,92,246,0.12)",  icon:"🚗" },
  equipement:   { label:"Équipement",   color:"#fbbf24", bg:"rgba(245,158,11,0.12)",  icon:"⚙️" },
  services:     { label:"Services",     color:"#ec4899", bg:"rgba(236,72,153,0.12)",  icon:"🛠️" },
  autre:        { label:"Autre",        color:"#94a3b8", bg:"rgba(148,163,184,0.12)", icon:"📦" },
};

const FOURN_COLORS = ["#0ea5e9","#8b5cf6","#10b981","#f97316","#ec4899","#f59e0b","#14b8a6","#6366f1"];

const CAT_ICONS: Record<string, string> = {
  Informatique:"💻", Mobilier:"🪑", Véhicule:"🚗", Équipement:"⚙️",
  Électroménager:"🔌", Télécommunication:"📡", Immobilier:"🏢", Autre:"📦",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CI", { style:"currency", currency:"XOF", maximumFractionDigits:0 }).format(n);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";

function daysUntil(d: string | null): number {
  if (!d) return Infinity;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function initials(nom: string) {
  return nom.split(/[\s-]/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function colorFor(index: number) { return FOURN_COLORS[index % FOURN_COLORS.length]; }

function getFournMeta(type: string | null) {
  if (!type) return TYPE_FOURN.autre;
  const key = Object.keys(TYPE_FOURN).find(k => type.toLowerCase().includes(k));
  return TYPE_FOURN[key || "autre"];
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  Plus:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Edit:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Close:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:    () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Refresh:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Table:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  Grid:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Info:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Warning:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Export:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Phone:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6.29 6.29l1.18-1.18a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Mail:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Location: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Calendar: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  SortA:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  SortD:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  Spinner:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
};

// ─── ContratBadge ─────────────────────────────────────────────────────────────

function ContratBadge({ contratFin }: { contratFin: string | null }) {
  if (!contratFin) return null;
  const days   = daysUntil(contratFin);
  const expire = days < 0;
  const soon   = days >= 0 && days < 30;

  if (!expire && !soon) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
      style={{ background: expire ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: expire ? "#f87171" : "#fbbf24" }}>
      <Ico.Warning />
      {expire ? "Contrat expiré" : `Expire dans ${days}j`}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ f, color, onClose, onEdit }: {
  f: Fournisseur; color: string; onClose: () => void; onEdit: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const meta = getFournMeta(f.type);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width:460, background:"#0a1120", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
                style={{ background:`${color}20`, color, border:`1px solid ${color}30` }}>
                {initials(f.nom)}
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">{f.nom}</h2>
                {f.type && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                    style={{ background:meta.bg, color:meta.color }}>
                    {meta.icon} {f.type}
                  </span>
                )}
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
          <ContratBadge contratFin={f.contratFin} />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 mx-5 my-4 rounded-xl overflow-hidden shrink-0"
          style={{ border:`1px solid ${color}25`, background:`${color}08` }}>
          {[
            { label:"Biens",    value:f.stats.totalBiens,        accent:color    },
            { label:"Maint.",   value:f.stats.totalMaintenances, accent:"#f97316" },
            { label:"Actives",  value:f.stats.maintenancesActives, accent:"#38bdf8" },
            { label:"Coût",     value:f.stats.coutMaintenances > 0 ? Math.round(f.stats.coutMaintenances/1000)+"k" : "0", accent:"#10b981" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="text-center px-2 py-3">
              <p className="text-base font-bold leading-none" style={{ color:accent }}>{value}</p>
              <p className="text-[10px] text-slate-600 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">

          {/* Coordonnées */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Coordonnées</p>
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
              {[
                { icon:<Ico.Mail />,     label:"Email",     value:f.email     || "—" },
                { icon:<Ico.Phone />,    label:"Téléphone", value:f.telephone || "—" },
                { icon:<Ico.Location />, label:"Adresse",   value:f.adresse   || "—" },
              ].map(({ icon, label, value }, i) => (
                <div key={label} className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none", background:i%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
                  <span className="text-slate-600 shrink-0">{icon}</span>
                  <span className="text-[11px] text-slate-600 w-20 shrink-0">{label}</span>
                  <span className="text-[11px] text-slate-300 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contrat */}
          {(f.contratDebut || f.contratFin) && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">Contrat</p>
              <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
                {[
                  ["Début",      fmtDate(f.contratDebut)],
                  ["Fin",        fmtDate(f.contratFin)],
                  ["Durée rest.", f.contratFin && daysUntil(f.contratFin) > 0 ? `${daysUntil(f.contratFin)} jours` : f.contratFin ? "Expiré" : "—"],
                ].map(([k,v],i) => (
                  <div key={k} className="flex justify-between px-4 py-2.5"
                    style={{ borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none", background:i%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
                    <span className="text-[11px] text-slate-600">{k}</span>
                    <span className="text-[11px] text-slate-300 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valeur */}
          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background:"rgba(14,165,233,0.07)", border:"1px solid rgba(14,165,233,0.15)" }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-sky-600 font-semibold">Valeur biens fournis</p>
              <p className="text-xl font-bold text-white mt-0.5">{fmt(f.stats.valeurBiens)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Coût maintenances</p>
              <p className="text-sm font-semibold text-orange-400 mt-0.5">{fmt(f.stats.coutMaintenances)}</p>
            </div>
          </div>

          {/* Biens fournis */}
          {f.biens.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">
                Biens fournis ({f.biens.length})
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
                {f.biens.slice(0, 6).map((b, i) => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom:i<Math.min(f.biens.length,6)-1?"1px solid rgba(255,255,255,0.04)":"none", background:i%2===0?"rgba(255,255,255,0.01)":"transparent" }}>
                    <span className="text-base shrink-0">{CAT_ICONS[b.categorie||""]??"📦"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white truncate">{b.nom}</p>
                      <p className="text-[10px] font-mono text-slate-600">{b.codeInventaire}</p>
                    </div>
                    {b.etat && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                        style={{ background:b.etat==="actif"?"rgba(16,185,129,0.12)":"rgba(255,255,255,0.06)", color:b.etat==="actif"?"#10b981":"#64748b" }}>
                        {b.etat}
                      </span>
                    )}
                  </div>
                ))}
                {f.biens.length > 6 && (
                  <div className="px-4 py-2 text-center text-[11px] text-slate-600"
                    style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                    + {f.biens.length - 6} autre{f.biens.length - 6 > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Maintenances récentes */}
          {f.maintenances.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold mb-3">
                Maintenances récentes
              </p>
              <div className="space-y-2">
                {f.maintenances.slice(0, 4).map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-base">{m.type === "preventive" ? "🛡️" : m.type === "corrective" ? "🔧" : "⚙️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-300 font-medium capitalize">{m.type || "Maintenance"}</p>
                      <p className="text-[10px] text-slate-600">{fmtDate(m.dateDebut)}</p>
                    </div>
                    {m.cout && <span className="text-[11px] font-semibold text-orange-400">{fmt(m.cout)}</span>}
                    {m.statut && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background:m.statut==="termine"?"rgba(16,185,129,0.12)":m.statut==="en_cours"?"rgba(14,165,233,0.12)":"rgba(255,255,255,0.06)", color:m.statut==="termine"?"#10b981":m.statut==="en_cours"?"#38bdf8":"#64748b" }}>
                        {m.statut}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
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

function FournDrawer({ mode, initial, onClose, onSave, saving }: {
  mode: "create"|"edit"; initial: FormData;
  onClose: ()=>void; onSave: (d: FormData)=>void; saving: boolean;
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
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{ width:500, background:"linear-gradient(180deg,#0f1824 0%,#0a1120 100%)", borderLeft:"1px solid rgba(255,255,255,0.07)", boxShadow:"-24px 0 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{ background:mode==="create"?"rgba(14,165,233,0.15)":"rgba(139,92,246,0.15)" }}>
              {mode==="create" ? "🏭" : "✏️"}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">{mode==="create"?"Nouveau fournisseur":"Modifier le fournisseur"}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{mode==="create"?"Ajouter un partenaire":"Mise à jour des informations"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Ico.Close /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Nom du fournisseur" required>
            <input className={iBase} placeholder="ex. Société Informatique CI" value={form.nom} onChange={e => set("nom", e.target.value)} autoFocus />
          </Field>

          <Field label="Type / Spécialité">
            <select className={iBase+" appearance-none cursor-pointer"} value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="">— Sélectionner un type —</option>
              {Object.entries(TYPE_FOURN).map(([k,v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" className={iBase} placeholder="contact@fournisseur.ci" value={form.email} onChange={e => set("email", e.target.value)} />
            </Field>
            <Field label="Téléphone">
              <input type="tel" className={iBase} placeholder="+225 0700000000" value={form.telephone} onChange={e => set("telephone", e.target.value)} />
            </Field>
          </div>

          <Field label="Adresse">
            <textarea className={iBase+" resize-none"} rows={2} placeholder="Adresse complète…" value={form.adresse} onChange={e => set("adresse", e.target.value)} />
          </Field>

          <div className="pt-2" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3">Informations contractuelles</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début du contrat">
                <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.contratDebut} onChange={e => set("contratDebut", e.target.value)} />
              </Field>
              <Field label="Fin du contrat">
                <input type="date" className={iBase} style={{ colorScheme:"dark" }} value={form.contratFin} onChange={e => set("contratFin", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Preview */}
          {form.nom.trim() && (
            <div className="rounded-xl p-4" style={{ background:"rgba(14,165,233,0.05)", border:"1px solid rgba(14,165,233,0.12)" }}>
              <p className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-3">Aperçu</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background:"rgba(14,165,233,0.15)", color:"#38bdf8", border:"1px solid rgba(14,165,233,0.2)" }}>
                  {initials(form.nom)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{form.nom}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {form.type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{ background:getFournMeta(form.type).bg, color:getFournMeta(form.type).color }}>
                        {getFournMeta(form.type).icon} {form.type}
                      </span>
                    )}
                    {form.email && <span className="text-[10px] text-slate-500">{form.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 gap-3 shrink-0" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5">Annuler</button>
          <button onClick={() => valid && onSave(form)} disabled={!valid || saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)" }}>
            {saving ? <Ico.Spinner /> : <Ico.Check />}
            {mode==="create" ? "Ajouter le fournisseur" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ f, onClose, onConfirm, loading }: {
  f: Fournisseur; onClose: ()=>void; onConfirm: ()=>void; loading: boolean;
}) {
  const hasBiens = f.stats.totalBiens > 0;
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }} onClick={loading?undefined:onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background:"#0f1824", border:"1px solid rgba(239,68,68,0.2)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:"rgba(239,68,68,0.12)", color:"#f87171" }}><Ico.Trash /></div>
          <div>
            <h3 className="text-sm font-bold text-white">Supprimer ce fournisseur ?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{f.nom}</p>
          </div>
        </div>
        {hasBiens ? (
          <div className="rounded-xl px-4 py-3 text-[12px]"
            style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)", color:"#fb923c" }}>
            ⚠ Ce fournisseur a <strong>{f.stats.totalBiens} bien(s)</strong> associé(s). Réaffectez-les d'abord.
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Cette action est <span className="text-red-400 font-semibold">irréversible</span>.
            {f.stats.totalMaintenances > 0 && ` Les ${f.stats.totalMaintenances} maintenance(s) associée(s) seront détachées.`}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <button disabled={loading} onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 transition-all" style={{ background:"rgba(255,255,255,0.05)" }}>Annuler</button>
          <button disabled={loading||hasBiens} onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background:"linear-gradient(135deg,#dc2626,#b91c1c)" }}>
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
      {Array.from({length:6}).map((_,i) => (
        <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl" style={{ background:"rgba(255,255,255,0.05)" }} />
            <div className="space-y-2 flex-1">
              <div className="h-3 rounded-lg w-3/4" style={{ background:"rgba(255,255,255,0.06)" }} />
              <div className="h-2 rounded-lg w-1/2" style={{ background:"rgba(255,255,255,0.04)" }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(j => <div key={j} className="rounded-xl py-3" style={{ background:"rgba(255,255,255,0.04)" }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [sortKey,      setSortKey]      = useState<"nom"|"totalBiens"|"coutMaintenances"|"contratFin">("nom");
  const [sortDir,      setSortDir]      = useState<"asc"|"desc">("asc");
  const [viewMode,     setViewMode]     = useState<ViewMode>("grid");
  const [formMode,     setFormMode]     = useState<"create"|"edit"|null>(null);
  const [editTarget,   setEditTarget]   = useState<Fournisseur|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fournisseur|null>(null);
  const [detailF,      setDetailF]      = useState<Fournisseur|null>(null);
  const [toast,        setToast]        = useState<{msg:string;type:"success"|"error"}|null>(null);

  const showToast = useCallback((msg:string, type:"success"|"error"="success") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),3500);
  },[]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)     params.set("search", search);
      if (filterType) params.set("type",   filterType);
      const res = await fetch(`/api/fournisseurs?${params}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setFournisseurs(Array.isArray(data) ? data : []);
    } catch (err:any) { showToast(err.message,"error"); }
    finally { setLoading(false); }
  },[search,filterType,showToast]);

  useEffect(() => { fetchAll(); },[fetchAll]);

  // Keyboard
  useEffect(() => {
    const h = (e:KeyboardEvent) => {
      if (e.key==="Escape") {
        if (detailF)      { setDetailF(null);  return; }
        if (formMode)     { setFormMode(null); setEditTarget(null); return; }
        if (deleteTarget) { setDeleteTarget(null); return; }
      }
      if (e.key==="n"&&!formMode&&!deleteTarget&&!detailF) {
        const tag=(e.target as HTMLElement).tagName;
        if (tag!=="INPUT"&&tag!=="TEXTAREA"&&tag!=="SELECT") setFormMode("create");
      }
    };
    window.addEventListener("keydown",h);
    return () => window.removeEventListener("keydown",h);
  },[detailF,formMode,deleteTarget]);

  // ── Filter + Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = fournisseurs.filter(f => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return f.nom.toLowerCase().includes(q) || (f.email||"").toLowerCase().includes(q) || (f.type||"").toLowerCase().includes(q);
    });
    return [...list].sort((a,b) => {
      let av:any, bv:any;
      if      (sortKey==="nom")               { av=a.nom.toLowerCase(); bv=b.nom.toLowerCase(); }
      else if (sortKey==="totalBiens")         { av=a.stats.totalBiens;         bv=b.stats.totalBiens; }
      else if (sortKey==="coutMaintenances")   { av=a.stats.coutMaintenances;   bv=b.stats.coutMaintenances; }
      else if (sortKey==="contratFin")         { av=a.contratFin?new Date(a.contratFin).getTime():Infinity; bv=b.contratFin?new Date(b.contratFin).getTime():Infinity; }
      if (av<bv) return sortDir==="asc"?-1:1;
      if (av>bv) return sortDir==="asc"?1:-1;
      return 0;
    });
  },[fournisseurs,search,sortKey,sortDir]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async (data:FormData) => {
    setSaving(true);
    try {
      const payload = {
        nom:         data.nom.trim(),
        email:       data.email       || null,
        telephone:   data.telephone   || null,
        adresse:     data.adresse     || null,
        type:        data.type        || null,
        contratDebut: data.contratDebut || null,
        contratFin:   data.contratFin   || null,
      };
      if (formMode==="create") {
        const res = await fetch("/api/fournisseurs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        if (!res.ok){const e=await res.json();throw new Error(e.error||"Erreur serveur");}
        showToast(`Fournisseur "${data.nom}" ajouté.`);
      } else if (editTarget) {
        const res = await fetch(`/api/fournisseurs/${editTarget.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        if (!res.ok){const e=await res.json();throw new Error(e.error||"Erreur serveur");}
        showToast(`Fournisseur "${data.nom}" mis à jour.`);
      }
      setFormMode(null); setEditTarget(null);
      await fetchAll();
    } catch(err:any){ showToast(err.message,"error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fournisseurs/${deleteTarget.id}`,{method:"DELETE"});
      if (!res.ok){const e=await res.json();throw new Error(e.error||"Erreur");}
      showToast(`Fournisseur "${deleteTarget.nom}" supprimé.`,"error");
      setDeleteTarget(null);
      if (detailF?.id===deleteTarget.id) setDetailF(null);
      await fetchAll();
    } catch(err:any){ showToast(err.message,"error"); }
    finally { setDeleting(false); }
  };

  const openEdit = (f:Fournisseur) => { setEditTarget(f); setFormMode("edit"); setDetailF(null); };

  const formInitial: FormData = editTarget ? {
    nom:         editTarget.nom,
    email:       editTarget.email       || "",
    telephone:   editTarget.telephone   || "",
    adresse:     editTarget.adresse     || "",
    type:        editTarget.type        || "",
    contratDebut: editTarget.contratDebut ? editTarget.contratDebut.split("T")[0] : "",
    contratFin:   editTarget.contratFin   ? editTarget.contratFin.split("T")[0]   : "",
  } : { nom:"", email:"", telephone:"", adresse:"", type:"", contratDebut:"", contratFin:"" };

  // ── Global stats ───────────────────────────────────────────────────────────
  const globalStats = useMemo(() => ({
    total:            fournisseurs.length,
    totalBiens:       fournisseurs.reduce((s,f)=>s+f.stats.totalBiens,0),
    totalMaint:       fournisseurs.reduce((s,f)=>s+f.stats.totalMaintenances,0),
    coutTotal:        fournisseurs.reduce((s,f)=>s+f.stats.coutMaintenances,0),
    contratsExpirant: fournisseurs.filter(f=>f.stats.contratBientotFin||f.stats.contratExpire).length,
  }),[fournisseurs]);

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ["Nom","Type","Email","Téléphone","Adresse","Biens","Maintenances","Coût total","Contrat début","Contrat fin"];
    const rows = filtered.map(f => [
      f.nom, f.type||"", f.email||"", f.telephone||"", `"${f.adresse||""}"`,
      f.stats.totalBiens, f.stats.totalMaintenances, f.stats.coutMaintenances,
      f.contratDebut?.split("T")[0]||"", f.contratFin?.split("T")[0]||""
    ]);
    const csv  = [headers,...rows].map(r=>r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download="fournisseurs.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} fournisseurs exportés.`);
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
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Partenaires & Prestataires</p>
          <h2 className="text-2xl font-bold text-white leading-none">Fournisseurs</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-slate-600"><Ico.Spinner /> Chargement…</span>
            ) : (
              <>
                {fournisseurs.length} fournisseur{fournisseurs.length>1?"s":""}
                {globalStats.contratsExpirant > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background:"rgba(245,158,11,0.12)", color:"#fbbf24" }}>
                    <Ico.Warning /> {globalStats.contratsExpirant} contrat{globalStats.contratsExpirant>1?"s":""} à renouveler
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
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-white transition-all disabled:opacity-40"
            style={{ background:"rgba(255,255,255,0.05)" }}>
            <Ico.Refresh />
          </button>
          <button onClick={handleExport} disabled={loading||filtered.length===0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all disabled:opacity-40"
            style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <Ico.Export /> CSV
          </button>
          <button onClick={() => setFormMode("create")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background:"linear-gradient(135deg,#0891b2,#0e7490)", boxShadow:"0 4px 16px rgba(8,145,178,0.3)" }}>
            <Ico.Plus /> Nouveau fournisseur
          </button>
        </div>
      </div>

      {/* ── Global stats ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Fournisseurs",    value:globalStats.total,                     accent:"#38bdf8" },
          { label:"Biens fournis",   value:globalStats.totalBiens,                accent:"#10b981" },
          { label:"Maintenances",    value:globalStats.totalMaint,                accent:"#f97316" },
          { label:"Coût maintenances", value:fmt(globalStats.coutTotal),          accent:"#8b5cf6" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-5 py-4" style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[22px] font-bold leading-none" style={{ color:s.accent }}>{loading?"—":s.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap rounded-2xl px-4 py-3"
        style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1" style={{ maxWidth:300 }}>
          <span className="text-slate-600 shrink-0"><Ico.Search /></span>
          <input className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            placeholder="Nom, email, type…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-white"><Ico.Close /></button>}
        </div>
        <div className="w-px h-5" style={{ background:"rgba(255,255,255,0.07)" }} />
        <select className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_FOURN).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <div className="w-px h-5" style={{ background:"rgba(255,255,255,0.07)" }} />
        <select className="appearance-none bg-transparent text-xs font-medium text-slate-400 outline-none cursor-pointer"
          value={sortKey} onChange={e => setSortKey(e.target.value as typeof sortKey)}>
          <option value="nom">Trier par nom</option>
          <option value="totalBiens">Trier par biens</option>
          <option value="coutMaintenances">Trier par coût</option>
          <option value="contratFin">Trier par contrat</option>
        </select>
        <button onClick={() => setSortDir(d=>d==="asc"?"desc":"asc")}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
          style={{ background:"rgba(255,255,255,0.05)" }}>
          {sortDir==="asc"?<Ico.SortA />:<Ico.SortD />}
        </button>
        <div className="flex-1" />
        {!loading && <span className="text-[11px] text-slate-600 font-medium">{filtered.length} résultat{filtered.length>1?"s":""}</span>}
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background:"rgba(255,255,255,0.05)" }}>
          {(["grid","table"] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)} className="p-1.5 rounded-md transition-all"
              style={{ background:viewMode===m?"rgba(14,165,233,0.2)":"transparent", color:viewMode===m?"#38bdf8":"#475569" }}>
              {m==="grid"?<Ico.Grid />:<Ico.Table />}
            </button>
          ))}
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode==="grid" && (
        loading ? <SkeletonGrid /> : filtered.length===0 ? (
          <div className="py-20 text-center text-slate-600 text-sm">
            {search || filterType ? "Aucun fournisseur ne correspond." : "Aucun fournisseur. Ajoutez-en un !"}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((f, idx) => {
              const color  = colorFor(idx);
              const meta   = getFournMeta(f.type);
              const expSoon = f.stats.contratBientotFin || f.stats.contratExpire;
              return (
                <div key={f.id}
                  className="group rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                  style={{ background:"#0f1824", border:`1px solid ${expSoon?"rgba(245,158,11,0.2)":"rgba(255,255,255,0.06)"}` }}
                  onClick={() => setDetailF(f)}>

                  {/* Top */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold shrink-0"
                        style={{ background:`${color}18`, color, border:`1px solid ${color}28` }}>
                        {initials(f.nom)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white leading-tight truncate">{f.nom}</h3>
                        {f.type && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                            style={{ background:meta.bg, color:meta.color }}>
                            {meta.icon} {f.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e=>e.stopPropagation()}>
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                      <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label:"Biens",  value:f.stats.totalBiens,        accent:color    },
                      { label:"Maint.", value:f.stats.totalMaintenances, accent:"#f97316" },
                      { label:"Actives",value:f.stats.maintenancesActives,accent:"#38bdf8" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl px-2 py-2.5 text-center"
                        style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                        <p className="text-base font-bold leading-none" style={{ color:s.accent }}>{s.value}</p>
                        <p className="text-[9px] text-slate-600 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contact + coût */}
                  <div className="space-y-1.5">
                    {f.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 shrink-0"><Ico.Mail /></span>
                        <span className="text-[11px] text-slate-400 truncate">{f.email}</span>
                      </div>
                    )}
                    {f.telephone && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 shrink-0"><Ico.Phone /></span>
                        <span className="text-[11px] text-slate-400">{f.telephone}</span>
                      </div>
                    )}
                    {f.stats.coutMaintenances > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[11px] text-slate-600">Coût total</span>
                        <span className="text-[11px] font-semibold text-orange-400">{fmt(f.stats.coutMaintenances)}</span>
                      </div>
                    )}
                  </div>

                  {/* Contrat */}
                  <div className="flex items-center justify-between pt-2" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                    {f.contratFin ? (
                      <div>
                        <p className="text-[9px] text-slate-600 uppercase tracking-wider">Contrat fin</p>
                        <p className="text-[11px] font-medium" style={{ color:f.stats.contratExpire?"#f87171":f.stats.contratBientotFin?"#fbbf24":"#64748b" }}>
                          {fmtDate(f.contratFin)}
                        </p>
                      </div>
                    ) : <span className="text-[11px] text-slate-700">Pas de contrat</span>}
                    {expSoon && <ContratBadge contratFin={f.contratFin} />}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode==="table" && (
        <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ background:"#0f1824" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  {["Fournisseur","Type","Contact","Biens","Maintenances","Coût total","Contrat",""].map((h,i) => (
                    <th key={i} className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:6}).map((_,i) => (
                    <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      {Array.from({length:8}).map((_,j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded-lg" style={{ width:j===0?"60%":"45%", background:"rgba(255,255,255,0.04)", animation:`pulse 1.5s ease-in-out ${i*0.1}s infinite` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length===0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-600">Aucun fournisseur ne correspond.</td></tr>
                ) : filtered.map((f, idx) => {
                  const color  = colorFor(idx);
                  const meta   = getFournMeta(f.type);
                  const expSoon = f.stats.contratBientotFin || f.stats.contratExpire;
                  return (
                    <tr key={f.id}
                      style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", background:idx%2===0?"transparent":"rgba(255,255,255,0.01)" }}
                      className="group hover:bg-white/[0.025] transition-colors cursor-pointer"
                      onClick={() => setDetailF(f)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background:`${color}18`, color, border:`1px solid ${color}25` }}>
                            {initials(f.nom)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{f.nom}</p>
                            <p className="text-[10px] text-slate-600">Depuis {fmtDate(f.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {f.type ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                            style={{ background:meta.bg, color:meta.color }}>
                            {meta.icon} {f.type}
                          </span>
                        ) : <span className="text-xs text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-400">{f.email || "—"}</p>
                        <p className="text-[10px] text-slate-600">{f.telephone || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color }}>{f.stats.totalBiens}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm font-bold text-orange-400">{f.stats.totalMaintenances}</span>
                          {f.stats.maintenancesActives > 0 && (
                            <span className="ml-2 text-[10px] text-sky-400">{f.stats.maintenancesActives} active{f.stats.maintenancesActives>1?"s":""}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-slate-300">{f.stats.coutMaintenances>0?fmt(f.stats.coutMaintenances):"—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {f.contratFin ? (
                            <p className="text-[11px]" style={{ color:f.stats.contratExpire?"#f87171":f.stats.contratBientotFin?"#fbbf24":"#64748b" }}>
                              {fmtDate(f.contratFin)}
                            </p>
                          ) : <span className="text-[11px] text-slate-700">—</span>}
                          {expSoon && <ContratBadge contratFin={f.contratFin} />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
                          <button onClick={() => setDetailF(f)} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 transition-all"><Ico.Info /></button>
                          <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"><Ico.Edit /></button>
                          <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><Ico.Trash /></button>
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

      {/* ── Modals ── */}
      {formMode && (
        <FournDrawer mode={formMode} initial={formInitial}
          onClose={() => { setFormMode(null); setEditTarget(null); }}
          onSave={handleSave} saving={saving} />
      )}
      {deleteTarget && <DeleteModal f={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} />}
      {detailF && (
        <DetailPanel
          f={detailF}
          color={colorFor(filtered.indexOf(detailF))}
          onClose={() => setDetailF(null)}
          onEdit={() => openEdit(detailF)}
        />
      )}
    </div>
  );
}