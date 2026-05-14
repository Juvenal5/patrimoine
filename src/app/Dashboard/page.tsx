"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatItem {
  key:   string;
  label: string;
  value: number;
  delta: string;
  pos:   boolean;
}

interface Asset {
  id:         string;
  _id?:       string;
  name:       string;
  category:   string;
  department: string;
  status:     string;
  date:       string;
  value:      number;
}

interface AlerteItem {
  id:       string;
  type:     string;
  message:  string;
  severity: "high" | "medium" | "low";
  time:     string;
}

interface DeptItem {
  id:    string;
  name:  string;
  count: number;
  total: number;
}

interface ChartData {
  labels:     string[];
  values:     number[];
  highlights: number[];
}

// ─── API response types ───────────────────────────────────────────────────────

interface StatsApiResponse {
  total:             number;
  actif:             number;
  maintenance:       number;
  inactif:           number;
  reforme:           number;
  valeurTotale:      number;
  garantiesExpirant: number;
  biensNonAffectes:  number;
  acquisitionsMois:  number;
}

interface DeptApiItem {
  id:          string;
  nom:         string;
  description: string | null;
  totalBiens:  number;
  totalUsers:  number;
  valeurTotale: number;
  etatCounts:  Record<string, number>;
}

interface AlerteApiItem {
  id:      string;
  type:    string;
  niveau:  "critique" | "avertissement" | "info";
  message: string;
  date:    string | null;
  bienId:  string;
  bien:    { code: string; nom: string; departement?: string } | null;
}

interface ChartApiResponse {
  series:     { label: string; count: number; valeur: number }[];
  categories: { label: string; count: number }[];
  total:      number;
  valeur:     number;
}

interface BienApiItem {
  id:              string;
  codeInventaire:  string;
  nom:             string;
  categorie:       string | null;
  etat:            string | null;
  dateAcquisition: string | null;
  valeurAchat:     number | null;
  departement:     { id: string; nom: string } | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapStats(api: StatsApiResponse): StatItem[] {
  return [
    {
      key:   "all",
      label: "Total des biens",
      value: api.total,
      delta: `+${api.acquisitionsMois} ce mois`,
      pos:   true,
    },
    {
      key:   "actif",
      label: "Actifs",
      value: api.actif,
      delta: api.total > 0 ? `${Math.round((api.actif / api.total) * 100)}% du parc` : "0%",
      pos:   true,
    },
    {
      key:   "maintenance",
      label: "En maintenance",
      value: api.maintenance,
      delta: api.maintenance > 0 ? "À surveiller" : "Aucune",
      pos:   api.maintenance === 0,
    },
    {
      key:   "inactif",
      label: "Inactifs",
      value: api.inactif,
      delta: `${api.biensNonAffectes} non affectés`,
      pos:   false,
    },
  ];
}

function mapDepts(api: DeptApiItem[]): DeptItem[] {
  return api.map((d) => ({
    id:    d.id,
    name:  d.nom,
    count: d.etatCounts?.actif ?? 0,
    total: d.totalBiens,
  }));
}

/** Maps API niveau → UI severity */
function mapNiveau(niveau: AlerteApiItem["niveau"]): AlerteItem["severity"] {
  if (niveau === "critique")     return "high";
  if (niveau === "avertissement") return "medium";
  return "low";
}

function mapAlertes(api: AlerteApiItem[]): AlerteItem[] {
  return api.map((a) => ({
    id:       a.id,
    type:     a.type as AlerteItem["type"],
    message:  a.message,
    severity: mapNiveau(a.niveau),
    time:     a.date
      ? new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
      : "—",
  }));
}

function mapChart(api: ChartApiResponse, tab: string): ChartData {
  const series = api.series ?? [];
  if (series.length === 0) return { labels: [], values: [], highlights: [] };

  const labels     = series.map((s) => s.label);
  const values     = series.map((s) => s.count);

  // Highlight the most recent non-zero bar
  const now        = new Date();
  let   hlIndex    = -1;
  if (tab === "mois") {
    hlIndex = now.getMonth(); // 0-based
  } else if (tab === "semaine") {
    const lastNonZero = values.reduceRight((acc, v, i) => (acc === -1 && v > 0 ? i : acc), -1);
    hlIndex = lastNonZero;
  } else {
    hlIndex = values.length - 1;
  }

  return {
    labels,
    values,
    highlights: hlIndex >= 0 && hlIndex < values.length ? [hlIndex] : [],
  };
}

function mapBiens(api: BienApiItem[]): Asset[] {
  return api.map((b) => ({
    id:         b.codeInventaire,
    _id:        b.id,
    name:       b.nom,
    category:   b.categorie   ?? "Autre",
    department: b.departement?.nom ?? "—",
    status:     b.etat        ?? "inactif",
    date:       b.dateAcquisition
      ? new Date(b.dateAcquisition).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
      : "—",
    value:      b.valeurAchat ?? 0,
  }));
}

// ─── Static display helpers ───────────────────────────────────────────────────

const STAT_META: Record<string, { icon: keyof typeof Icons; accent: string; glow: string }> = {
  all:         { icon: "package", accent: "#0ea5e9", glow: "rgba(14,165,233,0.22)"  },
  actif:       { icon: "check",   accent: "#10b981", glow: "rgba(16,185,129,0.22)"  },
  maintenance: { icon: "wrench",  accent: "#f97316", glow: "rgba(249,115,22,0.22)"  },
  inactif:     { icon: "alert",   accent: "#ef4444", glow: "rgba(239,68,68,0.22)"   },
};

const DEPT_COLORS = ["#0ea5e9","#8b5cf6","#10b981","#f97316","#ec4899","#f59e0b","#14b8a6"];

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  actif:       { label: "Actif",       bg: "rgba(16,185,129,0.12)",  text: "#10b981" },
  maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)",  text: "#f97316" },
  inactif:     { label: "Inactif",     bg: "rgba(100,116,139,0.15)", text: "#64748b" },
  reforme:     { label: "Réformé",     bg: "rgba(239,68,68,0.12)",   text: "#f87171" },
};

const ALERT_STYLES: Record<string, { dot: string; border: string; bg: string }> = {
  high:   { dot: "#ef4444", border: "rgba(239,68,68,0.2)",  bg: "rgba(239,68,68,0.04)"  },
  medium: { dot: "#f97316", border: "rgba(249,115,22,0.2)", bg: "rgba(249,115,22,0.04)" },
  low:    { dot: "#0ea5e9", border: "rgba(14,165,233,0.2)", bg: "rgba(14,165,233,0.04)" },
};

const fmtFCFA = (v: number) =>
  new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(v);

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  package: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  check:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  wrench:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  alert:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  trendUp: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  trendDn: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  export:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  filter:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  sort:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  sortUp:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  x:       () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  close:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  spinner: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

// ─── Custom hook: animated counter ───────────────────────────────────────────

