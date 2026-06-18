import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { departement: { select: { nom: true } } },
        });

        if (!user) {
          throw new Error("Aucun compte associé à cet e-mail");
        }

        if (!user.actif) {
          throw new Error("Ce compte a été désactivé");
        }

        const passwordOk = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordOk) {
          throw new Error("Mot de passe incorrect");
        }

        // Marquer updatedAt pour le statut en ligne
        await prisma.user.update({
          where: { id: user.id },
          data: { updatedAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          actif: user.actif,
          departement: user.departement?.nom ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nom = (user as any).nom;
        token.prenom = (user as any).prenom;
        token.role = (user as any).role;
        token.actif = (user as any).actif;
        token.departement = (user as any).departement;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id;
        (session.user as any).nom = token.nom;
        (session.user as any).prenom = token.prenom;
        (session.user as any).role = token.role;
        (session.user as any).actif = token.actif;
        (session.user as any).departement = token.departement;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth",
    error: "/auth",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 heures
  },

  secret: process.env.NEXTAUTH_SECRET,
};






// /* ═══════════════════════════════════════════════════════════════
//    userStorage.ts  —  Gestion des utilisateurs & logs d'activité
//    Utilise localStorage pour persister les données entre sessions.
//    ═══════════════════════════════════════════════════════════════ */

// export interface RegisteredUser {
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   passwordHash: string; // en prod : bcrypt ; ici sha-like simplifié
//   role: string;
//   createdAt: string;
// }

// export interface ActivityLog {
//   id: string;
//   userId: string;
//   userEmail: string;
//   userName: string;
//   userRole: string;
//   action: "login" | "logout" | "register" | "login_failed";
//   timestamp: string;
//   details?: string;
// }

// const USERS_KEY    = "patrimoine_users";
// const LOGS_KEY     = "patrimoine_activity_logs";
// const SESSION_KEY  = "patrimoine_current_session";

// /* ── Hash simple (non-cryptographique, à remplacer par bcrypt en prod) ── */
// function simpleHash(str: string): string {
//   let hash = 0;
//   for (let i = 0; i < str.length; i++) {
//     const char = str.charCodeAt(i);
//     hash = (hash << 5) - hash + char;
//     hash |= 0;
//   }
//   return Math.abs(hash).toString(36) + str.length.toString(36);
// }

// /* ── Lecture / écriture localStorage ── */
// function getUsers(): RegisteredUser[] {
//   try {
//     return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
//   } catch { return []; }
// }

// function saveUsers(users: RegisteredUser[]): void {
//   localStorage.setItem(USERS_KEY, JSON.stringify(users));
// }

// function getLogs(): ActivityLog[] {
//   try {
//     return JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
//   } catch { return []; }
// }

// function saveLogs(logs: ActivityLog[]): void {
//   localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
// }

// function addLog(log: Omit<ActivityLog, "id" | "timestamp">): void {
//   const logs = getLogs();
//   logs.unshift({
//     ...log,
//     id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
//     timestamp: new Date().toISOString(),
//   });
//   // Garder les 500 derniers logs maximum
//   saveLogs(logs.slice(0, 500));
// }

// /* ══════════════════════════════════════════════════════════════════
//    API publique
//    ══════════════════════════════════════════════════════════════════ */

// /** Inscrit un nouvel utilisateur. Retourne une erreur si l'e-mail existe déjà. */
// export function registerUser(data: {
//   firstName: string;
//   lastName: string;
//   email: string;
//   password: string;
//   role: string;
// }): { success: boolean; error?: string; user?: RegisteredUser } {
//   const users = getUsers();
//   const emailLower = data.email.toLowerCase().trim();

//   if (users.find((u) => u.email.toLowerCase() === emailLower)) {
//     return { success: false, error: "Un compte avec cet e-mail existe déjà." };
//   }

//   const user: RegisteredUser = {
//     id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
//     firstName: data.firstName.trim(),
//     lastName: data.lastName.trim(),
//     email: emailLower,
//     passwordHash: simpleHash(data.password),
//     role: data.role,
//     createdAt: new Date().toISOString(),
//   };

//   users.push(user);
//   saveUsers(users);

//   addLog({
//     userId: user.id,
//     userEmail: user.email,
//     userName: `${user.firstName} ${user.lastName}`,
//     userRole: user.role,
//     action: "register",
//     details: `Nouveau compte créé — rôle : ${user.role}`,
//   });

//   return { success: true, user };
// }

// /** Connecte un utilisateur. Vérifie existence + mot de passe. */
// export function loginUser(email: string, password: string): {
//   success: boolean;
//   error?: string;
//   user?: RegisteredUser;
// } {
//   const users = getUsers();
//   const emailLower = email.toLowerCase().trim();
//   const user = users.find((u) => u.email.toLowerCase() === emailLower);

//   if (!user) {
//     addLog({
//       userId: "unknown",
//       userEmail: emailLower,
//       userName: "Inconnu",
//       userRole: "—",
//       action: "login_failed",
//       details: "Compte non trouvé",
//     });
//     return {
//       success: false,
//       error: "Aucun compte trouvé avec cet e-mail. Veuillez vous inscrire.",
//     };
//   }

//   if (user.passwordHash !== simpleHash(password)) {
//     addLog({
//       userId: user.id,
//       userEmail: user.email,
//       userName: `${user.firstName} ${user.lastName}`,
//       userRole: user.role,
//       action: "login_failed",
//       details: "Mot de passe incorrect",
//     });
//     return { success: false, error: "Mot de passe incorrect." };
//   }

//   // Sauvegarder la session courante
//   localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, loginTime: new Date().toISOString() }));

//   addLog({
//     userId: user.id,
//     userEmail: user.email,
//     userName: `${user.firstName} ${user.lastName}`,
//     userRole: user.role,
//     action: "login",
//     details: "Connexion réussie",
//   });

//   return { success: true, user };
// }

// /** Déconnecte l'utilisateur courant et enregistre l'événement. */
// export function logoutUser(userId: string): void {
//   const users = getUsers();
//   const user = users.find((u) => u.id === userId);
//   if (!user) return;

//   localStorage.removeItem(SESSION_KEY);

//   addLog({
//     userId: user.id,
//     userEmail: user.email,
//     userName: `${user.firstName} ${user.lastName}`,
//     userRole: user.role,
//     action: "logout",
//     details: "Déconnexion",
//   });
// }

// /** Récupère la session active (ou null). */
// export function getCurrentSession(): { userId: string; loginTime: string } | null {
//   try {
//     return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
//   } catch { return null; }
// }

// /** Récupère tous les logs d'activité (pour la page Utilisateurs). */
// export function getActivityLogs(): ActivityLog[] {
//   return getLogs();
// }

// /** Récupère tous les utilisateurs inscrits. */
// export function getAllUsers(): RegisteredUser[] {
//   return getUsers();
// }

// /** Récupère un utilisateur par son ID. */
// export function getUserById(id: string): RegisteredUser | undefined {
//   return getUsers().find((u) => u.id === id);
// }

// /** Labels lisibles pour les rôles. */
// export const ROLE_LABELS: Record<string, string> = {
//   daf: "Dir. Administratif & Financier",
//   comptable: "Comptable",
//   gestionnaire: "Gestionnaire de patrimoine",
//   auditeur: "Auditeur interne",
//   admin: "Administrateur système",
//   informaticien: "Informaticien",
//   fournisseur: "Fournisseur",
//   rh: "Ressource Humaine",
// };