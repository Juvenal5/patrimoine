"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PageId =
  | "Tableau de bord"
  | "Biens"
  | "Affectations"
  | "Maintenance"
  | "Départements"
  | "Fournisseurs"
  | "Historique"
  | "Utilisateurs";

interface NavItem {
  label: PageId;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: "cyan" | "orange" | "red";
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  onLogout?: () => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Package: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  ArrowLeftRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  ),
  Wrench: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Building: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  ),
  Truck: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
      <rect x="9" y="11" width="14" height="10" rx="2" />
      <circle cx="12" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

// ─── Nav data ─────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    section: "PRINCIPAL",
    items: [
      { label: "Tableau de bord", icon: <Icons.Dashboard /> },
      { label: "Biens",           icon: <Icons.Package />,       badge: "" },
      { label: "Affectations",    icon: <Icons.ArrowLeftRight /> },
      { label: "Maintenance",     icon: <Icons.Wrench />,        badge: "", badgeVariant: "orange" },
    ],
  },
  {
    section: "RÉFÉRENTIELS",
    items: [
      { label: "Départements", icon: <Icons.Building /> },
      { label: "Fournisseurs", icon: <Icons.Truck />   },
      { label: "Historique",   icon: <Icons.Clock />   },
      { label: "Utilisateurs", icon: <Icons.Users />   },
    ],
  },
];

const BADGE_COLORS: Record<"cyan" | "orange" | "red", { bg: string; text: string }> = {
  cyan:   { bg: "rgba(34,211,238,0.12)",  text: "#22d3ee" },
  orange: { bg: "rgba(251,146,60,0.15)",  text: "#fb923c" },
  red:    { bg: "rgba(239,68,68,0.15)",   text: "#f87171" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({
  activePage,
  onNavigate,
  userName     = "Admin Principal",
  userRole     = "Super Administrateur",
  userInitials = "AP",
  onLogout,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col shrink-0 h-screen transition-all duration-300"
      style={{
        width: collapsed ? 68 : 240,
        background: "linear-gradient(180deg, #0f1824 0%, #0a0f1a 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center h-16 px-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
            boxShadow: "0 4px 14px rgba(14,165,233,0.35)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="white" fillOpacity="0.95" />
            <polyline points="9 22 9 12 15 12 15 22" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          </svg>
        </div>

        {!collapsed && (
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-bold text-white tracking-wide leading-none">PatrimoineX</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Gestion des actifs</p>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all shrink-0"
          aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            className="transition-transform duration-300"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-slate-600 px-3 mb-1.5">
                {group.section}
              </p>
            )}
            {collapsed && (
              <div className="h-px mx-2 mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activePage === item.label;
                const badgeStyle = BADGE_COLORS[item.badgeVariant ?? "cyan"];

                return (
                  <li key={item.label}>
                    <button
                      onClick={() => onNavigate(item.label)}
                      title={collapsed ? item.label : undefined}
                      className="group w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative"
                      style={{
                        padding: collapsed ? "10px 0" : "9px 12px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        background: isActive ? "rgba(14,165,233,0.1)" : "transparent",
                        border: `1px solid ${isActive ? "rgba(14,165,233,0.18)" : "transparent"}`,
                        color: isActive ? "#e2e8f0" : "#64748b",
                      }}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                          style={{
                            width: 3,
                            height: 18,
                            background: "linear-gradient(to bottom, #38bdf8, #0ea5e9)",
                            boxShadow: "0 0 8px rgba(14,165,233,0.6)",
                          }}
                        />
                      )}

                      {/* Icon */}
                      <span
                        className="shrink-0 transition-colors"
                        style={{ color: isActive ? "#38bdf8" : "#475569" }}
                      >
                        {item.icon}
                      </span>

                      {/* Label */}
                      {!collapsed && (
                        <span className="flex-1 text-left text-[13px] font-medium truncate">
                          {item.label}
                        </span>
                      )}

                      {/* Badge */}
                      {!collapsed && item.badge && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: badgeStyle.bg, color: badgeStyle.text }}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Badge dot (collapsed) */}
                      {collapsed && item.badge && (
                        <span
                          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: badgeStyle.text }}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex items-center gap-2.5 p-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
            }}
          >
            {userInitials}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white truncate leading-none">{userName}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#10b981", boxShadow: "0 0 4px rgba(16,185,129,0.6)" }}
                  />
                  <p className="text-[10px] text-slate-500 truncate">{userRole}</p>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  aria-label="Se déconnecter"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Icons.Logout />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}






// "use client";

