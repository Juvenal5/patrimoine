// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useRouter } from "next/navigation";

// import Sidebar from './Sidebar/page';

// import Dashboard from './Dashboard/page';
// import Biens from './Biens/page';
// import Affectations from './Affectations/page';
// import Maintenance from './Maintenance/page';
// import Départements from './Départements/page';
// import Fournisseurs from './Fournisseurs/page';
// import Historique from './Historique/page';
// import Utilisateurs from './Utilisateurs/page';

// export type PageId =
//   | 'Tableau de bord'
//   | 'Biens'
//   | 'Affectations'
//   | 'Maintenance'
//   | 'Départements'
//   | 'Fournisseurs'
//   | 'Historique'
//   | 'Utilisateurs';

// export default function Page() {

//   const router = useRouter();

//   const [activePage, setActivePage] = useState<PageId>('Tableau de bord');
//   const [isAuth, setIsAuth] = useState(false);

//   useEffect(() => {
//     const user = localStorage.getItem("user");

//     if (!user) {
//       router.push("/login");
//       return;
//     }

//     setIsAuth(true);
//   }, [router]);

//   const handleLogout = () => {
//     localStorage.removeItem("user");
//     router.push("/login");
//   };

//   if (!isAuth) {
//     return (
//       <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
//         Chargement...
//       </div>
//     );
//   }

//   return (
//     <div className="h-screen flex overflow-hidden bg-slate-950">

//       <Sidebar
//         activePage={activePage}
//         onNavigate={setActivePage}
//         onLogout={handleLogout}
//       />

//       <main className="flex-1 overflow-y-auto">

//         {activePage === 'Tableau de bord' && <Dashboard />}
//         {activePage === 'Biens' && <Biens />}
//         {activePage === 'Affectations' && <Affectations />}
//         {activePage === 'Maintenance' && <Maintenance />}
//         {activePage === 'Départements' && <Départements />}
//         {activePage === 'Fournisseurs' && <Fournisseurs />}
//         {activePage === 'Historique' && <Historique />}
//         {activePage === 'Utilisateurs' && <Utilisateurs />}

//       </main>

//     </div>
//   );
// }






'use client';

import React, { useState } from 'react';

// Sidebar
import Sidebar from './Sidebar/page';

// Pages
import Dashboard from './Dashboard/page';
import Biens from './Biens/page';
import Affectations from './Affectations/page';
import Maintenance from './Maintenance/page';
import Départements from './Départements/page';
import Fournisseurs from './Fournisseurs/page';
import Historique from './Historique/page';
import Utilisateurs from './Utilisateurs/page';

// ✅ Définir le type avec exactement les mêmes labels que dans Sidebar
export type PageId =
  | 'Tableau de bord'
  | 'Biens'
  | 'Affectations'
  | 'Maintenance'
  | 'Départements'
  | 'Fournisseurs'
  | 'Historique'
  | 'Utilisateurs';

