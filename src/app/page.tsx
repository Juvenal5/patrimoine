'use client';

import React, { useState } from 'react';

// ── Auth
import AuthPage from './(auth)/auth/page';

// ── Sidebar
import Sidebar from './Sidebar/page';

// ── Pages
import Dashboard      from './Dashboard/page';
import Biens          from './Biens/page';
import Affectations   from './Affectations/page';
import Maintenance    from './Maintenance/page';
import Départements   from './Départements/page';
import Fournisseurs   from './Fournisseurs/page';
import Historique     from './Historique/page';
import Utilisateurs   from './Utilisateurs/page';

// ── Types
export type PageId =
  | 'Tableau de bord'
  | 'Biens'
  | 'Affectations'
  | 'Maintenance'
  | 'Départements'
  | 'Fournisseurs'
  | 'Historique'
  | 'Utilisateurs';

// ─────────────────────────────────────────────────────────────────────────────
export default function RootPage() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage]           = useState<PageId>('Tableau de bord');

  /* called by AuthPage on login OR register success */
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActivePage('Tableau de bord');
  };

  /* called by Sidebar logout button */
  const handleLogout = () => {
    setIsAuthenticated(false);
    setActivePage('Tableau de bord');
  };

  // ── Not authenticated → show auth page ──────────────────────────────────
  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Authenticated → show app layout ─────────────────────────────────────
  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">

      {/* Sidebar fixe */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />

      {/* Contenu pages */}
      <main className="flex-1 overflow-y-auto">
        {activePage === 'Tableau de bord' && <Dashboard />}
        {activePage === 'Biens'           && <Biens />}
        {activePage === 'Affectations'    && <Affectations />}
        {activePage === 'Maintenance'     && <Maintenance />}
        {activePage === 'Départements'    && <Départements />}
        {activePage === 'Fournisseurs'    && <Fournisseurs />}
        {activePage === 'Historique'      && <Historique />}
        {activePage === 'Utilisateurs'    && <Utilisateurs />}
      </main>

    </div>
  );
}