// import { useState } from "react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// export type PageId =
//   | "Tableau de bord"
//   | "Biens"
//   | "Affectations"
//   | "Maintenance"
//   | "Départements"
//   | "Fournisseurs"
//   | "Historique"
//   | "Utilisateurs";

// interface NavItem {
//   label: PageId;
//   icon: React.ReactNode;
//   badge?: string;
//   badgeVariant?: "cyan" | "orange" | "red";
// }

// interface NavGroup {
//   section: string;
//   items: NavItem[];
// }

// interface SidebarProps {
//   activePage: PageId;
//   onNavigate: (page: PageId) => void;
//   userName?: string;
//   userRole?: string;
//   userInitials?: string;
//   onLogout?: () => void;
// }

// // ─── Icons ────────────────────────────────────────────────────────────────────

// const Icons = {
//   Dashboard: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <rect x="3" y="3" width="7" height="7" rx="1" />
//       <rect x="14" y="3" width="7" height="7" rx="1" />
//       <rect x="3" y="14" width="7" height="7" rx="1" />
//       <rect x="14" y="14" width="7" height="7" rx="1" />
//     </svg>
//   ),
//   Package: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
//       <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
//       <line x1="12" y1="22.08" x2="12" y2="12" />
//     </svg>
//   ),
//   ArrowLeftRight: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M8 3 4 7l4 4" />
//       <path d="M4 7h16" />
//       <path d="m16 21 4-4-4-4" />
//       <path d="M20 17H4" />
//     </svg>
//   ),
//   Wrench: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
//     </svg>
//   ),
//   Building: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <rect x="4" y="2" width="16" height="20" rx="2" />
//       <path d="M9 22v-4h6v4" />
//       <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 14h.01" />
//     </svg>
//   ),
//   Truck: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
//       <rect x="9" y="11" width="14" height="10" rx="2" />
//       <circle cx="12" cy="21" r="1" />
//       <circle cx="20" cy="21" r="1" />
//     </svg>
//   ),
//   Clock: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="12" cy="12" r="10" />
//       <polyline points="12 6 12 12 16 14" />
//     </svg>
//   ),
//   Users: () => (
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//       <circle cx="9" cy="7" r="4" />
//       <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//       <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//     </svg>
//   ),
//   Logout: () => (
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
//       <polyline points="16 17 21 12 16 7" />
//       <line x1="21" y1="12" x2="9" y2="12" />
//     </svg>
//   ),
// };

// // ─── Nav data ─────────────────────────────────────────────────────────────────

// const NAV_GROUPS: NavGroup[] = [
//   {
//     section: "PRINCIPAL",
//     items: [
//       { label: "Tableau de bord", icon: <Icons.Dashboard /> },
//       { label: "Biens",           icon: <Icons.Package />,       badge: "11" },
//       { label: "Affectations",    icon: <Icons.ArrowLeftRight /> },
//       { label: "Maintenance",     icon: <Icons.Wrench />,        badge: "5", badgeVariant: "orange" },
//     ],
//   },
//   {
//     section: "RÉFÉRENTIELS",
//     items: [
//       { label: "Départements", icon: <Icons.Building /> },
//       { label: "Fournisseurs", icon: <Icons.Truck />   },
//       { label: "Historique",   icon: <Icons.Clock />   },
//       { label: "Utilisateurs", icon: <Icons.Users />   },
//     ],
//   },
// ];