export default function Page() {

  // ✅ Typer explicitement le state avec PageId
  const [activePage, setActivePage] = useState<PageId>('Tableau de bord');

  const handleLogout = () => {
    setActivePage('Tableau de bord');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">

      {/* Sidebar fixe */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />

      {/* contenu pages */}
      <main className="flex-1 overflow-y-auto">

        {activePage === 'Tableau de bord' && <Dashboard />}
        {activePage === 'Biens' && <Biens />}
        {activePage === 'Affectations' && <Affectations />}
        {activePage === 'Maintenance' && <Maintenance />}
        {activePage === 'Départements' && <Départements />}
        {activePage === 'Fournisseurs' && <Fournisseurs />}
        {activePage === 'Historique' && <Historique />}
        {activePage === 'Utilisateurs' && <Utilisateurs />}

      </main>

    </div>
  );
}






// 'use client';

// import React, { useState } from 'react';

// // Sidebar
// import Sidebar from './Sidebar/page';

// // Pages
// import Dashboard from './Dashboard/page';
// import Biens from './Biens/page';
// import Affectations from './Affectations/page';
// import Maintenance from './Maintenance/page';
// import Départements from './Départements/page';
// import Fournisseurs from './Fournisseurs/page';
// import Historique from './Historique/page';
// import Utilisateurs from './Utilisateurs/page';

// // ✅ Import de la page Auth
// import AuthPage from './(auth)/auth/page';

// // ✅ Type pages
// export type PageId =
//   | 'Tableau de bord'
//   | 'Biens'
//   | 'Affectations'
//   | 'Maintenance'
//   | 'Départements'
//   | 'Fournisseurs'
//   | 'Historique'
//   | 'Utilisateurs';

// export default function Page() {

//   // ✅ Etat connexion
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   // ✅ Etat page active
//   const [activePage, setActivePage] =
//     useState<PageId>('Tableau de bord');

//   // ✅ Déconnexion
//   const handleLogout = () => {
//     setIsAuthenticated(false);
//     setActivePage('Tableau de bord');
//   };

//   // ✅ Si non connecté → afficher Auth
//   if (!isAuthenticated) {
//     return (
//       <AuthPage
//         onLoginSuccess={() => setIsAuthenticated(true)}
//       />
//     );
//   }

//   // ✅ Si connecté → afficher l'application
//   return (
//     <div className="h-screen flex overflow-hidden bg-slate-950">

//       {/* Sidebar */}
//       <Sidebar
//         activePage={activePage}
//         onNavigate={setActivePage}
//         onLogout={handleLogout}
//       />

//       {/* Pages */}
//       <main className="flex-1 overflow-y-auto">

//         {activePage === 'Tableau de bord' && <Dashboard />}
//         {activePage === 'Biens' && <Biens />}
//         {activePage === 'Affectations' && <Affectations />}
//         {activePage === 'Maintenance' && <Maintenance />}
//         {activePage === 'Départements' && <Départements />}
//         {activePage === 'Fournisseurs' && <Fournisseurs />}
//         {activePage === 'Historique' && <Historique />}
//         {activePage === 'Utilisateurs' && <Utilisateurs />}

//       </main>

//     </div>
//   );
// }




// 'use client';

// import React, { useState } from 'react';

// // Sidebar
// import Sidebar from './Sidebar/page';

// // Pages
// import Dashboard from './Dashboard/page';
// import Bien from './Biens/page';
// import Affectations from './Affectations/page';
// import Maintenance from './Maintenance/page';
// import Departements from './Departements/page';
// import Fournisseurs from './Fournisseurs/page';
// import Historique from './Historique/page';
// import Utilisateurs from './Utilisateurs/page';

// export default function Page() {

//   // mêmes labels que Sidebar
//   const [activePage, setActivePage] =
//     useState('Tableau de bord');

//   const handleLogout = () => {
//     setActivePage('Tableau de bord');
//   };

//   return (
//     <div className="h-screen flex overflow-hidden bg-slate-950">

//       {/* Sidebar fixe */}
//       <Sidebar
//         activePage={activePage}
//         onNavigate={setActivePage}
//         onLogout={handleLogout}
//       />

//       {/* contenu pages */}
//       <main className="flex-1 overflow-y-auto">

//         {activePage === 'Tableau de bord' &&
//           <Dashboard />
//         }

//         {activePage === 'Bien' &&
//           <Bien />
//         }

//         {activePage === 'Affectations' &&
//           <Affectations />
//         }

//         {activePage === 'Maintenance' &&
//           <Maintenance />
//         }

//         {activePage === 'Departements' &&
//           <Departements />
//         }

//         {activePage === 'Fournisseurs' &&
//           <Fournisseurs />
//         }

//         {activePage === 'Historique' &&
//           <Historique />
//         }

//         {activePage === 'Utilisateurs' &&
//           <Utilisateurs />
//         }

//       </main>

//     </div>
//   );
// }