function useCounter(target: number, duration = 1000, delay = 0): number {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick  = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const ease     = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(ease * target));
        if (progress < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, delay]);
  return count;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ stat, active, onClick }: { stat: StatItem; active: boolean; onClick: () => void }) {
  const meta  = STAT_META[stat.key] ?? STAT_META.all;
  const count = useCounter(stat.value, 1000, 200);
  const Icon  = Icons[meta.icon];

  return (
    <div onClick={onClick} className="relative rounded-2xl p-5 overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        background: "#0f1824",
        border:     active ? `1.5px solid ${meta.accent}60` : "1px solid rgba(255,255,255,0.06)",
        boxShadow:  active ? `0 0 20px ${meta.glow}` : "none",
        transform:  active ? "scale(1.02)" : "scale(1)",
      }}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
        style={{ background: meta.glow, opacity: active ? 0.4 : 0.15 }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: meta.accent + (active ? "28" : "18"), color: meta.accent }}>
        <Icon />
      </div>
      <p className="text-[28px] font-bold text-white leading-none tracking-tight">{count}</p>
      <p className="text-[11px] text-slate-500 mt-1.5 mb-2 font-medium">{stat.label}</p>
      <div className="flex items-center gap-1.5">
        <span style={{ color: stat.pos ? "#10b981" : "#f97316" }}>
          {stat.pos ? <Icons.trendUp /> : <Icons.trendDn />}
        </span>
        <span className="text-[11px] font-medium" style={{ color: stat.pos ? "#10b981" : "#f97316" }}>
          {stat.delta}
        </span>
      </div>
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: meta.accent }} />}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: ChartData | null }) {
  const [mounted,  setMounted]  = useState(false);
  const [tooltip,  setTooltip]  = useState<number | null>(null);

  useEffect(() => {
    if (!data) return;
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, [data]);

  if (!data || data.values.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-slate-700 text-xs">
        {data ? "Aucune donnée pour cette période" : "Chargement…"}
      </div>
    );
  }

  const maxVal = Math.max(...data.values, 1);

  return (
    <div className="flex gap-3">
      {/* ✅ FIX: utiliser l'index comme clé au lieu de la valeur n
          Les valeurs arrondies peuvent être identiques (ex: maxVal petit →
          Math.round(max*0.4) === Math.round(max*0.2)), ce qui causait des clés dupliquées. */}
      <div className="flex flex-col justify-between pb-6 text-right">
        {[maxVal, Math.round(maxVal * 0.7), Math.round(maxVal * 0.4), Math.round(maxVal * 0.2), 0].map((n, i) => (
          <span key={i} className="text-[9px] text-slate-700 leading-none w-4">{n}</span>
        ))}
      </div>
      <div className="flex-1">
        <div className="flex items-end gap-1.5 h-36" style={{ position: "relative" }}>
          {data.values.map((v, i) => {
            const highlight = data.highlights.includes(i);
            const heightPct = mounted ? (v / maxVal) * 100 : 0;
            return (
              <div key={i} className="flex flex-col items-center flex-1 h-full justify-end gap-1"
                onMouseEnter={() => setTooltip(i)}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: "default", position: "relative" }}>
                {tooltip === i && (
                  <div className="absolute text-[10px] font-semibold rounded-md px-1.5 py-0.5 pointer-events-none z-10"
                    style={{ background: "#1e2d42", color: "#e2e8f0", bottom: "calc(100% + 4px)", whiteSpace: "nowrap" }}>
                    {v} acquisition{v !== 1 ? "s" : ""}
                  </div>
                )}
                <div className="w-full rounded-t-md" style={{
                  height:           `${heightPct}%`,
                  minHeight:        v > 0 ? 3 : 0,
                  transition:       "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                  transitionDelay:  `${i * 35}ms`,
                  background:       highlight
                    ? "linear-gradient(to top, #0369a1, #38bdf8)"
                    : tooltip === i
                      ? "rgba(14,165,233,0.28)"
                      : "rgba(14,165,233,0.14)",
                  boxShadow: highlight ? "0 0 12px rgba(14,165,233,0.35)" : "none",
                }} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 mt-2">
          {data.labels.map((label, i) => (
            <span key={i} className="flex-1 text-center"
              style={{ fontSize: "9px", color: data.highlights.includes(i) ? "#38bdf8" : "#374151" }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

interface AddFormState {
  name: string; category: string; departmentId: string; value: string; status: string;
  dateAchat: string;
}

function AddModal({ depts, onClose, onAdd }: {
  depts:   DeptItem[];
  onClose: () => void;
  onAdd:   (form: AddFormState) => Promise<void>;
}) {
  const [form,   setForm]   = useState<AddFormState>({
    name: "", category: "Informatique",
    departmentId: depts[0]?.id ?? "",
    value: "", status: "actif",
    dateAchat: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k: keyof AddFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.value) { setError("Désignation et valeur sont obligatoires."); return; }
    setSaving(true);
    setError("");
    try {
      await onAdd(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0a1219", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "#e2e8f0", padding: "9px 12px",
    fontSize: 12, outline: "none", boxSizing: "border-box",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white">Ajouter un bien</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <Icons.close />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px]"
            style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1.5">Désignation *</label>
            <input style={inputStyle} placeholder='Ex : MacBook Pro 16"' value={form.name} onChange={set("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1.5">Catégorie</label>
              <select style={inputStyle} value={form.category} onChange={set("category")}>
                {["Informatique","Équipement","Mobilier","Véhicule","Télécommunication","Électroménager","Autre"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1.5">Département</label>
              <select style={inputStyle} value={form.departmentId} onChange={set("departmentId")}>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1.5">Valeur (FCFA) *</label>
              <input style={inputStyle} placeholder="Ex : 500000" type="number" min="0"
                value={form.value} onChange={set("value")} />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1.5">Statut</label>
              <select style={inputStyle} value={form.status} onChange={set("status")}>
                <option value="actif">Actif</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1.5">Date d'acquisition</label>
            <input type="date" style={{ ...inputStyle, colorScheme: "dark" }}
              value={form.dateAchat} onChange={set("dateAchat")} />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.value}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}>
            {saving ? <><Icons.spinner /> Enregistrement…</> : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState<"semaine" | "mois" | "annee">("mois");
  const [activeFilter, setActiveFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [sortKey,      setSortKey]      = useState("date");
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");
  const [showModal,    setShowModal]    = useState(false);
  const [showAll,      setShowAll]      = useState(false);
  const [activeDept,   setActiveDept]   = useState<string | null>(null);
  const [now,          setNow]          = useState(new Date());

  // ── Server data ───────────────────────────────────────────────────────────
  const [stats,      setStats]      = useState<StatItem[]>([]);
  const [chartData,  setChartData]  = useState<ChartData | null>(null);
  const [depts,      setDepts]      = useState<DeptItem[]>([]);
  const [assets,     setAssets]     = useState<Asset[]>([]);
  const [totalBiens, setTotalBiens] = useState(0);
  const [alertes,    setAlertes]    = useState<AlerteItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [rawStats,   setRawStats]   = useState<StatsApiResponse | null>(null);

  // ── Clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // ── Initial load: stats + depts + alertes ────────────────────────────────
  useEffect(() => {
    async function loadInitial() {
      try {
        const [statsRes, deptsRes, alertesRes] = await Promise.all([
          fetch("/api/Dashboard/stats"),
          fetch("/api/Dashboard/departements"),
          fetch("/api/alertes"),
        ]);

        // Stats
        if (statsRes.ok) {
          const s: StatsApiResponse = await statsRes.json();
          setRawStats(s);
          setStats(mapStats(s));
        }

        // Depts
        if (deptsRes.ok) {
          const d: DeptApiItem[] = await deptsRes.json();
          setDepts(mapDepts(Array.isArray(d) ? d : []));
        }

        // Alertes
        if (alertesRes.ok) {
          const a: { alertes: AlerteApiItem[] } = await alertesRes.json();
          setAlertes(mapAlertes(a.alertes ?? []));
        }
      } catch (err) {
        console.error("loadInitial error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // ── Chart: reload on tab change ───────────────────────────────────────────
  useEffect(() => {
    setChartData(null);
    const period = tab === "semaine" ? "semaine" : tab === "annee" ? "annee" : "mois";
    fetch(`/api/Dashboard/acquisitions?period=${period}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: ChartApiResponse) => setChartData(mapChart(d, tab)))
      .catch((err) => {
        console.error("Chart fetch error:", err);
        setChartData({ labels: [], values: [], highlights: [] });
      });
  }, [tab]);

  // ── Biens: reload on filter / search / sort (debounced) ──────────────────
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          sortKey: sortKey === "date" ? "dateAchat" : sortKey,
          sortDir,
          limit:   showAll ? "200" : "50",
        });
        if (activeFilter !== "all") params.set("etat",   activeFilter);
        if (search.trim())          params.set("search", search.trim());

        const res  = await fetch(`/api/biens?${params}`, { signal: controller.signal });
        if (!res.ok) return;
        const data: BienApiItem[] = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setAssets(mapBiens(arr));
        setTotalBiens(arr.length);
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") console.error("Biens fetch error:", err);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [activeFilter, search, sortKey, sortDir, showAll]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleStatClick = (key: string) => {
    setActiveFilter((prev) => (prev === key ? "all" : key));
    setShowAll(false);
    setSearch("");
  };

  const handleAdd = async (form: AddFormState) => {
    const res = await fetch("/api/biens", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        nom:             form.name.trim(),
        categorie:       form.category,
        departementId:   form.departmentId || null,
        valeurAchat:     parseFloat(form.value) || 0,
        etat:            form.status,
        dateAcquisition: form.dateAchat || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Erreur serveur");
    }
    const newBien: BienApiItem = await res.json();
    // Optimistic prepend
    setAssets((prev) => [mapBiens([newBien])[0], ...prev]);
    setTotalBiens((n) => n + 1);
    // Refresh stats silently
    fetch("/api/Dashboard/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((s) => { if (s) { setRawStats(s); setStats(mapStats(s)); } });
  };

  const dismissAlerte = useCallback((id: string) => {
    setAlertes((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayed    = showAll ? assets : assets.slice(0, 5);
  const activeCount  = rawStats?.actif       ?? stats.find((s) => s.key === "actif")?.value       ?? 0;
  const maintCount   = rawStats?.maintenance ?? stats.find((s) => s.key === "maintenance")?.value ?? 0;
  const inactifCount = rawStats?.inactif     ?? stats.find((s) => s.key === "inactif")?.value     ?? 0;
  const totalCount   = rawStats?.total       ?? stats.find((s) => s.key === "all")?.value         ?? 0;
  const activityRate = totalCount > 0 ? Math.round((activeCount  / totalCount) * 100) : 0;
  const affectRate   = totalCount > 0 ? Math.round(((totalCount - inactifCount) / totalCount) * 100) : 0;

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <span className="opacity-20"><Icons.sort /></span>;
    return sortDir === "asc" ? <Icons.sortUp /> : <Icons.sort />;
  };

  const ColHeader = ({ label, k, className = "" }: { label: string; k: string; className?: string }) => (
    <span className={`text-[10px] font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1 cursor-pointer hover:text-slate-400 transition-colors select-none ${className}`}
      onClick={() => handleSort(k)}>
      {label} <SortIcon k={k} />
    </span>
  );

  const fmtDate = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const fmtTime = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full px-7 py-6 space-y-6" style={{ fontFamily: "'DM Sans','Inter',sans-serif" }}>

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Aperçu général</p>
          <h2 className="text-2xl font-bold text-white leading-none">Tableau de bord</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Vue d'ensemble du patrimoine ·{" "}
            <span className="text-slate-600">{fmtDate} — {fmtTime}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}>
            <Icons.plus /> Ajouter un bien
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
            style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Icons.export /> Exporter
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(null).map((_, i) => (
              <div key={i} className="rounded-2xl p-5 animate-pulse"
                style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)", height: 130 }} />
            ))
          : stats.map((stat) => (
              <StatCard key={stat.key} stat={stat} active={activeFilter === stat.key}
                onClick={() => handleStatClick(stat.key)} />
            ))
        }
      </div>

      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 -mt-2">
          <div className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-2"
            style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", color: "#38bdf8" }}>
            <Icons.filter />
            Filtre actif : {stats.find((s) => s.key === activeFilter)?.label}
            <button onClick={() => setActiveFilter("all")} className="ml-1 opacity-70 hover:opacity-100">
              <Icons.x />
            </button>
          </div>
          <span className="text-[11px] text-slate-600">{totalBiens} résultat{totalBiens !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Bar chart */}
        <div className="col-span-3 rounded-2xl p-5"
          style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white leading-none">Acquisitions</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {tab === "semaine" ? "Cette semaine" : tab === "mois" ? `Par mois — ${now.getFullYear()}` : "Par année"}
              </p>
            </div>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              {(["semaine", "mois", "annee"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-3 py-1.5 text-[11px] font-medium transition-all"
                  style={{ background: tab === t ? "rgba(14,165,233,0.15)" : "transparent", color: tab === t ? "#38bdf8" : "#475569" }}>
                  {t === "semaine" ? "Semaine" : t === "mois" ? "Mois" : "Année"}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={chartData} />
        </div>

        {/* Dept breakdown */}
        <div className="col-span-2 rounded-2xl p-5"
          style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white leading-none">Par département</h3>
              <p className="text-[11px] text-slate-500 mt-1">Répartition des actifs</p>
            </div>
            {activeDept && (
              <button onClick={() => setActiveDept(null)}
                className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                <Icons.x /> Reset
              </button>
            )}
          </div>

          {depts.length === 0 ? (
            <div className="py-8 text-center text-slate-700 text-xs">
              {loading ? "Chargement…" : "Aucun département"}
            </div>
          ) : (
            <div className="space-y-3.5">
              {depts.map((dept, idx) => {
                const pct      = dept.total > 0 ? Math.round((dept.count / dept.total) * 100) : 0;
                const isActive = activeDept === dept.name;
                const color    = DEPT_COLORS[idx % DEPT_COLORS.length];
                return (
                  <div key={dept.id} className="cursor-pointer"
                    onClick={() => setActiveDept(isActive ? null : dept.name)}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0 transition-transform"
                          style={{ background: color, transform: isActive ? "scale(1.4)" : "scale(1)", boxShadow: isActive ? `0 0 6px ${color}` : "none" }} />
                        <span className="text-[12px] font-medium transition-colors"
                          style={{ color: isActive ? "#fff" : "#cbd5e1" }}>
                          {dept.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {dept.count} <span className="text-slate-700">/ {dept.total}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden"
                      style={{ background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{
                        width:      `${pct}%`,
                        background: color,
                        transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                        opacity:    activeDept && !isActive ? 0.3 : 1,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-5 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {[
              { val: totalCount,    label: "Total",   color: "#fff"    },
              { val: activeCount,   label: "Actifs",  color: "#10b981" },
              { val: maintCount,    label: "Maint.",  color: "#f97316" },
              { val: alertes.length, label: "Alertes", color: "#ef4444" },
            ].map(({ val, label, color }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold" style={{ color }}>{val}</p>
                <p className="text-[10px] text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Assets table */}
        <div className="col-span-3 rounded-2xl p-5"
          style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white leading-none">
                {activeFilter === "all" ? "Acquisitions récentes" : stats.find((s) => s.key === activeFilter)?.label ?? ""}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">{totalBiens} bien{totalBiens !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-slate-600"><Icons.search /></span>
                <input
                  className="bg-transparent text-[11px] text-slate-300 outline-none placeholder:text-slate-700 w-28"
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowAll(true); }}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400">
                    <Icons.x />
                  </button>
                )}
              </div>
              {!showAll && totalBiens > 5 && (
                <button onClick={() => setShowAll(true)}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors text-slate-400 hover:text-sky-400"
                  style={{ background: "rgba(14,165,233,0.08)" }}>
                  Voir tout →
                </button>
              )}
            </div>
          </div>

          {assets.length === 0 ? (
            <div className="py-10 text-center text-slate-600 text-sm">
              {loading ? <span className="inline-flex items-center gap-2"><Icons.spinner /> Chargement…</span> : "Aucun résultat"}
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="grid grid-cols-12 gap-2 px-3 pb-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <ColHeader label="Code"   k="id"         className="col-span-2" />
                <ColHeader label="Désign." k="name"      className="col-span-3" />
                <ColHeader label="Dept"   k="department" className="col-span-2" />
                <ColHeader label="Date"   k="date"       className="col-span-2" />
                <ColHeader label="Statut" k="status"     className="col-span-1" />
                <ColHeader label="Valeur" k="value"      className="col-span-2" />
              </div>

              {displayed.map((item) => {
                const s = STATUS_STYLES[item.status] ?? STATUS_STYLES.inactif;
                return (
                  <div key={item._id ?? item.id}
                    className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors items-center">
                    <span className="col-span-2 text-[11px] font-mono text-slate-500 truncate">{item.id}</span>
                    <div className="col-span-3">
                      <p className="text-[12px] font-medium text-white leading-none truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{item.category}</p>
                    </div>
                    <span className="col-span-2 text-[11px] text-slate-400 truncate">{item.department}</span>
                    <span className="col-span-2 text-[10px] text-slate-500">{item.date}</span>
                    <div className="col-span-1">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: s.bg, color: s.text }}>
                        {s.label}
                      </span>
                    </div>
                    <span className="col-span-2 text-[11px] font-semibold text-slate-300 text-right">
                      {fmtFCFA(item.value)}
                    </span>
                  </div>
                );
              })}

              {!showAll && totalBiens > 5 && (
                <div className="pt-2 text-center">
                  <button onClick={() => setShowAll(true)}
                    className="text-[11px] text-slate-600 hover:text-sky-400 transition-colors">
                    + {totalBiens - 5} bien{totalBiens - 5 > 1 ? "s" : ""} supplémentaire{totalBiens - 5 > 1 ? "s" : ""}
                  </button>
                </div>
              )}
              {showAll && totalBiens > 5 && (
                <div className="pt-2 text-center">
                  <button onClick={() => setShowAll(false)}
                    className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
                    Réduire ↑
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alertes */}
        <div className="col-span-2 rounded-2xl p-5"
          style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white leading-none">Alertes & notifications</h3>
              <p className="text-[11px] text-slate-500 mt-1">Éléments nécessitant attention</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
              {alertes.length} active{alertes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {alertes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl text-center"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                <Icons.check />
              </div>
              <p className="text-[12px] text-emerald-500 font-medium">Tout est en ordre</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Aucune alerte active</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {alertes.map((alerte) => {
                const s = ALERT_STYLES[alerte.severity] ?? ALERT_STYLES.low;
                return (
                  <div key={alerte.id} className="flex gap-3 p-3 rounded-xl group/alert"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1"
                      style={{ background: s.dot, boxShadow: `0 0 5px ${s.dot}` }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-300 leading-snug">{alerte.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{alerte.time}</p>
                    </div>
                    <button onClick={() => dismissAlerte(alerte.id)}
                      className="text-slate-700 hover:text-slate-400 opacity-0 group-hover/alert:opacity-100 transition-all shrink-0 mt-0.5">
                      <Icons.x />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 grid grid-cols-2 gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="rounded-xl p-3 text-center"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.12)" }}>
              <p className="text-lg font-bold" style={{ color: "#10b981" }}>{activityRate}%</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Taux d'activité</p>
            </div>
            <div className="rounded-xl p-3 text-center"
              style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.12)" }}>
              <p className="text-lg font-bold" style={{ color: "#38bdf8" }}>{affectRate}%</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Taux d'affectation</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <AddModal depts={depts} onClose={() => setShowModal(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}





// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface StatItem {
//   key:   string;
//   label: string;
//   value: number;
//   delta: string;
//   pos:   boolean;
// }

// interface Asset {
//   id:         string;
//   _id?:       string;
//   name:       string;
//   category:   string;
//   department: string;
//   status:     string;
//   date:       string;
//   value:      number;
// }

// interface AlerteItem {
//   id:       string;
//   type:     string;
//   message:  string;
//   severity: "high" | "medium" | "low";
//   time:     string;
// }

// interface DeptItem {
//   id:    string;
//   name:  string;
//   count: number;
//   total: number;
// }

// interface ChartData {
//   labels:     string[];
//   values:     number[];
//   highlights: number[];
// }

// // ─── API response types ───────────────────────────────────────────────────────

// interface StatsApiResponse {
//   total:             number;
//   actif:             number;
//   maintenance:       number;
//   inactif:           number;
//   reforme:           number;
//   valeurTotale:      number;
//   garantiesExpirant: number;
//   biensNonAffectes:  number;
//   acquisitionsMois:  number;
// }

// interface DeptApiItem {
//   id:          string;
//   nom:         string;
//   description: string | null;
//   totalBiens:  number;
//   totalUsers:  number;
//   valeurTotale: number;
//   etatCounts:  Record<string, number>;
// }

// interface AlerteApiItem {
//   id:      string;
//   type:    string;
//   niveau:  "critique" | "avertissement" | "info";
//   message: string;
//   date:    string | null;
//   bienId:  string;
//   bien:    { code: string; nom: string; departement?: string } | null;
// }

// interface ChartApiResponse {
//   series:     { label: string; count: number; valeur: number }[];
//   categories: { label: string; count: number }[];
//   total:      number;
//   valeur:     number;
// }

// interface BienApiItem {
//   id:              string;
//   codeInventaire:  string;
//   nom:             string;
//   categorie:       string | null;
//   etat:            string | null;
//   dateAcquisition: string | null;
//   valeurAchat:     number | null;
//   departement:     { id: string; nom: string } | null;
// }

// // ─── Mappers ──────────────────────────────────────────────────────────────────

// function mapStats(api: StatsApiResponse): StatItem[] {
//   return [
//     {
//       key:   "all",
//       label: "Total des biens",
//       value: api.total,
//       delta: `+${api.acquisitionsMois} ce mois`,
//       pos:   true,
//     },
//     {
//       key:   "actif",
//       label: "Actifs",
//       value: api.actif,
//       delta: api.total > 0 ? `${Math.round((api.actif / api.total) * 100)}% du parc` : "0%",
//       pos:   true,
//     },
//     {
//       key:   "maintenance",
//       label: "En maintenance",
//       value: api.maintenance,
//       delta: api.maintenance > 0 ? "À surveiller" : "Aucune",
//       pos:   api.maintenance === 0,
//     },
//     {
//       key:   "inactif",
//       label: "Inactifs",
//       value: api.inactif,
//       delta: `${api.biensNonAffectes} non affectés`,
//       pos:   false,
//     },
//   ];
// }

// function mapDepts(api: DeptApiItem[]): DeptItem[] {
//   return api.map((d) => ({
//     id:    d.id,
//     name:  d.nom,
//     count: d.etatCounts?.actif ?? 0,
//     total: d.totalBiens,
//   }));
// }

// /** Maps API niveau → UI severity */
// function mapNiveau(niveau: AlerteApiItem["niveau"]): AlerteItem["severity"] {
//   if (niveau === "critique")     return "high";
//   if (niveau === "avertissement") return "medium";
//   return "low";
// }

// function mapAlertes(api: AlerteApiItem[]): AlerteItem[] {
//   return api.map((a) => ({
//     id:       a.id,
//     type:     a.type as AlerteItem["type"],
//     message:  a.message,
//     severity: mapNiveau(a.niveau),
//     time:     a.date
//       ? new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
//       : "—",
//   }));
// }

// function mapChart(api: ChartApiResponse, tab: string): ChartData {
//   const series = api.series ?? [];
//   if (series.length === 0) return { labels: [], values: [], highlights: [] };

//   const labels     = series.map((s) => s.label);
//   const values     = series.map((s) => s.count);

//   // Highlight the most recent non-zero bar
//   const now        = new Date();
//   let   hlIndex    = -1;
//   if (tab === "mois") {
//     hlIndex = now.getMonth(); // 0-based
//   } else if (tab === "semaine") {
//     const lastNonZero = values.reduceRight((acc, v, i) => (acc === -1 && v > 0 ? i : acc), -1);
//     hlIndex = lastNonZero;
//   } else {
//     hlIndex = values.length - 1;
//   }

//   return {
//     labels,
//     values,
//     highlights: hlIndex >= 0 && hlIndex < values.length ? [hlIndex] : [],
//   };
// }

// function mapBiens(api: BienApiItem[]): Asset[] {
//   return api.map((b) => ({
//     id:         b.codeInventaire,
//     _id:        b.id,
//     name:       b.nom,
//     category:   b.categorie   ?? "Autre",
//     department: b.departement?.nom ?? "—",
//     status:     b.etat        ?? "inactif",
//     date:       b.dateAcquisition
//       ? new Date(b.dateAcquisition).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
//       : "—",
//     value:      b.valeurAchat ?? 0,
//   }));
// }

// // ─── Static display helpers ───────────────────────────────────────────────────

// const STAT_META: Record<string, { icon: keyof typeof Icons; accent: string; glow: string }> = {
//   all:         { icon: "package", accent: "#0ea5e9", glow: "rgba(14,165,233,0.22)"  },
//   actif:       { icon: "check",   accent: "#10b981", glow: "rgba(16,185,129,0.22)"  },
//   maintenance: { icon: "wrench",  accent: "#f97316", glow: "rgba(249,115,22,0.22)"  },
//   inactif:     { icon: "alert",   accent: "#ef4444", glow: "rgba(239,68,68,0.22)"   },
// };

// const DEPT_COLORS = ["#0ea5e9","#8b5cf6","#10b981","#f97316","#ec4899","#f59e0b","#14b8a6"];

// const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
//   actif:       { label: "Actif",       bg: "rgba(16,185,129,0.12)",  text: "#10b981" },
//   maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)",  text: "#f97316" },
//   inactif:     { label: "Inactif",     bg: "rgba(100,116,139,0.15)", text: "#64748b" },
//   reforme:     { label: "Réformé",     bg: "rgba(239,68,68,0.12)",   text: "#f87171" },
// };

// const ALERT_STYLES: Record<string, { dot: string; border: string; bg: string }> = {
//   high:   { dot: "#ef4444", border: "rgba(239,68,68,0.2)",  bg: "rgba(239,68,68,0.04)"  },
//   medium: { dot: "#f97316", border: "rgba(249,115,22,0.2)", bg: "rgba(249,115,22,0.04)" },
//   low:    { dot: "#0ea5e9", border: "rgba(14,165,233,0.2)", bg: "rgba(14,165,233,0.04)" },
// };

// const fmtFCFA = (v: number) =>
//   new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(v);

// // ─── Icons ────────────────────────────────────────────────────────────────────

// const Icons = {
//   package: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
//   check:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
//   wrench:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
//   alert:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
//   trendUp: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
//   trendDn: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
//   export:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
//   filter:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
//   plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
//   search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
//   sort:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   sortUp:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
//   x:       () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   close:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   spinner: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
//       <path d="M21 12a9 9 0 1 1-6.219-8.56" />
//     </svg>
//   ),
// };

// // ─── Custom hook: animated counter ───────────────────────────────────────────

// function useCounter(target: number, duration = 1000, delay = 0): number {
//   const [count, setCount] = useState(0);
//   const raf = useRef<number | null>(null);
//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       const start = performance.now();
//       const tick  = (now: number) => {
//         const progress = Math.min((now - start) / duration, 1);
//         const ease     = 1 - Math.pow(1 - progress, 3);
//         setCount(Math.round(ease * target));
//         if (progress < 1) raf.current = requestAnimationFrame(tick);
//       };
//       raf.current = requestAnimationFrame(tick);
//     }, delay);
//     return () => { clearTimeout(timeout); if (raf.current) cancelAnimationFrame(raf.current); };
//   }, [target, duration, delay]);
//   return count;
// }

// // ─── Stat Card ────────────────────────────────────────────────────────────────

// function StatCard({ stat, active, onClick }: { stat: StatItem; active: boolean; onClick: () => void }) {
//   const meta  = STAT_META[stat.key] ?? STAT_META.all;
//   const count = useCounter(stat.value, 1000, 200);
//   const Icon  = Icons[meta.icon];

//   return (
//     <div onClick={onClick} className="relative rounded-2xl p-5 overflow-hidden cursor-pointer transition-all duration-200"
//       style={{
//         background: "#0f1824",
//         border:     active ? `1.5px solid ${meta.accent}60` : "1px solid rgba(255,255,255,0.06)",
//         boxShadow:  active ? `0 0 20px ${meta.glow}` : "none",
//         transform:  active ? "scale(1.02)" : "scale(1)",
//       }}>
//       <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
//         style={{ background: meta.glow, opacity: active ? 0.4 : 0.15 }} />
//       <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
//         style={{ background: meta.accent + (active ? "28" : "18"), color: meta.accent }}>
//         <Icon />
//       </div>
//       <p className="text-[28px] font-bold text-white leading-none tracking-tight">{count}</p>
//       <p className="text-[11px] text-slate-500 mt-1.5 mb-2 font-medium">{stat.label}</p>
//       <div className="flex items-center gap-1.5">
//         <span style={{ color: stat.pos ? "#10b981" : "#f97316" }}>
//           {stat.pos ? <Icons.trendUp /> : <Icons.trendDn />}
//         </span>
//         <span className="text-[11px] font-medium" style={{ color: stat.pos ? "#10b981" : "#f97316" }}>
//           {stat.delta}
//         </span>
//       </div>
//       {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: meta.accent }} />}
//     </div>
//   );
// }

// // ─── Bar Chart ────────────────────────────────────────────────────────────────

// function BarChart({ data }: { data: ChartData | null }) {
//   const [mounted,  setMounted]  = useState(false);
//   const [tooltip,  setTooltip]  = useState<number | null>(null);

//   useEffect(() => {
//     if (!data) return;
//     setMounted(false);
//     const t = setTimeout(() => setMounted(true), 80);
//     return () => clearTimeout(t);
//   }, [data]);

//   if (!data || data.values.length === 0) {
//     return (
//       <div className="h-36 flex items-center justify-center text-slate-700 text-xs">
//         {data ? "Aucune donnée pour cette période" : "Chargement…"}
//       </div>
//     );
//   }

//   const maxVal = Math.max(...data.values, 1);

//   return (
//     <div className="flex gap-3">
//       <div className="flex flex-col justify-between pb-6 text-right">
//         {[maxVal, Math.round(maxVal * 0.7), Math.round(maxVal * 0.4), Math.round(maxVal * 0.2), 0].map((n) => (
//           <span key={n} className="text-[9px] text-slate-700 leading-none w-4">{n}</span>
//         ))}
//       </div>
//       <div className="flex-1">
//         <div className="flex items-end gap-1.5 h-36" style={{ position: "relative" }}>
//           {data.values.map((v, i) => {
//             const highlight = data.highlights.includes(i);
//             const heightPct = mounted ? (v / maxVal) * 100 : 0;
//             return (
//               <div key={i} className="flex flex-col items-center flex-1 h-full justify-end gap-1"
//                 onMouseEnter={() => setTooltip(i)}
//                 onMouseLeave={() => setTooltip(null)}
//                 style={{ cursor: "default", position: "relative" }}>
//                 {tooltip === i && (
//                   <div className="absolute text-[10px] font-semibold rounded-md px-1.5 py-0.5 pointer-events-none z-10"
//                     style={{ background: "#1e2d42", color: "#e2e8f0", bottom: "calc(100% + 4px)", whiteSpace: "nowrap" }}>
//                     {v} acquisition{v !== 1 ? "s" : ""}
//                   </div>
//                 )}
//                 <div className="w-full rounded-t-md" style={{
//                   height:           `${heightPct}%`,
//                   minHeight:        v > 0 ? 3 : 0,
//                   transition:       "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
//                   transitionDelay:  `${i * 35}ms`,
//                   background:       highlight
//                     ? "linear-gradient(to top, #0369a1, #38bdf8)"
//                     : tooltip === i
//                       ? "rgba(14,165,233,0.28)"
//                       : "rgba(14,165,233,0.14)",
//                   boxShadow: highlight ? "0 0 12px rgba(14,165,233,0.35)" : "none",
//                 }} />
//               </div>
//             );
//           })}
//         </div>
//         <div className="flex gap-1.5 mt-2">
//           {data.labels.map((label, i) => (
//             <span key={i} className="flex-1 text-center"
//               style={{ fontSize: "9px", color: data.highlights.includes(i) ? "#38bdf8" : "#374151" }}>
//               {label}
//             </span>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Add Modal ────────────────────────────────────────────────────────────────

// interface AddFormState {
//   name: string; category: string; departmentId: string; value: string; status: string;
//   dateAchat: string;
// }

// function AddModal({ depts, onClose, onAdd }: {
//   depts:   DeptItem[];
//   onClose: () => void;
//   onAdd:   (form: AddFormState) => Promise<void>;
// }) {
//   const [form,   setForm]   = useState<AddFormState>({
//     name: "", category: "Informatique",
//     departmentId: depts[0]?.id ?? "",
//     value: "", status: "actif",
//     dateAchat: new Date().toISOString().split("T")[0],
//   });
//   const [saving, setSaving] = useState(false);
//   const [error,  setError]  = useState("");

//   const set = (k: keyof AddFormState) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
//       setForm((f) => ({ ...f, [k]: e.target.value }));

//   const handleSubmit = async () => {
//     if (!form.name.trim() || !form.value) { setError("Désignation et valeur sont obligatoires."); return; }
//     setSaving(true);
//     setError("");
//     try {
//       await onAdd(form);
//       onClose();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%", background: "#0a1219", border: "1px solid rgba(255,255,255,0.1)",
//     borderRadius: 10, color: "#e2e8f0", padding: "9px 12px",
//     fontSize: 12, outline: "none", boxSizing: "border-box",
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center"
//       style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
//       onClick={(e) => e.target === e.currentTarget && onClose()}>
//       <div className="w-full max-w-md rounded-2xl p-6"
//         style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.1)" }}>
//         <div className="flex items-center justify-between mb-5">
//           <h3 className="text-sm font-semibold text-white">Ajouter un bien</h3>
//           <button onClick={onClose}
//             className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors"
//             style={{ background: "rgba(255,255,255,0.04)" }}>
//             <Icons.close />
//           </button>
//         </div>

//         {error && (
//           <div className="mb-3 px-3 py-2 rounded-lg text-[11px]"
//             style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
//             {error}
//           </div>
//         )}

//         <div className="space-y-3">
//           <div>
//             <label className="block text-[11px] text-slate-500 mb-1.5">Désignation *</label>
//             <input style={inputStyle} placeholder='Ex : MacBook Pro 16"' value={form.name} onChange={set("name")} />
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Catégorie</label>
//               <select style={inputStyle} value={form.category} onChange={set("category")}>
//                 {["Informatique","Équipement","Mobilier","Véhicule","Télécommunication","Électroménager","Autre"].map((c) => (
//                   <option key={c}>{c}</option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Département</label>
//               <select style={inputStyle} value={form.departmentId} onChange={set("departmentId")}>
//                 {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
//               </select>
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Valeur (FCFA) *</label>
//               <input style={inputStyle} placeholder="Ex : 500000" type="number" min="0"
//                 value={form.value} onChange={set("value")} />
//             </div>
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Statut</label>
//               <select style={inputStyle} value={form.status} onChange={set("status")}>
//                 <option value="actif">Actif</option>
//                 <option value="maintenance">Maintenance</option>
//                 <option value="inactif">Inactif</option>
//               </select>
//             </div>
//           </div>
//           <div>
//             <label className="block text-[11px] text-slate-500 mb-1.5">Date d'acquisition</label>
//             <input type="date" style={{ ...inputStyle, colorScheme: "dark" }}
//               value={form.dateAchat} onChange={set("dateAchat")} />
//           </div>
//         </div>

//         <div className="flex gap-2 mt-5">
//           <button onClick={onClose}
//             className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
//             style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
//             Annuler
//           </button>
//           <button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.value}
//             className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
//             style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}>
//             {saving ? <><Icons.spinner /> Enregistrement…</> : "Enregistrer"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Main Dashboard ───────────────────────────────────────────────────────────

// export default function Dashboard() {
//   // ── UI state ───────────────────────────────────────────────────────────────
//   const [tab,          setTab]          = useState<"semaine" | "mois" | "annee">("mois");
//   const [activeFilter, setActiveFilter] = useState("all");
//   const [search,       setSearch]       = useState("");
//   const [sortKey,      setSortKey]      = useState("date");
//   const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");
//   const [showModal,    setShowModal]    = useState(false);
//   const [showAll,      setShowAll]      = useState(false);
//   const [activeDept,   setActiveDept]   = useState<string | null>(null);
//   const [now,          setNow]          = useState(new Date());

//   // ── Server data ───────────────────────────────────────────────────────────
//   const [stats,      setStats]      = useState<StatItem[]>([]);
//   const [chartData,  setChartData]  = useState<ChartData | null>(null);
//   const [depts,      setDepts]      = useState<DeptItem[]>([]);
//   const [assets,     setAssets]     = useState<Asset[]>([]);
//   const [totalBiens, setTotalBiens] = useState(0);
//   const [alertes,    setAlertes]    = useState<AlerteItem[]>([]);
//   const [loading,    setLoading]    = useState(true);
//   const [rawStats,   setRawStats]   = useState<StatsApiResponse | null>(null);

//   // ── Clock ────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const t = setInterval(() => setNow(new Date()), 60000);
//     return () => clearInterval(t);
//   }, []);

//   // ── Initial load: stats + depts + alertes ────────────────────────────────
//   useEffect(() => {
//     async function loadInitial() {
//       try {
//         const [statsRes, deptsRes, alertesRes] = await Promise.all([
//           fetch("/api/Dashboard/stats"),
//           fetch("/api/Dashboard/departements"),
//           fetch("/api/alertes"),
//         ]);

//         // Stats
//         if (statsRes.ok) {
//           const s: StatsApiResponse = await statsRes.json();
//           setRawStats(s);
//           setStats(mapStats(s));
//         }

//         // Depts
//         if (deptsRes.ok) {
//           const d: DeptApiItem[] = await deptsRes.json();
//           setDepts(mapDepts(Array.isArray(d) ? d : []));
//         }

//         // Alertes
//         if (alertesRes.ok) {
//           const a: { alertes: AlerteApiItem[] } = await alertesRes.json();
//           setAlertes(mapAlertes(a.alertes ?? []));
//         }
//       } catch (err) {
//         console.error("loadInitial error:", err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     loadInitial();
//   }, []);

//   // ── Chart: reload on tab change ───────────────────────────────────────────
//   useEffect(() => {
//     setChartData(null);
//     const period = tab === "semaine" ? "semaine" : tab === "annee" ? "annee" : "mois";
//     fetch(`/api/Dashboard/acquisitions?period=${period}`)
//       .then((r) => r.ok ? r.json() : Promise.reject(r.status))
//       .then((d: ChartApiResponse) => setChartData(mapChart(d, tab)))
//       .catch((err) => {
//         console.error("Chart fetch error:", err);
//         setChartData({ labels: [], values: [], highlights: [] });
//       });
//   }, [tab]);

//   // ── Biens: reload on filter / search / sort (debounced) ──────────────────
//   useEffect(() => {
//     const controller = new AbortController();
//     const timer = setTimeout(async () => {
//       try {
//         const params = new URLSearchParams({
//           sortKey: sortKey === "date" ? "dateAchat" : sortKey,
//           sortDir,
//           limit:   showAll ? "200" : "50",
//         });
//         if (activeFilter !== "all") params.set("etat",   activeFilter);
//         if (search.trim())          params.set("search", search.trim());

//         const res  = await fetch(`/api/biens?${params}`, { signal: controller.signal });
//         if (!res.ok) return;
//         const data: BienApiItem[] = await res.json();
//         const arr = Array.isArray(data) ? data : [];
//         setAssets(mapBiens(arr));
//         setTotalBiens(arr.length);
//       } catch (err: unknown) {
//         if ((err as Error).name !== "AbortError") console.error("Biens fetch error:", err);
//       }
//     }, 300);
//     return () => { clearTimeout(timer); controller.abort(); };
//   }, [activeFilter, search, sortKey, sortDir, showAll]);

//   // ── Handlers ─────────────────────────────────────────────────────────────
//   const handleSort = (key: string) => {
//     if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     else { setSortKey(key); setSortDir("asc"); }
//   };

//   const handleStatClick = (key: string) => {
//     setActiveFilter((prev) => (prev === key ? "all" : key));
//     setShowAll(false);
//     setSearch("");
//   };

//   const handleAdd = async (form: AddFormState) => {
//     const res = await fetch("/api/biens", {
//       method:  "POST",
//       headers: { "Content-Type": "application/json" },
//       body:    JSON.stringify({
//         nom:             form.name.trim(),
//         categorie:       form.category,
//         departementId:   form.departmentId || null,
//         valeurAchat:     parseFloat(form.value) || 0,
//         etat:            form.status,
//         dateAcquisition: form.dateAchat || null,
//       }),
//     });
//     if (!res.ok) {
//       const err = await res.json();
//       throw new Error(err.error ?? "Erreur serveur");
//     }
//     const newBien: BienApiItem = await res.json();
//     // Optimistic prepend
//     setAssets((prev) => [mapBiens([newBien])[0], ...prev]);
//     setTotalBiens((n) => n + 1);
//     // Refresh stats silently
//     fetch("/api/Dashboard/stats")
//       .then((r) => r.ok ? r.json() : null)
//       .then((s) => { if (s) { setRawStats(s); setStats(mapStats(s)); } });
//   };

//   const dismissAlerte = useCallback((id: string) => {
//     setAlertes((prev) => prev.filter((a) => a.id !== id));
//   }, []);

//   // ── Derived ───────────────────────────────────────────────────────────────
//   const displayed    = showAll ? assets : assets.slice(0, 5);
//   const activeCount  = rawStats?.actif       ?? stats.find((s) => s.key === "actif")?.value       ?? 0;
//   const maintCount   = rawStats?.maintenance ?? stats.find((s) => s.key === "maintenance")?.value ?? 0;
//   const inactifCount = rawStats?.inactif     ?? stats.find((s) => s.key === "inactif")?.value     ?? 0;
//   const totalCount   = rawStats?.total       ?? stats.find((s) => s.key === "all")?.value         ?? 0;
//   const activityRate = totalCount > 0 ? Math.round((activeCount  / totalCount) * 100) : 0;
//   const affectRate   = totalCount > 0 ? Math.round(((totalCount - inactifCount) / totalCount) * 100) : 0;

//   const SortIcon = ({ k }: { k: string }) => {
//     if (sortKey !== k) return <span className="opacity-20"><Icons.sort /></span>;
//     return sortDir === "asc" ? <Icons.sortUp /> : <Icons.sort />;
//   };

//   const ColHeader = ({ label, k, className = "" }: { label: string; k: string; className?: string }) => (
//     <span className={`text-[10px] font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1 cursor-pointer hover:text-slate-400 transition-colors select-none ${className}`}
//       onClick={() => handleSort(k)}>
//       {label} <SortIcon k={k} />
//     </span>
//   );

//   const fmtDate = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
//   const fmtTime = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-full px-7 py-6 space-y-6" style={{ fontFamily: "'DM Sans','Inter',sans-serif" }}>

//       {/* ── Header ── */}
//       <div className="flex items-end justify-between">
//         <div>
//           <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Aperçu général</p>
//           <h2 className="text-2xl font-bold text-white leading-none">Tableau de bord</h2>
//           <p className="text-sm text-slate-500 mt-1.5">
//             Vue d'ensemble du patrimoine ·{" "}
//             <span className="text-slate-600">{fmtDate} — {fmtTime}</span>
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button onClick={() => setShowModal(true)}
//             className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
//             style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}>
//             <Icons.plus /> Ajouter un bien
//           </button>
//           <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
//             style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//             <Icons.export /> Exporter
//           </button>
//         </div>
//       </div>

//       {/* ── Stat Cards ── */}
//       <div className="grid grid-cols-4 gap-4">
//         {loading
//           ? Array(4).fill(null).map((_, i) => (
//               <div key={i} className="rounded-2xl p-5 animate-pulse"
//                 style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)", height: 130 }} />
//             ))
//           : stats.map((stat) => (
//               <StatCard key={stat.key} stat={stat} active={activeFilter === stat.key}
//                 onClick={() => handleStatClick(stat.key)} />
//             ))
//         }
//       </div>

//       {activeFilter !== "all" && (
//         <div className="flex items-center gap-2 -mt-2">
//           <div className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-2"
//             style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", color: "#38bdf8" }}>
//             <Icons.filter />
//             Filtre actif : {stats.find((s) => s.key === activeFilter)?.label}
//             <button onClick={() => setActiveFilter("all")} className="ml-1 opacity-70 hover:opacity-100">
//               <Icons.x />
//             </button>
//           </div>
//           <span className="text-[11px] text-slate-600">{totalBiens} résultat{totalBiens !== 1 ? "s" : ""}</span>
//         </div>
//       )}

//       {/* ── Charts row ── */}
//       <div className="grid grid-cols-5 gap-4">
//         {/* Bar chart */}
//         <div className="col-span-3 rounded-2xl p-5"
//           style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Acquisitions</h3>
//               <p className="text-[11px] text-slate-500 mt-1">
//                 {tab === "semaine" ? "Cette semaine" : tab === "mois" ? `Par mois — ${now.getFullYear()}` : "Par année"}
//               </p>
//             </div>
//             <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
//               {(["semaine", "mois", "annee"] as const).map((t) => (
//                 <button key={t} onClick={() => setTab(t)}
//                   className="px-3 py-1.5 text-[11px] font-medium transition-all"
//                   style={{ background: tab === t ? "rgba(14,165,233,0.15)" : "transparent", color: tab === t ? "#38bdf8" : "#475569" }}>
//                   {t === "semaine" ? "Semaine" : t === "mois" ? "Mois" : "Année"}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <BarChart data={chartData} />
//         </div>

//         {/* Dept breakdown */}
//         <div className="col-span-2 rounded-2xl p-5"
//           style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Par département</h3>
//               <p className="text-[11px] text-slate-500 mt-1">Répartition des actifs</p>
//             </div>
//             {activeDept && (
//               <button onClick={() => setActiveDept(null)}
//                 className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
//                 <Icons.x /> Reset
//               </button>
//             )}
//           </div>

//           {depts.length === 0 ? (
//             <div className="py-8 text-center text-slate-700 text-xs">
//               {loading ? "Chargement…" : "Aucun département"}
//             </div>
//           ) : (
//             <div className="space-y-3.5">
//               {depts.map((dept, idx) => {
//                 const pct      = dept.total > 0 ? Math.round((dept.count / dept.total) * 100) : 0;
//                 const isActive = activeDept === dept.name;
//                 const color    = DEPT_COLORS[idx % DEPT_COLORS.length];
//                 return (
//                   <div key={dept.id} className="cursor-pointer"
//                     onClick={() => setActiveDept(isActive ? null : dept.name)}>
//                     <div className="flex justify-between items-center mb-1.5">
//                       <div className="flex items-center gap-2">
//                         <span className="w-2 h-2 rounded-full shrink-0 transition-transform"
//                           style={{ background: color, transform: isActive ? "scale(1.4)" : "scale(1)", boxShadow: isActive ? `0 0 6px ${color}` : "none" }} />
//                         <span className="text-[12px] font-medium transition-colors"
//                           style={{ color: isActive ? "#fff" : "#cbd5e1" }}>
//                           {dept.name}
//                         </span>
//                       </div>
//                       <span className="text-[11px] font-semibold text-slate-500">
//                         {dept.count} <span className="text-slate-700">/ {dept.total}</span>
//                       </span>
//                     </div>
//                     <div className="h-1.5 w-full rounded-full overflow-hidden"
//                       style={{ background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)" }}>
//                       <div className="h-full rounded-full" style={{
//                         width:      `${pct}%`,
//                         background: color,
//                         transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
//                         opacity:    activeDept && !isActive ? 0.3 : 1,
//                       }} />
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <div className="flex items-center justify-between mt-5 pt-4"
//             style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
//             {[
//               { val: totalCount,    label: "Total",   color: "#fff"    },
//               { val: activeCount,   label: "Actifs",  color: "#10b981" },
//               { val: maintCount,    label: "Maint.",  color: "#f97316" },
//               { val: alertes.length, label: "Alertes", color: "#ef4444" },
//             ].map(({ val, label, color }) => (
//               <div key={label} className="text-center">
//                 <p className="text-lg font-bold" style={{ color }}>{val}</p>
//                 <p className="text-[10px] text-slate-600">{label}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* ── Bottom row ── */}
//       <div className="grid grid-cols-5 gap-4">
//         {/* Assets table */}
//         <div className="col-span-3 rounded-2xl p-5"
//           style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-4">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">
//                 {activeFilter === "all" ? "Acquisitions récentes" : stats.find((s) => s.key === activeFilter)?.label ?? ""}
//               </h3>
//               <p className="text-[11px] text-slate-500 mt-1">{totalBiens} bien{totalBiens !== 1 ? "s" : ""}</p>
//             </div>
//             <div className="flex items-center gap-2">
//               <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
//                 style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
//                 <span className="text-slate-600"><Icons.search /></span>
//                 <input
//                   className="bg-transparent text-[11px] text-slate-300 outline-none placeholder:text-slate-700 w-28"
//                   placeholder="Rechercher…"
//                   value={search}
//                   onChange={(e) => { setSearch(e.target.value); setShowAll(true); }}
//                 />
//                 {search && (
//                   <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400">
//                     <Icons.x />
//                   </button>
//                 )}
//               </div>
//               {!showAll && totalBiens > 5 && (
//                 <button onClick={() => setShowAll(true)}
//                   className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors text-slate-400 hover:text-sky-400"
//                   style={{ background: "rgba(14,165,233,0.08)" }}>
//                   Voir tout →
//                 </button>
//               )}
//             </div>
//           </div>

//           {assets.length === 0 ? (
//             <div className="py-10 text-center text-slate-600 text-sm">
//               {loading ? <span className="inline-flex items-center gap-2"><Icons.spinner /> Chargement…</span> : "Aucun résultat"}
//             </div>
//           ) : (
//             <div className="space-y-0.5">
//               <div className="grid grid-cols-12 gap-2 px-3 pb-2"
//                 style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
//                 <ColHeader label="Code"   k="id"         className="col-span-2" />
//                 <ColHeader label="Désign." k="name"      className="col-span-3" />
//                 <ColHeader label="Dept"   k="department" className="col-span-2" />
//                 <ColHeader label="Date"   k="date"       className="col-span-2" />
//                 <ColHeader label="Statut" k="status"     className="col-span-1" />
//                 <ColHeader label="Valeur" k="value"      className="col-span-2" />
//               </div>

//               {displayed.map((item) => {
//                 const s = STATUS_STYLES[item.status] ?? STATUS_STYLES.inactif;
//                 return (
//                   <div key={item._id ?? item.id}
//                     className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors items-center">
//                     <span className="col-span-2 text-[11px] font-mono text-slate-500 truncate">{item.id}</span>
//                     <div className="col-span-3">
//                       <p className="text-[12px] font-medium text-white leading-none truncate">{item.name}</p>
//                       <p className="text-[10px] text-slate-600 mt-0.5">{item.category}</p>
//                     </div>
//                     <span className="col-span-2 text-[11px] text-slate-400 truncate">{item.department}</span>
//                     <span className="col-span-2 text-[10px] text-slate-500">{item.date}</span>
//                     <div className="col-span-1">
//                       <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
//                         style={{ background: s.bg, color: s.text }}>
//                         {s.label}
//                       </span>
//                     </div>
//                     <span className="col-span-2 text-[11px] font-semibold text-slate-300 text-right">
//                       {fmtFCFA(item.value)}
//                     </span>
//                   </div>
//                 );
//               })}

//               {!showAll && totalBiens > 5 && (
//                 <div className="pt-2 text-center">
//                   <button onClick={() => setShowAll(true)}
//                     className="text-[11px] text-slate-600 hover:text-sky-400 transition-colors">
//                     + {totalBiens - 5} bien{totalBiens - 5 > 1 ? "s" : ""} supplémentaire{totalBiens - 5 > 1 ? "s" : ""}
//                   </button>
//                 </div>
//               )}
//               {showAll && totalBiens > 5 && (
//                 <div className="pt-2 text-center">
//                   <button onClick={() => setShowAll(false)}
//                     className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
//                     Réduire ↑
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Alertes */}
//         <div className="col-span-2 rounded-2xl p-5"
//           style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Alertes & notifications</h3>
//               <p className="text-[11px] text-slate-500 mt-1">Éléments nécessitant attention</p>
//             </div>
//             <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
//               style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
//               {alertes.length} active{alertes.length !== 1 ? "s" : ""}
//             </span>
//           </div>

//           {alertes.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-8 rounded-xl text-center"
//               style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
//               <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
//                 style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
//                 <Icons.check />
//               </div>
//               <p className="text-[12px] text-emerald-500 font-medium">Tout est en ordre</p>
//               <p className="text-[11px] text-slate-600 mt-0.5">Aucune alerte active</p>
//             </div>
//           ) : (
//             <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
//               {alertes.map((alerte) => {
//                 const s = ALERT_STYLES[alerte.severity] ?? ALERT_STYLES.low;
//                 return (
//                   <div key={alerte.id} className="flex gap-3 p-3 rounded-xl group/alert"
//                     style={{ background: s.bg, border: `1px solid ${s.border}` }}>
//                     <span className="w-2 h-2 rounded-full shrink-0 mt-1"
//                       style={{ background: s.dot, boxShadow: `0 0 5px ${s.dot}` }} />
//                     <div className="flex-1 min-w-0">
//                       <p className="text-[12px] text-slate-300 leading-snug">{alerte.message}</p>
//                       <p className="text-[10px] text-slate-600 mt-1">{alerte.time}</p>
//                     </div>
//                     <button onClick={() => dismissAlerte(alerte.id)}
//                       className="text-slate-700 hover:text-slate-400 opacity-0 group-hover/alert:opacity-100 transition-all shrink-0 mt-0.5">
//                       <Icons.x />
//                     </button>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <div className="mt-4 pt-4 grid grid-cols-2 gap-3"
//             style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
//             <div className="rounded-xl p-3 text-center"
//               style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.12)" }}>
//               <p className="text-lg font-bold" style={{ color: "#10b981" }}>{activityRate}%</p>
//               <p className="text-[10px] text-slate-600 mt-0.5">Taux d'activité</p>
//             </div>
//             <div className="rounded-xl p-3 text-center"
//               style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.12)" }}>
//               <p className="text-lg font-bold" style={{ color: "#38bdf8" }}>{affectRate}%</p>
//               <p className="text-[10px] text-slate-600 mt-0.5">Taux d'affectation</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {showModal && (
//         <AddModal depts={depts} onClose={() => setShowModal(false)} onAdd={handleAdd} />
//       )}
//     </div>
//   );
// }





// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import BiensPage from "../Biens/page";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface StatItem {
//   key:   string;
//   label: string;
//   value: number;
//   delta: string;
//   pos:   boolean;
// }

// interface Asset {
//   id:         string; // codeInventaire
//   _id?:       string; // internal UUID
//   name:       string;
//   category:   string;
//   department: string;
//   status:     string;
//   date:       string;
//   value:      number;
// }

// interface AlerteItem {
//   id:       string;
//   type:     "garantie" | "maintenance" | "affectation" | "inactif";
//   message:  string;
//   severity: "high" | "medium" | "low";
//   time:     string;
// }

// interface DeptItem {
//   id:    string;
//   name:  string;
//   count: number;
//   total: number;
// }

// interface ChartData {
//   labels:     string[];
//   values:     number[];
//   highlights: number[];
// }

// // ─── Static display helpers ───────────────────────────────────────────────────

// const STAT_META: Record<string, { icon: keyof typeof Icons; accent: string; glow: string }> = {
//   all:         { icon: "package", accent: "#0ea5e9", glow: "rgba(14,165,233,0.22)"  },
//   actif:       { icon: "check",   accent: "#10b981", glow: "rgba(16,185,129,0.22)"  },
//   maintenance: { icon: "wrench",  accent: "#f97316", glow: "rgba(249,115,22,0.22)"  },
//   inactif:     { icon: "alert",   accent: "#ef4444", glow: "rgba(239,68,68,0.22)"   },
// };

// const DEPT_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f97316", "#ec4899", "#f59e0b", "#14b8a6"];

// const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
//   actif:       { label: "Actif",       bg: "rgba(16,185,129,0.12)",  text: "#10b981" },
//   maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)",  text: "#f97316" },
//   inactif:     { label: "Inactif",     bg: "rgba(100,116,139,0.15)", text: "#64748b" },
// };

// const ALERT_STYLES: Record<string, { dot: string; border: string; bg: string }> = {
//   high:   { dot: "#ef4444", border: "rgba(239,68,68,0.2)",  bg: "rgba(239,68,68,0.04)"  },
//   medium: { dot: "#f97316", border: "rgba(249,115,22,0.2)", bg: "rgba(249,115,22,0.04)" },
//   low:    { dot: "#0ea5e9", border: "rgba(14,165,233,0.2)", bg: "rgba(14,165,233,0.04)" },
// };

// const fmtFCFA = (v: number) => v.toLocaleString("fr-FR") + " FCFA";

// // ─── Icons ────────────────────────────────────────────────────────────────────

// const Icons = {
//   package: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
//   check:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
//   wrench:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
//   alert:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
//   trendUp: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
//   trendDn: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
//   export:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
//   filter:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
//   plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
//   search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
//   sort:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   sortUp:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
//   x:       () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   close:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   spinner: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
//       <path d="M21 12a9 9 0 1 1-6.219-8.56" />
//     </svg>
//   ),
// };

// // ─── Custom hook: animated counter ───────────────────────────────────────────

// function useCounter(target: number, duration = 1000, delay = 0): number {
//   const [count, setCount] = useState(0);
//   const raf = useRef<number | null>(null);
//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       const start = performance.now();
//       const tick = (now: number) => {
//         const progress = Math.min((now - start) / duration, 1);
//         const ease = 1 - Math.pow(1 - progress, 3);
//         setCount(Math.round(ease * target));
//         if (progress < 1) raf.current = requestAnimationFrame(tick);
//       };
//       raf.current = requestAnimationFrame(tick);
//     }, delay);
//     return () => { clearTimeout(timeout); if (raf.current) cancelAnimationFrame(raf.current); };
//   }, [target, duration, delay]);
//   return count;
// }

// // ─── Stat Card ────────────────────────────────────────────────────────────────

// function StatCard({
//   stat, active, onClick,
// }: {
//   stat: StatItem; active: boolean; onClick: () => void;
// }) {
//   const meta  = STAT_META[stat.key] ?? STAT_META.all;
//   const count = useCounter(stat.value, 1000, 200);
//   const Icon  = Icons[meta.icon];

//   return (
//     <div
//       onClick={onClick}
//       className="relative rounded-2xl p-5 overflow-hidden cursor-pointer transition-all duration-200"
//       style={{
//         background:  "#0f1824",
//         border:      active ? `1.5px solid ${meta.accent}60` : "1px solid rgba(255,255,255,0.06)",
//         boxShadow:   active ? `0 0 20px ${meta.glow}` : "none",
//         transform:   active ? "scale(1.02)" : "scale(1)",
//       }}
//     >
//       <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl" style={{ background: meta.glow, opacity: active ? 0.4 : 0.15 }} />
//       <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: meta.accent + (active ? "28" : "18"), color: meta.accent }}>
//         <Icon />
//       </div>
//       <p className="text-[28px] font-bold text-white leading-none tracking-tight">{count}</p>
//       <p className="text-[11px] text-slate-500 mt-1.5 mb-2 font-medium">{stat.label}</p>
//       <div className="flex items-center gap-1.5">
//         <span style={{ color: stat.pos ? "#10b981" : "#f97316" }}>
//           {stat.pos ? <Icons.trendUp /> : <Icons.trendDn />}
//         </span>
//         <span className="text-[11px] font-medium" style={{ color: stat.pos ? "#10b981" : "#f97316" }}>
//           {stat.delta}
//         </span>
//       </div>
//       {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: meta.accent }} />}
//     </div>
//   );
// }

// // ─── Bar Chart ────────────────────────────────────────────────────────────────

// function BarChart({ data }: { data: ChartData | null }) {
//   const [mounted, setMounted] = useState(false);
//   const [tooltip, setTooltip] = useState<number | null>(null);

//   useEffect(() => {
//     if (!data) return;
//     setMounted(false);
//     const t = setTimeout(() => setMounted(true), 80);
//     return () => clearTimeout(t);
//   }, [data]);

//   if (!data) {
//     return <div className="h-36 flex items-center justify-center text-slate-700 text-xs">Chargement…</div>;
//   }

//   // const maxVal = Math.max(...data.values, 1);
//   // Avant (ligne ~176)
// // Après
// const values = data?.values ?? [];
// const maxVal = Math.max(...(values.length ? values : [0]), 1);

//   return (
//     <div className="flex gap-3">
//       <div className="flex flex-col justify-between pb-6 text-right">
//         {[maxVal, Math.round(maxVal * 0.7), Math.round(maxVal * 0.4), Math.round(maxVal * 0.2), 0].map((n) => (
//           <span key={n} className="text-[9px] text-slate-700 leading-none w-4">{n}</span>
//         ))}
//       </div>
//       <div className="flex-1">
//         <div className="flex items-end gap-1.5 h-36" style={{ position: "relative" }}>
//           {data.values.map((v, i) => {
//             const highlight  = data.highlights.includes(i);
//             const heightPct  = mounted ? (v / maxVal) * 100 : 0;
//             return (
//               <div
//                 key={i}
//                 className="flex flex-col items-center flex-1 h-full justify-end gap-1"
//                 onMouseEnter={() => setTooltip(i)}
//                 onMouseLeave={() => setTooltip(null)}
//                 style={{ cursor: "default", position: "relative" }}
//               >
//                 {tooltip === i && (
//                   <div className="absolute text-[10px] font-semibold rounded-md px-1.5 py-0.5 pointer-events-none z-10"
//                     style={{ background: "#1e2d42", color: "#e2e8f0", bottom: "calc(100% - 4px)", whiteSpace: "nowrap" }}>
//                     {v} acquisitions
//                   </div>
//                 )}
//                 <div className="w-full rounded-t-md" style={{
//                   height: `${heightPct}%`,
//                   transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
//                   transitionDelay: `${i * 35}ms`,
//                   background: highlight ? "linear-gradient(to top, #0369a1, #38bdf8)" : tooltip === i ? "rgba(14,165,233,0.28)" : "rgba(14,165,233,0.14)",
//                   boxShadow: highlight ? "0 0 12px rgba(14,165,233,0.35)" : "none",
//                 }} />
//               </div>
//             );
//           })}
//         </div>
//         <div className="flex gap-1.5 mt-2">
//           {data.labels.map((label, i) => (
//             <span key={i} className="flex-1 text-center"
//               style={{ fontSize: "9px", color: data.highlights.includes(i) ? "#38bdf8" : "#374151" }}>
//               {label}
//             </span>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Add Modal ────────────────────────────────────────────────────────────────

// interface AddFormState {
//   name: string; category: string; departmentId: string; value: string; status: string;
// }

// function AddModal({
//   depts, onClose, onAdd,
// }: {
//   depts:   DeptItem[];
//   onClose: () => void;
//   onAdd:   (form: AddFormState) => Promise<void>;
// }) {
//   const [form, setForm] = useState<AddFormState>({
//     name: "", category: "Informatique", departmentId: depts[1]?.id ?? "", value: "", status: "actif",
//   });
//   const [saving, setSaving] = useState(false);
//   const [error,  setError]  = useState("");

//   const set = (k: keyof AddFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
//     setForm((f) => ({ ...f, [k]: e.target.value }));

//   const handleSubmit = async () => {
//     if (!form.name || !form.value) return;
//     setSaving(true);
//     setError("");
//     try {
//       await onAdd(form);
//       onClose();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%", background: "#0a1219", border: "1px solid rgba(255,255,255,0.1)",
//     borderRadius: "10px", color: "#e2e8f0", padding: "9px 12px",
//     fontSize: "12px", outline: "none", boxSizing: "border-box",
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center"
//       style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
//       onClick={(e) => e.target === e.currentTarget && onClose()}>
//       <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.1)" }}>
//         <div className="flex items-center justify-between mb-5">
//           <h3 className="text-sm font-semibold text-white">Ajouter un bien</h3>
//           <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
//             <Icons.close />
//           </button>
//         </div>

//         {error && (
//           <div className="mb-3 px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
//             {error}
//           </div>
//         )}

//         <div className="space-y-3">
//           <div>
//             <label className="block text-[11px] text-slate-500 mb-1.5">Désignation *</label>
//             <input style={inputStyle} placeholder="Ex : MacBook Pro 16″" value={form.name} onChange={set("name")} />
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Catégorie</label>
//               <select style={inputStyle} value={form.category} onChange={set("category")}>
//                 {["Informatique", "Équipement", "Mobilier", "Véhicule", "Téléphonie"].map((c) => <option key={c}>{c}</option>)}
//               </select>
//             </div>
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Département</label>
//               <select style={inputStyle} value={form.departmentId} onChange={set("departmentId")}>
//                 <option value="actif">Actif</option>
//                 <option value="maintenance">Maintenance</option>
//                 <option value="inactif">Inactif</option>
//                 {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
//               </select>
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Valeur (FCFA) *</label>
//               <input style={inputStyle} placeholder="Ex : 500000" type="number" value={form.value} onChange={set("value")} />
//             </div>
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Statut</label>
//               <select style={inputStyle} value={form.status} onChange={set("status")}>
//                 <option value="actif">Actif</option>
//                 <option value="maintenance">Maintenance</option>
//                 <option value="inactif">Inactif</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="flex gap-2 mt-5">
//           <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
//             Annuler
//           </button>
//           <button onClick={handleSubmit} disabled={saving || !form.name || !form.value} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40" style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}>
//             {saving ? <><Icons.spinner /> Enregistrement…</> : "Enregistrer"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Main Dashboard ───────────────────────────────────────────────────────────

// export default function Dashboard() {
//   // ── UI state ───────────────────────────────────────────────────────────────
//   const [tab,          setTab]          = useState<"semaine" | "mois" | "annee">("mois");
//   const [activeFilter, setActiveFilter] = useState("all");
//   const [search,       setSearch]       = useState("");
//   const [sortKey,      setSortKey]      = useState("date");
//   const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");
//   const [showModal,    setShowModal]    = useState(false);
//   const [showAll,      setShowAll]      = useState(false);
//   const [activeDept,   setActiveDept]   = useState<string | null>(null);
//   const [now,          setNow]          = useState(new Date());

//   // ── Server data ───────────────────────────────────────────────────────────
//   const [stats,     setStats]     = useState<StatItem[]>([]);
//   const [chartData, setChartData] = useState<ChartData | null>(null);
//   const [depts,     setDepts]     = useState<DeptItem[]>([]);
//   const [assets,    setAssets]    = useState<Asset[]>([]);
//   const [totalBiens,setTotalBiens]= useState(0);
//   const [alertes,   setAlertes]   = useState<AlerteItem[]>([]);
//   const [loading,   setLoading]   = useState(true);

//   // ── Clock ────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const t = setInterval(() => setNow(new Date()), 60000);
//     return () => clearInterval(t);
//   }, []);

//   // ── Fetch stats + departments + alertes (once on mount) ──────────────────
//   useEffect(() => {
//     async function loadInitial() {
//       try {
//         const [statsRes, deptsRes, alertesRes] = await Promise.all([
//           fetch("/api/Dashboard/stats"),
//           fetch("/api/Dashboard/departements"),
//           fetch("/api/alertes"),
//         ]);
//         const [statsJson, deptsJson, alertesJson] = await Promise.all([
//           statsRes.json(),
//           deptsRes.json(),
//           alertesRes.json(),
//         ]);
//         if (statsJson.stats)         setStats(statsJson.stats);
//         if (deptsJson.departements)  setDepts(deptsJson.departements);
//         if (alertesJson.alertes)     setAlertes(alertesJson.alertes);
//       } catch (err) {
//         console.error("loadInitial", err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     loadInitial();
//   }, []);

//   // ── Fetch chart data on tab change ────────────────────────────────────────
//   useEffect(() => {
//     setChartData(null);
//     fetch(`/api/Dashboard/acquisitions?period=${tab}`)
//       .then((r) => r.json())
//       .then((d) => setChartData(d))
//       .catch(console.error);
//   }, [tab]);

//   // ── Fetch biens on filter / search / sort change (debounced) ─────────────
//   useEffect(() => {
//     const controller = new AbortController();
//     const timer = setTimeout(async () => {
//       try {
//         const params = new URLSearchParams({
//           ...(activeFilter !== "all" && { status: activeFilter }),
//           ...(search && { search }),
//           sortKey,
//           sortDir,
//           limit: showAll ? "200" : "50",
//         });
//         const res  = await fetch(`/api/biens?${params}`, { signal: controller.signal });
//         const data = await res.json();
//         setAssets(data.biens ?? []);
//         setTotalBiens(data.total ?? 0);
//       } catch (err: unknown) {
//         if ((err as Error).name !== "AbortError") console.error(err);
//       }
//     }, 300);
//     return () => { clearTimeout(timer); controller.abort(); };
//   }, [activeFilter, search, sortKey, sortDir, showAll]);

//   // ── Handlers ─────────────────────────────────────────────────────────────
//   const handleSort = (key: string) => {
//     if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     else { setSortKey(key); setSortDir("asc"); }
//   };

//   const handleStatClick = (key: string) => {
//     setActiveFilter((prev) => (prev === key ? "all" : key));
//     setShowAll(false);
//     setSearch("");
//   };

//   const handleAdd = async (form: AddFormState) => {
//     const res = await fetch("/api/biens", {
//       method:  "POST",
//       headers: { "Content-Type": "application/json" },
//       body:    JSON.stringify({
//         name:         form.name,
//         category:     form.category,
//         departmentId: form.departmentId,
//         value:        parseInt(form.value, 10) || 0,
//         status:       form.status,
//       }),
//     });
//     if (!res.ok) {
//       const err = await res.json();
//       throw new Error(err.error ?? "Erreur serveur");
//     }
//     const { bien } = await res.json();
//     // Optimistic prepend + re-fetch stats
//     setAssets((prev) => [bien, ...prev]);
//     setTotalBiens((n) => n + 1);
//     fetch("/api/Dashboard/stats").then((r) => r.json()).then((d) => d.stats && setStats(d.stats));
//   };

//   const dismissAlerte = useCallback(async (id: string, type: AlerteItem["type"]) => {
//     setAlertes((prev) => prev.filter((a) => a.id !== id));
//     await fetch("/api/alertes", {
//       method:  "DELETE",
//       headers: { "Content-Type": "application/json" },
//       body:    JSON.stringify({ id, type }),
//     }).catch(console.error);
//   }, []);

//   // ── Derived ───────────────────────────────────────────────────────────────
//   const displayed = showAll ? assets : assets.slice(0, 5);

//   const SortIcon = ({ k }: { k: string }) => {
//     if (sortKey !== k) return <span className="opacity-20"><Icons.sort /></span>;
//     return sortDir === "asc" ? <Icons.sortUp /> : <Icons.sort />;
//   };

//   const ColHeader = ({ label, k, className = "" }: { label: string; k: string; className?: string }) => (
//     <span
//       className={`text-[10px] font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1 cursor-pointer hover:text-slate-400 transition-colors select-none ${className}`}
//       onClick={() => handleSort(k)}
//     >
//       {label} <SortIcon k={k} />
//     </span>
//   );

//   const fmtDate = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
//   const fmtTime = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

//   const activeCount = stats.find((s) => s.key === "actif")?.value ?? 0;
//   const maintCount  = stats.find((s) => s.key === "maintenance")?.value ?? 0;
//   const totalCount  = stats.find((s) => s.key === "all")?.value ?? 0;
//   const activityRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-full px-7 py-6 space-y-6" style={{ fontFamily: "'DM Sans','Inter',sans-serif" }}>

//       {/* ── Header ── */}
//       <div className="flex items-end justify-between">
//         <div>
//           <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Aperçu général</p>
//           <h2 className="text-2xl font-bold text-white leading-none">Tableau de bord</h2>
//           <p className="text-sm text-slate-500 mt-1.5">
//             Vue d'ensemble du patrimoine ·{" "}
//             <span className="text-slate-600">{fmtDate} — {fmtTime}</span>
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => setShowModal(true)}
//             className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
//             style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
//           >
//             <Icons.plus /> Ajouter un bien
//           </button>
//           <button
//             className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
//             style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}
//           >
//             <Icons.export /> Exporter
//           </button>
//         </div>
//       </div>

//       {/* ── Stat Cards ── */}
//       <div className="grid grid-cols-4 gap-4">
//         {loading
//           ? Array(4).fill(null).map((_, i) => (
//               <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)", height: 130 }} />
//             ))
//           : stats.map((stat) => (
//               <StatCard key={stat.key} stat={stat} active={activeFilter === stat.key} onClick={() => handleStatClick(stat.key)} />
//             ))
//         }
//       </div>

//       {activeFilter !== "all" && (
//         <div className="flex items-center gap-2 -mt-2">
//           <div className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-2"
//             style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", color: "#38bdf8" }}>
//             <Icons.filter />
//             Filtre actif : {stats.find((s) => s.key === activeFilter)?.label}
//             <button onClick={() => setActiveFilter("all")} className="ml-1 opacity-70 hover:opacity-100"><Icons.x /></button>
//           </div>
//           <span className="text-[11px] text-slate-600">{totalBiens} résultat{totalBiens !== 1 ? "s" : ""}</span>
//         </div>
//       )}

//       {/* ── Charts row ── */}
//       <div className="grid grid-cols-5 gap-4">
//         {/* Bar chart */}
//         <div className="col-span-3 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Acquisitions</h3>
//               <p className="text-[11px] text-slate-500 mt-1">
//                 {tab === "semaine" ? "Cette semaine" : tab === "mois" ? `Par mois — ${now.getFullYear()}` : "Par année"}
//               </p>
//             </div>
//             <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
//               {(["semaine", "mois", "annee"] as const).map((t) => (
//                 <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 text-[11px] font-medium transition-all"
//                   style={{ background: tab === t ? "rgba(14,165,233,0.15)" : "transparent", color: tab === t ? "#38bdf8" : "#475569" }}>
//                   {t === "semaine" ? "Semaine" : t === "mois" ? "Mois" : "Année"}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <BarChart data={chartData} />
//         </div>

//         {/* Dept breakdown */}
//         <div className="col-span-2 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Par département</h3>
//               <p className="text-[11px] text-slate-500 mt-1">Cliquez pour filtrer</p>
//             </div>
//             {activeDept && (
//               <button onClick={() => setActiveDept(null)} className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
//                 <Icons.x /> Reset
//               </button>
//             )}
//           </div>
//           <div className="space-y-3.5">
//             {depts.map((dept, idx) => {
//               const pct      = dept.total > 0 ? Math.round((dept.count / dept.total) * 100) : 0;
//               const isActive = activeDept === dept.name;
//               const color    = DEPT_COLORS[idx % DEPT_COLORS.length];
//               return (
//                 <div key={dept.id} className="cursor-pointer" onClick={() => setActiveDept(isActive ? null : dept.name)}>
//                   <div className="flex justify-between items-center mb-1.5">
//                     <div className="flex items-center gap-2">
//                       <span className="w-2 h-2 rounded-full shrink-0 transition-transform"
//                         style={{ background: color, transform: isActive ? "scale(1.4)" : "scale(1)", boxShadow: isActive ? `0 0 6px ${color}` : "none" }} />
//                       <span className="text-[12px] font-medium transition-colors" style={{ color: isActive ? "#fff" : "#cbd5e1" }}>
//                         {dept.name}
//                       </span>
//                     </div>
//                     <span className="text-[11px] font-semibold text-slate-500">
//                       {dept.count} <span className="text-slate-700">/ {dept.total}</span>
//                     </span>
//                   </div>
//                   <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)" }}>
//                     <div className="h-full rounded-full" style={{
//                       width: `${pct}%`,
//                       background: color,
//                       transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
//                       opacity: activeDept && !isActive ? 0.3 : 1,
//                     }} />
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//           <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
//             {[
//               { val: totalCount,   label: "Total",   color: "#fff"     },
//               { val: activeCount,  label: "Actifs",  color: "#10b981"  },
//               { val: maintCount,   label: "Maint.",  color: "#f97316"  },
//               { val: alertes.length, label: "Alertes", color: "#ef4444" },
//             ].map(({ val, label, color }) => (
//               <div key={label} className="text-center">
//                 <p className="text-lg font-bold" style={{ color }}>{val}</p>
//                 <p className="text-[10px] text-slate-600">{label}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* ── Bottom row ── */}
//       <div className="grid grid-cols-5 gap-4">
//         {/* Assets table */}
//         <div className="col-span-3 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-4">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">
//                 {activeFilter === "all" ? "Acquisitions récentes" : stats.find((s) => s.key === activeFilter)?.label ?? ""}
//               </h3>
//               <p className="text-[11px] text-slate-500 mt-1">{totalBiens} bien{totalBiens !== 1 ? "s" : ""}</p>
//             </div>
//             <div className="flex items-center gap-2">
//               <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
//                 style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
//                 <span className="text-slate-600"><Icons.search /></span>
//                 <input
//                   className="bg-transparent text-[11px] text-slate-300 outline-none placeholder:text-slate-700 w-28"
//                   placeholder="Rechercher…"
//                   value={search}
//                   onChange={(e) => { setSearch(e.target.value); setShowAll(true); }}
//                 />
//                 {search && <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400"><Icons.x /></button>}
//               </div>
//               {!showAll && totalBiens > 5 && (
//                 <button onClick={() => setShowAll(true)} className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors text-slate-400 hover:text-sky-400"
//                   style={{ background: "rgba(14,165,233,0.08)" }}>
//                   Voir tout →
//                 </button>
//               )}
//             </div>
//           </div>

//           {assets.length === 0 ? (
//             <div className="py-10 text-center text-slate-600 text-sm">
//               {loading ? "Chargement…" : "Aucun résultat"}
//             </div>
//           ) : (
//             <div className="space-y-0.5">
//               <div className="grid grid-cols-12 gap-2 px-3 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
//                 <ColHeader label="ID"      k="id"         className="col-span-1" />
//                 <ColHeader label="Désign." k="name"       className="col-span-3" />
//                 <ColHeader label="Dept"    k="department" className="col-span-2" />
//                 <ColHeader label="Date"    k="date"       className="col-span-2" />
//                 <ColHeader label="Statut"  k="status"     className="col-span-2" />
//                 <ColHeader label="Valeur"  k="value"      className="col-span-2" />
//               </div>

//               {displayed.map((item) => {
//                 const s = STATUS_STYLES[item.status] ?? STATUS_STYLES.inactif;
//                 return (
//                   <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors items-center">
//                     <span className="col-span-1 text-[11px] font-mono text-slate-600">{item.id.replace("BN-", "")}</span>
//                     <div className="col-span-3">
//                       <p className="text-[12px] font-medium text-white leading-none truncate">{item.name}</p>
//                       <p className="text-[10px] text-slate-600 mt-0.5">{item.category}</p>
//                     </div>
//                     <span className="col-span-2 text-[11px] text-slate-400 truncate">{item.department}</span>
//                     <span className="col-span-2 text-[10px] text-slate-500">{item.date}</span>
//                     <div className="col-span-2">
//                       <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.text }}>
//                         {s.label}
//                       </span>
//                     </div>
//                     <span className="col-span-2 text-[11px] font-semibold text-slate-300 text-right">{fmtFCFA(item.value)}</span>
//                   </div>
//                 );
//               })}

//               {!showAll && totalBiens > 5 && (
//                 <div className="pt-2 text-center">
//                   <button onClick={() => setShowAll(true)} className="text-[11px] text-slate-600 hover:text-sky-400 transition-colors">
//                     + {totalBiens - 5} bien{totalBiens - 5 > 1 ? "s" : ""} supplémentaire{totalBiens - 5 > 1 ? "s" : ""}
//                   </button>
//                 </div>
//               )}
//               {showAll && totalBiens > 5 && (
//                 <div className="pt-2 text-center">
//                   <button onClick={() => setShowAll(false)} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
//                     Réduire ↑
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Alertes */}
//         <div className="col-span-2 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Alertes & notifications</h3>
//               <p className="text-[11px] text-slate-500 mt-1">Éléments nécessitant attention</p>
//             </div>
//             <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
//               {alertes.length} active{alertes.length !== 1 ? "s" : ""}
//             </span>
//           </div>

//           {alertes.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-8 rounded-xl text-center"
//               style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
//               <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: "rgba(16,185,129,0.12)" }}>
//                 <Icons.check />
//               </div>
//               <p className="text-[12px] text-emerald-500 font-medium">Tout est en ordre</p>
//               <p className="text-[11px] text-slate-600 mt-0.5">Aucune alerte active</p>
//             </div>
//           ) : (
//             <div className="space-y-2.5">
//               {alertes.map((alerte) => {
//                 const s = ALERT_STYLES[alerte.severity];
//                 return (
//                   <div key={alerte.id} className="flex gap-3 p-3 rounded-xl group/alert"
//                     style={{ background: s.bg, border: `1px solid ${s.border}` }}>
//                     <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: s.dot, boxShadow: `0 0 5px ${s.dot}` }} />
//                     <div className="flex-1 min-w-0">
//                       <p className="text-[12px] text-slate-300 leading-snug">{alerte.message}</p>
//                       <p className="text-[10px] text-slate-600 mt-1">{alerte.time}</p>
//                     </div>
//                     <button onClick={() => dismissAlerte(alerte.id, alerte.type)}
//                       className="text-slate-700 hover:text-slate-400 opacity-0 group-hover/alert:opacity-100 transition-all shrink-0 mt-0.5">
//                       <Icons.x />
//                     </button>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
//             <div className="rounded-xl p-3 text-center" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.12)" }}>
//               <p className="text-lg font-bold" style={{ color: "#10b981" }}>{activityRate}%</p>
//               <p className="text-[10px] text-slate-600 mt-0.5">Taux d'activité</p>
//             </div>
//             <div className="rounded-xl p-3 text-center" style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.12)" }}>
//               <p className="text-lg font-bold" style={{ color: "#38bdf8" }}>
//                 {totalCount > 0 ? Math.round(((totalCount - (stats.find(s => s.key === "inactif")?.value ?? 0)) / totalCount) * 100) : 0}%
//               </p>
//               <p className="text-[10px] text-slate-600 mt-0.5">Taux d'affectation</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {showModal && <AddModal depts={depts} onClose={() => setShowModal(false)} onAdd={handleAdd} />}
//     </div>
//   );
// }





// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";

// // ─── Types / Data ─────────────────────────────────────────────────────────────

// const DATA_BY_PERIOD = {
//   semaine: {
//     labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
//     values: [2, 1, 3, 0, 2, 1, 0],
//     highlights: [2],
//   },
//   mois: {
//     labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jui", "Aoû", "Sep", "Oct", "Nov", "Déc"],
//     values: [6, 4, 8, 5, 7, 6, 9, 5, 7, 14, 11, 8],
//     highlights: [9],
//   },
//   annee: {
//     labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
//     values: [22, 31, 45, 58, 72, 90],
//     highlights: [5],
//   },
// };

// const DEPTS = [
//   { name: "Informatique",        count: 48, total: 142, color: "#0ea5e9" },
//   { name: "Ressources Humaines", count: 31, total: 142, color: "#8b5cf6" },
//   { name: "Comptabilité",        count: 28, total: 142, color: "#10b981" },
//   { name: "Direction Générale",  count: 19, total: 142, color: "#f97316" },
//   { name: "Logistique",          count: 16, total: 142, color: "#ec4899" },
// ];

// const ALL_ASSETS = [
//   { id: "BN-0142", name: "MacBook Pro 16″",      category: "Informatique",  department: "DSI",       status: "actif",       date: "22 Oct 2026", value: 2400000 },
//   { id: "BN-0141", name: "Climatiseur DAIKIN",    category: "Équipement",    department: "RH",        status: "actif",       date: "20 Oct 2026", value: 650000  },
//   { id: "BN-0140", name: "Imprimante HP LaserJet",category: "Informatique",  department: "Compta",    status: "maintenance", date: "18 Oct 2026", value: 380000  },
//   { id: "BN-0139", name: "Véhicule Toyota RAV4",  category: "Véhicule",      department: "Direction", status: "actif",       date: "15 Oct 2026", value: 14500000},
//   { id: "BN-0138", name: "Serveur Dell PowerEdge",category: "Informatique",  department: "DSI",       status: "actif",       date: "12 Oct 2026", value: 5800000 },
//   { id: "BN-0137", name: "Bureau ergonomique",    category: "Mobilier",      department: "RH",        status: "actif",       date: "10 Oct 2026", value: 185000  },
//   { id: "BN-0136", name: "Tablette iPad Pro",     category: "Informatique",  department: "Direction", status: "actif",       date: "08 Oct 2026", value: 720000  },
//   { id: "BN-0135", name: "Téléphone DECT",        category: "Téléphonie",    department: "Compta",    status: "inactif",     date: "05 Oct 2026", value: 45000   },
// ];

// const INITIAL_ALERTS = [
//   { id: "1", message: "3 biens arrivant en fin de garantie dans 30 jours", severity: "high",   time: "il y a 2h"  },
//   { id: "2", message: "Maintenance préventive planifiée — Groupe électrogène", severity: "medium", time: "il y a 5h"  },
//   { id: "3", message: "Affectation expirée : Ordinateur BN-0121 (RH)",         severity: "medium", time: "Hier"       },
//   { id: "4", message: "Stock de consommables critique — Toner bureau 3",       severity: "low",    time: "Il y a 2j"  },
// ];

// const STAT_DEFS = [
//   { key: "all",         icon: "package", value: 11, delta: "+8 ce mois",  pos: true,  label: "Total des biens",  accent: "#0ea5e9", glow: "rgba(14,165,233,0.22)"  },
//   { key: "actif",       icon: "check",   value: 7,  delta: "83% du total", pos: true,  label: "Biens actifs",     accent: "#10b981", glow: "rgba(16,185,129,0.22)"  },
//   { key: "maintenance", icon: "wrench",  value: 2,  delta: "+3 nouveaux", pos: false, label: "En maintenance",   accent: "#f97316", glow: "rgba(249,115,22,0.22)"  },
//   { key: "inactif",     icon: "alert",   value: 1,  delta: "Action requise", pos: false, label: "Alertes urgentes", accent: "#ef4444", glow: "rgba(239,68,68,0.22)"   },
// ];

// const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
//   actif:       { label: "Actif",       bg: "rgba(16,185,129,0.12)",  text: "#10b981" },
//   maintenance: { label: "Maintenance", bg: "rgba(249,115,22,0.12)",  text: "#f97316" },
//   inactif:     { label: "Inactif",     bg: "rgba(100,116,139,0.15)", text: "#64748b" },
// };

// const ALERT_STYLES: Record<string, { dot: string; border: string; bg: string }> = {
//   high:   { dot: "#ef4444", border: "rgba(239,68,68,0.2)",  bg: "rgba(239,68,68,0.04)"  },
//   medium: { dot: "#f97316", border: "rgba(249,115,22,0.2)", bg: "rgba(249,115,22,0.04)" },
//   low:    { dot: "#0ea5e9", border: "rgba(14,165,233,0.2)", bg: "rgba(14,165,233,0.04)" },
// };

// const fmtFCFA = (v: number) => v.toLocaleString("fr-FR") + " FCFA";

// // ─── Icons ────────────────────────────────────────────────────────────────────

// const Icons = {
//   package: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
//   check:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
//   wrench:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
//   alert:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
//   trendUp: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
//   trendDn: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
//   export:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
//   filter:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
//   plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
//   search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
//   sort:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
//   sortUp:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
//   x:       () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
//   close:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
// };

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface StatCardDef {
//   key: string;
//   icon: keyof typeof Icons;
//   value: number;
//   delta: string;
//   pos: boolean;
//   label: string;
//   accent: string;
//   glow: string;
// }

// interface Asset {
//   id: string;
//   name: string;
//   category: string;
//   department: string;
//   status: string;
//   date: string;
//   value: number;
// }

// interface Alert {
//   id: string;
//   message: string;
//   severity: string;
//   time: string;
// }

// interface AddFormState {
//   name: string;
//   category: string;
//   department: string;
//   value: string;
//   status: string;
// }

// // ─── Custom Hooks ─────────────────────────────────────────────────────────────

// function useCounter(target: number, duration = 1200, delay = 0): number {
//   const [count, setCount] = useState(0);
//   const raf = useRef<number | null>(null);
//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       const start = performance.now();
//       const tick = (now: number) => {
//         const progress = Math.min((now - start) / duration, 1);
//         const ease = 1 - Math.pow(1 - progress, 3);
//         setCount(Math.round(ease * target));
//         if (progress < 1) raf.current = requestAnimationFrame(tick);
//       };
//       raf.current = requestAnimationFrame(tick);
//     }, delay);
//     return () => {
//       clearTimeout(timeout);
//       if (raf.current) cancelAnimationFrame(raf.current);
//     };
//   }, [target, duration, delay]);
//   return count;
// }

// // ─── Animated Stat Card ───────────────────────────────────────────────────────

// function StatCard({ card, active, onClick }: { card: StatCardDef; active: boolean; onClick: () => void }) {
//   const count = useCounter(card.value, 1000, 200);
//   const Icon = Icons[card.icon];
//   return (
//     <div
//       onClick={onClick}
//       className="relative rounded-2xl p-5 overflow-hidden group cursor-pointer transition-all duration-200"
//       style={{
//         background: "#0f1824",
//         border: active
//           ? `1.5px solid ${card.accent}60`
//           : "1px solid rgba(255,255,255,0.06)",
//         boxShadow: active ? `0 0 20px ${card.glow}` : "none",
//         transform: active ? "scale(1.02)" : "scale(1)",
//       }}
//     >
//       <div
//         className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-opacity"
//         style={{ background: card.glow, opacity: active ? 0.4 : 0.15 }}
//       />
//       <div
//         className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors"
//         style={{ background: card.accent + (active ? "28" : "18"), color: card.accent }}
//       >
//         <Icon />
//       </div>
//       <p className="text-[28px] font-bold text-white leading-none tracking-tight">{count}</p>
//       <p className="text-[11px] text-slate-500 mt-1.5 mb-2 font-medium">{card.label}</p>
//       <div className="flex items-center gap-1.5">
//         <span style={{ color: card.pos ? "#10b981" : "#f97316" }}>
//           {card.pos ? <Icons.trendUp /> : <Icons.trendDn />}
//         </span>
//         <span className="text-[11px] font-medium" style={{ color: card.pos ? "#10b981" : "#f97316" }}>
//           {card.delta}
//         </span>
//       </div>
//       {active && (
//         <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: card.accent }} />
//       )}
//     </div>
//   );
// }

// // ─── Bar Chart ────────────────────────────────────────────────────────────────

// function BarChart({ period }: { period: keyof typeof DATA_BY_PERIOD }) {
//   const [mounted, setMounted] = useState(false);
//   const [tooltip, setTooltip] = useState<number | null>(null);
//   const data = DATA_BY_PERIOD[period];
//   const maxVal = Math.max(...data.values);

//   useEffect(() => {
//     setMounted(false);
//     const t = setTimeout(() => setMounted(true), 80);
//     return () => clearTimeout(t);
//   }, [period]);

//   return (
//     <div className="flex gap-3">
//       <div className="flex flex-col justify-between pb-6 text-right">
//         {[maxVal, Math.round(maxVal * 0.7), Math.round(maxVal * 0.4), Math.round(maxVal * 0.2), 0].map((n) => (
//           <span key={n} className="text-[9px] text-slate-700 leading-none w-4">{n}</span>
//         ))}
//       </div>
//       <div className="flex-1">
//         <div className="flex items-end gap-1.5 h-36" style={{ position: "relative" }}>
//           {data.values.map((v, i) => {
//             const highlight = data.highlights.includes(i);
//             const heightPct = mounted ? (v / maxVal) * 100 : 0;
//             return (
//               <div
//                 key={i}
//                 className="flex flex-col items-center flex-1 h-full justify-end gap-1"
//                 onMouseEnter={() => setTooltip(i)}
//                 onMouseLeave={() => setTooltip(null)}
//                 style={{ cursor: "default", position: "relative" }}
//               >
//                 {tooltip === i && (
//                   <div
//                     className="absolute text-[10px] font-semibold rounded-md px-1.5 py-0.5 pointer-events-none z-10"
//                     style={{ background: "#1e2d42", color: "#e2e8f0", bottom: "calc(100% - 4px)", whiteSpace: "nowrap" }}
//                   >
//                     {v} {period === "annee" ? "biens" : "acquisitions"}
//                   </div>
//                 )}
//                 <div
//                   className="w-full rounded-t-md"
//                   style={{
//                     height: `${heightPct}%`,
//                     transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
//                     transitionDelay: `${i * 35}ms`,
//                     background: highlight
//                       ? "linear-gradient(to top, #0369a1, #38bdf8)"
//                       : tooltip === i
//                       ? "rgba(14,165,233,0.28)"
//                       : "rgba(14,165,233,0.14)",
//                     boxShadow: highlight ? "0 0 12px rgba(14,165,233,0.35)" : "none",
//                   }}
//                 />
//               </div>
//             );
//           })}
//         </div>
//         <div className="flex gap-1.5 mt-2">
//           {data.labels.map((label, i) => (
//             <span
//               key={i}
//               className="flex-1 text-center"
//               style={{
//                 fontSize: "9px",
//                 color: data.highlights.includes(i) ? "#38bdf8" : "#374151",
//               }}
//             >
//               {label}
//             </span>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Add Asset Modal ──────────────────────────────────────────────────────────

// function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (form: AddFormState) => void }) {
//   const [form, setForm] = useState<AddFormState>({
//     name: "", category: "Informatique", department: "DSI", value: "", status: "actif",
//   });
//   const [saving, setSaving] = useState(false);

//   const set = (k: keyof AddFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
//     setForm((f) => ({ ...f, [k]: e.target.value }));

//   const handleSubmit = async () => {
//     if (!form.name || !form.value) return;
//     setSaving(true);
//     await new Promise((r) => setTimeout(r, 800));
//     onAdd(form);
//     onClose();
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%", background: "#0a1219", border: "1px solid rgba(255,255,255,0.1)",
//     borderRadius: "10px", color: "#e2e8f0", padding: "9px 12px",
//     fontSize: "12px", outline: "none", boxSizing: "border-box",
//   };

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center"
//       style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
//       onClick={(e) => e.target === e.currentTarget && onClose()}
//     >
//       <div
//         className="w-full max-w-md rounded-2xl p-6"
//         style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.1)" }}
//       >
//         <div className="flex items-center justify-between mb-5">
//           <h3 className="text-sm font-semibold text-white">Ajouter un bien</h3>
//           <button
//             onClick={onClose}
//             className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-colors"
//             style={{ background: "rgba(255,255,255,0.04)" }}
//           >
//             <Icons.close />
//           </button>
//         </div>

//         <div className="space-y-3">
//           <div>
//             <label className="block text-[11px] text-slate-500 mb-1.5">Désignation *</label>
//             <input
//               style={inputStyle}
//               placeholder="Ex : MacBook Pro 16″"
//               value={form.name}
//               onChange={set("name")}
//             />
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Catégorie</label>
//               <select style={inputStyle} value={form.category} onChange={set("category")}>
//                 {["Informatique", "Équipement", "Mobilier", "Véhicule", "Téléphonie"].map((c) => (
//                   <option key={c}>{c}</option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Département</label>
//               <select style={inputStyle} value={form.department} onChange={set("department")}>
//                 {["DSI", "RH", "Compta", "Direction", "Logistique"].map((d) => (
//                   <option key={d}>{d}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Valeur (FCFA) *</label>
//               <input
//                 style={inputStyle}
//                 placeholder="Ex : 500000"
//                 type="number"
//                 value={form.value}
//                 onChange={set("value")}
//               />
//             </div>
//             <div>
//               <label className="block text-[11px] text-slate-500 mb-1.5">Statut</label>
//               <select style={inputStyle} value={form.status} onChange={set("status")}>
//                 <option value="actif">Actif</option>
//                 <option value="maintenance">Maintenance</option>
//                 <option value="inactif">Inactif</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="flex gap-2 mt-5">
//           <button
//             onClick={onClose}
//             className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
//             style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
//           >
//             Annuler
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={saving || !form.name || !form.value}
//             className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
//             style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
//           >
//             {saving ? "Enregistrement…" : "Enregistrer"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Main Dashboard ───────────────────────────────────────────────────────────

// export default function Dashboard() {
//   const [tab, setTab] = useState<keyof typeof DATA_BY_PERIOD>("mois");
//   const [activeFilter, setActiveFilter] = useState("all");
//   const [search, setSearch] = useState("");
//   const [sortKey, setSortKey] = useState<keyof Asset>("id");
//   const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
//   const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
//   const [assets, setAssets] = useState<Asset[]>(ALL_ASSETS);
//   const [showModal, setShowModal] = useState(false);
//   const [showAll, setShowAll] = useState(false);
//   const [activeDept, setActiveDept] = useState<string | null>(null);
//   const [now, setNow] = useState(new Date());

//   useEffect(() => {
//     const t = setInterval(() => setNow(new Date()), 60000);
//     return () => clearInterval(t);
//   }, []);

//   const dismissAlert = useCallback((id: string) => {
//     setAlerts((prev) => prev.filter((a) => a.id !== id));
//   }, []);

//   const handleSort = (key: keyof Asset) => {
//     if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     else { setSortKey(key); setSortDir("asc"); }
//   };

//   const handleStatClick = (key: string) => {
//     setActiveFilter((prev) => (prev === key ? "all" : key));
//     setShowAll(false);
//     setSearch("");
//   };

//   const handleAdd = (form: AddFormState) => {
//     const newAsset: Asset = {
//       id: `BN-0${assets.length + 130 + 13}`,
//       name: form.name,
//       category: form.category,
//       department: form.department,
//       status: form.status,
//       date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
//       value: parseInt(form.value, 10) || 0,
//     };
//     setAssets((prev) => [newAsset, ...prev]);
//   };

//   // Filter + sort
//   const filtered = assets
//     .filter((a) => {
//       if (activeFilter !== "all" && a.status !== activeFilter) return false;
//       if (search) {
//         const q = search.toLowerCase();
//         return (
//           a.name.toLowerCase().includes(q) ||
//           a.id.toLowerCase().includes(q) ||
//           a.category.toLowerCase().includes(q) ||
//           a.department.toLowerCase().includes(q)
//         );
//       }
//       return true;
//     })
//     .sort((a, b) => {
//       const av = sortKey === "value" ? Number(a[sortKey]) : a[sortKey];
//       const bv = sortKey === "value" ? Number(b[sortKey]) : b[sortKey];
//       if (av < bv) return sortDir === "asc" ? -1 : 1;
//       if (av > bv) return sortDir === "asc" ? 1 : -1;
//       return 0;
//     });

//   const displayed = showAll ? filtered : filtered.slice(0, 5);

//   const SortIcon = ({ k }: { k: keyof Asset }) => {
//     if (sortKey !== k) return <span className="opacity-20"><Icons.sort /></span>;
//     return sortDir === "asc" ? <Icons.sortUp /> : <Icons.sort />;
//   };

//   const ColHeader = ({ label, k, className = "" }: { label: string; k: keyof Asset; className?: string }) => (
//     <span
//       className={`text-[10px] font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1 cursor-pointer hover:text-slate-400 transition-colors select-none ${className}`}
//       onClick={() => handleSort(k)}
//     >
//       {label} <SortIcon k={k} />
//     </span>
//   );

//   const fmtDate = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
//   const fmtTime = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

//   return (
//     <div className="min-h-full px-7 py-6 space-y-6" style={{ fontFamily: "'DM Sans','Inter',sans-serif" }}>
//       {/* ── Header ── */}
//       <div className="flex items-end justify-between">
//         <div>
//           <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">Aperçu général</p>
//           <h2 className="text-2xl font-bold text-white leading-none">Tableau de bord</h2>
//           <p className="text-sm text-slate-500 mt-1.5">
//             Vue d'ensemble du patrimoine ·{" "}
//             <span className="text-slate-600">{fmtDate} — {fmtTime}</span>
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => setShowModal(true)}
//             className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
//             style={{ background: "linear-gradient(135deg, #0891b2, #0e7490)" }}
//           >
//             <Icons.plus /> Ajouter un bien
//           </button>
//           <button
//             className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
//             style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}
//           >
//             <Icons.export /> Exporter
//           </button>
//         </div>
//       </div>

//       {/* ── Stat Cards ── */}
//       <div className="grid grid-cols-4 gap-4">
//         {STAT_DEFS.map((card) => (
//           <StatCard
//             key={card.key}
//             card={card}
//             active={activeFilter === card.key}
//             onClick={() => handleStatClick(card.key)}
//           />
//         ))}
//       </div>
//       {activeFilter !== "all" && (
//         <div className="flex items-center gap-2 -mt-2">
//           <div
//             className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-2"
//             style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", color: "#38bdf8" }}
//           >
//             <Icons.filter />
//             Filtre actif : {STAT_DEFS.find((s) => s.key === activeFilter)?.label}
//             <button onClick={() => setActiveFilter("all")} className="ml-1 opacity-70 hover:opacity-100">
//               <Icons.x />
//             </button>
//           </div>
//           <span className="text-[11px] text-slate-600">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
//         </div>
//       )}

//       {/* ── Charts row ── */}
//       <div className="grid grid-cols-5 gap-4">
//         {/* Bar chart */}
//         <div className="col-span-3 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Acquisitions</h3>
//               <p className="text-[11px] text-slate-500 mt-1">
//                 {tab === "semaine" ? "Cette semaine" : tab === "mois" ? "Par mois — 2024" : "Par année"}
//               </p>
//             </div>
//             <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
//               {(["semaine", "mois", "annee"] as const).map((t) => (
//                 <button
//                   key={t}
//                   onClick={() => setTab(t)}
//                   className="px-3 py-1.5 text-[11px] font-medium transition-all"
//                   style={{
//                     background: tab === t ? "rgba(14,165,233,0.15)" : "transparent",
//                     color: tab === t ? "#38bdf8" : "#475569",
//                   }}
//                 >
//                   {t === "semaine" ? "Semaine" : t === "mois" ? "Mois" : "Année"}
//                 </button>
//               ))}
//             </div>
//           </div>
//           <BarChart period={tab} />
//         </div>

//         {/* Dept breakdown */}
//         <div className="col-span-2 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Par département</h3>
//               <p className="text-[11px] text-slate-500 mt-1">Cliquez pour filtrer</p>
//             </div>
//             {activeDept && (
//               <button
//                 onClick={() => setActiveDept(null)}
//                 className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
//               >
//                 <Icons.x /> Reset
//               </button>
//             )}
//           </div>
//           <div className="space-y-3.5">
//             {DEPTS.map((dept) => {
//               const pct = Math.round((dept.count / dept.total) * 100);
//               const isActive = activeDept === dept.name;
//               return (
//                 <div
//                   key={dept.name}
//                   className="cursor-pointer group/dept"
//                   onClick={() => setActiveDept(isActive ? null : dept.name)}
//                 >
//                   <div className="flex justify-between items-center mb-1.5">
//                     <div className="flex items-center gap-2">
//                       <span
//                         className="w-2 h-2 rounded-full shrink-0 transition-transform"
//                         style={{
//                           background: dept.color,
//                           transform: isActive ? "scale(1.4)" : "scale(1)",
//                           boxShadow: isActive ? `0 0 6px ${dept.color}` : "none",
//                         }}
//                       />
//                       <span
//                         className="text-[12px] font-medium transition-colors"
//                         style={{ color: isActive ? "#fff" : "#cbd5e1" }}
//                       >
//                         {dept.name}
//                       </span>
//                     </div>
//                     <span className="text-[11px] font-semibold text-slate-500">
//                       {dept.count} <span className="text-slate-700">/ {dept.total}</span>
//                     </span>
//                   </div>
//                   <div
//                     className="h-1.5 w-full rounded-full overflow-hidden transition-all"
//                     style={{
//                       background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
//                     }}
//                   >
//                     <div
//                       className="h-full rounded-full"
//                       style={{
//                         width: `${pct}%`,
//                         background: dept.color,
//                         transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
//                         opacity: activeDept && !isActive ? 0.3 : 1,
//                       }}
//                     />
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//           <div
//             className="flex items-center justify-between mt-5 pt-4"
//             style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
//           >
//             {[
//               { val: assets.length, label: "Total",  color: "#fff"     },
//               { val: assets.filter((a) => a.status === "actif").length,       label: "Actifs",      color: "#10b981" },
//               { val: assets.filter((a) => a.status === "maintenance").length,  label: "Maint.",      color: "#f97316" },
//               { val: alerts.length, label: "Alertes", color: "#ef4444" },
//             ].map(({ val, label, color }) => (
//               <div key={label} className="text-center">
//                 <p className="text-lg font-bold" style={{ color }}>{val}</p>
//                 <p className="text-[10px] text-slate-600">{label}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* ── Bottom row ── */}
//       <div className="grid grid-cols-5 gap-4">
//         {/* Assets table */}
//         <div className="col-span-3 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-4">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">
//                 {activeFilter === "all" ? "Acquisitions récentes" : STAT_DEFS.find((s) => s.key === activeFilter)?.label}
//               </h3>
//               <p className="text-[11px] text-slate-500 mt-1">{filtered.length} bien{filtered.length !== 1 ? "s" : ""}</p>
//             </div>
//             <div className="flex items-center gap-2">
//               {/* Search */}
//               <div
//                 className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
//                 style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
//               >
//                 <span className="text-slate-600"><Icons.search /></span>
//                 <input
//                   className="bg-transparent text-[11px] text-slate-300 outline-none placeholder:text-slate-700 w-28"
//                   placeholder="Rechercher…"
//                   value={search}
//                   onChange={(e) => { setSearch(e.target.value); setShowAll(true); }}
//                 />
//                 {search && (
//                   <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400">
//                     <Icons.x />
//                   </button>
//                 )}
//               </div>
//               {!showAll && filtered.length > 5 && (
//                 <button
//                   onClick={() => setShowAll(true)}
//                   className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors text-slate-400 hover:text-sky-400"
//                   style={{ background: "rgba(14,165,233,0.08)" }}
//                 >
//                   Voir tout →
//                 </button>
//               )}
//             </div>
//           </div>

//           {filtered.length === 0 ? (
//             <div className="py-10 text-center text-slate-600 text-sm">Aucun résultat</div>
//           ) : (
//             <div className="space-y-0.5">
//               {/* Column headers */}
//               <div
//                 className="grid grid-cols-12 gap-2 px-3 pb-2"
//                 style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
//               >
//                 <ColHeader label="ID"       k="id"         className="col-span-1" />
//                 <ColHeader label="Désign."  k="name"       className="col-span-3" />
//                 <ColHeader label="Dept"     k="department" className="col-span-2" />
//                 <ColHeader label="Date"     k="date"       className="col-span-2" />
//                 <ColHeader label="Statut"   k="status"     className="col-span-2" />
//                 <ColHeader label="Valeur"   k="value"      className="col-span-2" />
//               </div>

//               {displayed.map((item) => {
//                 const s = STATUS_STYLES[item.status];
//                 return (
//                   <div
//                     key={item.id}
//                     className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors items-center"
//                   >
//                     <span className="col-span-1 text-[11px] font-mono text-slate-600">
//                       {item.id.replace("BN-", "")}
//                     </span>
//                     <div className="col-span-3">
//                       <p className="text-[12px] font-medium text-white leading-none truncate">{item.name}</p>
//                       <p className="text-[10px] text-slate-600 mt-0.5">{item.category}</p>
//                     </div>
//                     <span className="col-span-2 text-[11px] text-slate-400 truncate">{item.department}</span>
//                     <span className="col-span-2 text-[10px] text-slate-500">{item.date}</span>
//                     <div className="col-span-2">
//                       <span
//                         className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
//                         style={{ background: s.bg, color: s.text }}
//                       >
//                         {s.label}
//                       </span>
//                     </div>
//                     <span className="col-span-2 text-[11px] font-semibold text-slate-300 text-right">
//                       {fmtFCFA(item.value)}
//                     </span>
//                   </div>
//                 );
//               })}

//               {!showAll && filtered.length > 5 && (
//                 <div className="pt-2 text-center">
//                   <button
//                     onClick={() => setShowAll(true)}
//                     className="text-[11px] text-slate-600 hover:text-sky-400 transition-colors"
//                   >
//                     + {filtered.length - 5} bien{filtered.length - 5 > 1 ? "s" : ""} supplémentaire{filtered.length - 5 > 1 ? "s" : ""}
//                   </button>
//                 </div>
//               )}
//               {showAll && filtered.length > 5 && (
//                 <div className="pt-2 text-center">
//                   <button
//                     onClick={() => setShowAll(false)}
//                     className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
//                   >
//                     Réduire ↑
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Alerts */}
//         <div className="col-span-2 rounded-2xl p-5" style={{ background: "#0f1824", border: "1px solid rgba(255,255,255,0.06)" }}>
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-sm font-semibold text-white leading-none">Alertes & notifications</h3>
//               <p className="text-[11px] text-slate-500 mt-1">Éléments nécessitant attention</p>
//             </div>
//             <span
//               className="text-[10px] font-bold px-2 py-0.5 rounded-full"
//               style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
//             >
//               {alerts.length} active{alerts.length !== 1 ? "s" : ""}
//             </span>
//           </div>

//           {alerts.length === 0 ? (
//             <div
//               className="flex flex-col items-center justify-center py-8 rounded-xl text-center"
//               style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}
//             >
//               <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: "rgba(16,185,129,0.12)" }}>
//                 <Icons.check />
//               </div>
//               <p className="text-[12px] text-emerald-500 font-medium">Tout est en ordre</p>
//               <p className="text-[11px] text-slate-600 mt-0.5">Aucune alerte active</p>
//             </div>
//           ) : (
//             <div className="space-y-2.5">
//               {alerts.map((alert) => {
//                 const s = ALERT_STYLES[alert.severity];
//                 return (
//                   <div
//                     key={alert.id}
//                     className="flex gap-3 p-3 rounded-xl group/alert"
//                     style={{ background: s.bg, border: `1px solid ${s.border}` }}
//                   >
//                     <span
//                       className="w-2 h-2 rounded-full shrink-0 mt-1"
//                       style={{ background: s.dot, boxShadow: `0 0 5px ${s.dot}` }}
//                     />
//                     <div className="flex-1 min-w-0">
//                       <p className="text-[12px] text-slate-300 leading-snug">{alert.message}</p>
//                       <p className="text-[10px] text-slate-600 mt-1">{alert.time}</p>
//                     </div>
//                     <button
//                       onClick={() => dismissAlert(alert.id)}
//                       className="text-slate-700 hover:text-slate-400 opacity-0 group-hover/alert:opacity-100 transition-all shrink-0 mt-0.5"
//                     >
//                       <Icons.x />
//                     </button>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <div
//             className="mt-4 pt-4 grid grid-cols-2 gap-3"
//             style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
//           >
//             <div
//               className="rounded-xl p-3 text-center"
//               style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.12)" }}
//             >
//               <p className="text-lg font-bold" style={{ color: "#10b981" }}>
//                 {Math.round((assets.filter((a) => a.status === "actif").length / assets.length) * 100)}%
//               </p>
//               <p className="text-[10px] text-slate-600 mt-0.5">Taux d'activité</p>
//             </div>
//             <div
//               className="rounded-xl p-3 text-center"
//               style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.12)" }}
//             >
//               <p className="text-lg font-bold" style={{ color: "#38bdf8" }}>94%</p>
//               <p className="text-[10px] text-slate-600 mt-0.5">Taux d'affectation</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {showModal && <AddModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
//     </div>
//   );
// }