// const BADGE_COLORS: Record<"cyan" | "orange" | "red", { bg: string; text: string }> = {
//   cyan:   { bg: "rgba(34,211,238,0.12)",  text: "#22d3ee" },
//   orange: { bg: "rgba(251,146,60,0.15)",  text: "#fb923c" },
//   red:    { bg: "rgba(239,68,68,0.15)",   text: "#f87171" },
// };

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function Sidebar({
//   activePage,
//   onNavigate,
//   userName     = "Admin Principal",
//   userRole     = "Super Administrateur",
//   userInitials = "AP",
//   onLogout,
// }: SidebarProps) {
//   const [collapsed, setCollapsed] = useState(false);

//   return (
//     <aside
//       className="flex flex-col shrink-0 h-screen transition-all duration-300"
//       style={{
//         width: collapsed ? 68 : 240,
//         background: "linear-gradient(180deg, #0f1824 0%, #0a0f1a 100%)",
//         borderRight: "1px solid rgba(255,255,255,0.05)",
//       }}
//     >
//       {/* ── Logo ── */}
//       <div
//         className="flex items-center h-16 px-4 shrink-0"
//         style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
//       >
//         {/* Icon */}
//         <div
//           className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
//           style={{
//             background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
//             boxShadow: "0 4px 14px rgba(14,165,233,0.35)",
//           }}
//         >
//           <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//             <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="white" fillOpacity="0.95" />
//             <polyline points="9 22 9 12 15 12 15 22" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
//           </svg>
//         </div>

//         {!collapsed && (
//           <div className="ml-3 flex-1 min-w-0">
//             <p className="text-sm font-bold text-white tracking-wide leading-none">PatrimoineX</p>
//             <p className="text-[10px] text-slate-500 mt-0.5">Gestion des actifs</p>
//           </div>
//         )}

//         {/* Collapse toggle */}
//         <button
//           onClick={() => setCollapsed((c) => !c)}
//           className="ml-auto p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all shrink-0"
//           aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
//         >
//           <svg
//             width="13" height="13" viewBox="0 0 24 24" fill="none"
//             stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
//             className="transition-transform duration-300"
//             style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
//           >
//             <polyline points="15 18 9 12 15 6" />
//           </svg>
//         </button>
//       </div>

//       {/* ── Nav ── */}
//       <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-5">
//         {NAV_GROUPS.map((group) => (
//           <div key={group.section}>
//             {!collapsed && (
//               <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-slate-600 px-3 mb-1.5">
//                 {group.section}
//               </p>
//             )}
//             {collapsed && (
//               <div className="h-px mx-2 mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />
//             )}

//             <ul className="space-y-0.5">
//               {group.items.map((item) => {
//                 const isActive = activePage === item.label;
//                 const badgeStyle = BADGE_COLORS[item.badgeVariant ?? "cyan"];

//                 return (
//                   <li key={item.label}>
//                     <button
//                       onClick={() => onNavigate(item.label)}
//                       title={collapsed ? item.label : undefined}
//                       className="group w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative"
//                       style={{
//                         padding: collapsed ? "10px 0" : "9px 12px",
//                         justifyContent: collapsed ? "center" : "flex-start",
//                         background: isActive ? "rgba(14,165,233,0.1)" : "transparent",
//                         border: `1px solid ${isActive ? "rgba(14,165,233,0.18)" : "transparent"}`,
//                         color: isActive ? "#e2e8f0" : "#64748b",
//                       }}
//                     >
//                       {/* Active left bar */}
//                       {isActive && (
//                         <span
//                           className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
//                           style={{
//                             width: 3,
//                             height: 18,
//                             background: "linear-gradient(to bottom, #38bdf8, #0ea5e9)",
//                             boxShadow: "0 0 8px rgba(14,165,233,0.6)",
//                           }}
//                         />
//                       )}

//                       {/* Icon */}
//                       <span
//                         className="shrink-0 transition-colors"
//                         style={{ color: isActive ? "#38bdf8" : "#475569" }}
//                       >
//                         {item.icon}
//                       </span>

//                       {/* Label */}
//                       {!collapsed && (
//                         <span className="flex-1 text-left text-[13px] font-medium truncate">
//                           {item.label}
//                         </span>
//                       )}

//                       {/* Badge */}
//                       {!collapsed && item.badge && (
//                         <span
//                           className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
//                           style={{ background: badgeStyle.bg, color: badgeStyle.text }}
//                         >
//                           {item.badge}
//                         </span>
//                       )}

//                       {/* Badge dot (collapsed) */}
//                       {collapsed && item.badge && (
//                         <span
//                           className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
//                           style={{ background: badgeStyle.text }}
//                         />
//                       )}
//                     </button>
//                   </li>
//                 );
//               })}
//             </ul>
//           </div>
//         ))}
//       </nav>

//       {/* ── User ── */}
//       <div
//         className="shrink-0 p-3"
//         style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
//       >
//         <div
//           className="flex items-center gap-2.5 p-2 rounded-xl"
//           style={{ background: "rgba(255,255,255,0.03)" }}
//         >
//           {/* Avatar */}
//           <div
//             className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
//             style={{
//               background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
//               boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
//             }}
//           >
//             {userInitials}
//           </div>

//           {!collapsed && (
//             <>
//               <div className="flex-1 min-w-0">
//                 <p className="text-[12px] font-semibold text-white truncate leading-none">{userName}</p>
//                 <div className="flex items-center gap-1 mt-1">
//                   <span
//                     className="w-1.5 h-1.5 rounded-full shrink-0"
//                     style={{ background: "#10b981", boxShadow: "0 0 4px rgba(16,185,129,0.6)" }}
//                   />
//                   <p className="text-[10px] text-slate-500 truncate">{userRole}</p>
//                 </div>
//               </div>

//               {onLogout && (
//                 <button
//                   onClick={onLogout}
//                   aria-label="Se déconnecter"
//                   className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
//                 >
//                   <Icons.Logout />
//                 </button>
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </aside>
//   );
// }
