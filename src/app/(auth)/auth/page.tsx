// "use client";

// import { useState, useEffect } from "react";
// import { signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";

// // ─────────────────────────────────────────────
// //  Types
// // ─────────────────────────────────────────────
// export interface RegisteredUser {
//   id: string;
//   nom: string;
//   prenom: string;
//   email: string;
//   role: string;
// }

// interface AuthPageProps {
//   onLoginSuccess?: (user: RegisteredUser) => void;
// }

// type FormView = "login" | "register" | "forgot";

// interface InputFieldProps {
//   label: string;
//   type: string;
//   placeholder: string;
//   value: string;
//   onChange: (v: string) => void;
//   icon: React.ReactNode;
//   error?: string;
//   autoComplete?: string;
// }

// // ─────────────────────────────────────────────
// //  Icônes
// // ─────────────────────────────────────────────
// const EyeIcon = ({ open }: { open: boolean }) =>
//   open ? (
//     <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//       <circle cx="12" cy="12" r="3" />
//     </svg>
//   ) : (
//     <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
//       <line x1="1" y1="1" x2="23" y2="23" />
//     </svg>
//   );

// const ErrorIcon = () => (
//   <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
//     <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
//   </svg>
// );

// // ─────────────────────────────────────────────
// //  InputField
// // ─────────────────────────────────────────────
// function InputField({ label, type, placeholder, value, onChange, icon, error, autoComplete }: InputFieldProps) {
//   const [showPwd, setShowPwd] = useState(false);
//   const [focused, setFocused] = useState(false);
//   const isPassword = type === "password";
//   const inputType = isPassword ? (showPwd ? "text" : "password") : type;
//   const hasError = !!error;
//   const inputId = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;

//   return (
//     <div style={{ marginBottom: "18px" }}>
//       <label
//         htmlFor={inputId}
//         style={{
//           display: "block", fontSize: "11px", fontWeight: 600,
//           letterSpacing: "0.04em",
//           color: hasError ? "#e2766e" : "#8b97a8",
//           marginBottom: "7px", fontFamily: "'Inter', system-ui, sans-serif",
//           transition: "color 0.2s",
//         }}
//       >
//         {label} <span style={{ color: "#5b9bd1" }}>*</span>
//       </label>
//       <div style={{
//         position: "relative", display: "flex", alignItems: "center",
//         background: hasError ? "rgba(226,118,110,0.06)" : focused ? "rgba(91,155,209,0.08)" : "rgba(255,255,255,0.025)",
//         border: `1px solid ${hasError ? "rgba(226,118,110,0.55)" : focused ? "rgba(91,155,209,0.55)" : "rgba(255,255,255,0.09)"}`,
//         borderRadius: "9px", transition: "all 0.2s ease",
//       }}>
//         <span style={{
//           position: "absolute", left: "13px",
//           color: hasError ? "rgba(226,118,110,0.75)" : focused ? "#5b9bd1" : "rgba(255,255,255,0.25)",
//           transition: "color 0.2s", display: "flex", alignItems: "center",
//         }}>{icon}</span>
//         <input
//           id={inputId}
//           type={inputType}
//           placeholder={placeholder}
//           value={value}
//           autoComplete={autoComplete}
//           onChange={(e) => onChange(e.target.value)}
//           onFocus={() => setFocused(true)}
//           onBlur={() => setFocused(false)}
//           style={{
//             width: "100%", background: "transparent", border: "none", outline: "none",
//             padding: "12px 14px 12px 42px", color: "#eef2f7", fontSize: "13.5px",
//             fontFamily: "'Inter', system-ui, sans-serif",
//           }}
//         />
//         {isPassword && (
//           <button
//             type="button"
//             onClick={() => setShowPwd(!showPwd)}
//             aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
//             style={{
//               position: "absolute", right: "13px", background: "none", border: "none",
//               color: "rgba(255,255,255,0.32)", cursor: "pointer", padding: "0",
//               display: "flex", alignItems: "center",
//             }}
//           >
//             <EyeIcon open={showPwd} />
//           </button>
//         )}
//       </div>
//       {hasError && (
//         <div style={{
//           display: "flex", alignItems: "center", gap: "6px",
//           marginTop: "6px", padding: "5px 9px",
//           background: "rgba(226,118,110,0.07)", borderRadius: "6px",
//           color: "#e2766e",
//         }}>
//           <ErrorIcon />
//           <span style={{ fontSize: "11px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 }}>
//             {error}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────
// //  Motif signature — sceau de coffre-fort géométrique
// // ─────────────────────────────────────────────
// // Coordonnées des 24 crans pré-calculées (valeurs fixes) pour éviter tout
// // écart d'arrondi en virgule flottante entre le rendu serveur et le rendu client.
// const VAULT_SEAL_TICKS: [number, number, number, number][] = [
//   [110, 60, 116, 60],
//   [108.3, 72.94, 114.09, 74.49],
//   [103.3, 85, 108.5, 88],
//   [95.36, 95.36, 99.6, 99.6],
//   [85, 103.3, 88, 108.5],
//   [72.94, 108.3, 74.49, 114.09],
//   [60, 110, 60, 116],
//   [47.06, 108.3, 45.51, 114.09],
//   [35, 103.3, 32, 108.5],
//   [24.64, 95.36, 20.4, 99.6],
//   [16.7, 85, 11.5, 88],
//   [11.7, 72.94, 5.91, 74.49],
//   [10, 60, 4, 60],
//   [11.7, 47.06, 5.91, 45.51],
//   [16.7, 35, 11.5, 32],
//   [24.64, 24.64, 20.4, 20.4],
//   [35, 16.7, 32, 11.5],
//   [47.06, 11.7, 45.51, 5.91],
//   [60, 10, 60, 4],
//   [72.94, 11.7, 74.49, 5.91],
//   [85, 16.7, 88, 11.5],
//   [95.36, 24.64, 99.6, 20.4],
//   [103.3, 35, 108.5, 32],
//   [108.3, 47.06, 114.09, 45.51],
// ];

// const VaultSeal = () => (
//   <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
//     <circle cx="60" cy="60" r="56" stroke="#3d5a78" strokeWidth="1" opacity="0.4" />
//     <circle cx="60" cy="60" r="46" stroke="#5b9bd1" strokeWidth="1" opacity="0.55" />
//     {VAULT_SEAL_TICKS.map(([x1, y1, x2, y2], i) => (
//       <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5b9bd1" strokeWidth="1.5" opacity="0.5" />
//     ))}
//     <circle cx="60" cy="60" r="28" fill="rgba(91,155,209,0.06)" stroke="#5b9bd1" strokeWidth="1.2" />
//     <circle cx="60" cy="60" r="6" fill="#5b9bd1" opacity="0.85" />
//     <line x1="60" y1="60" x2="60" y2="38" stroke="#5b9bd1" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
//     <line x1="60" y1="60" x2="76" y2="60" stroke="#5b9bd1" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
//   </svg>
// );

// // ─────────────────────────────────────────────
// //  Marque latérale (statique, légère)
// // ─────────────────────────────────────────────
// const BrandPanelArt = () => (
//   <svg viewBox="0 0 400 400" width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.5 }} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
//     <defs>
//       <linearGradient id="lineFade" x1="0" y1="0" x2="1" y2="1">
//         <stop offset="0%" stopColor="#5b9bd1" stopOpacity="0.5" />
//         <stop offset="100%" stopColor="#5b9bd1" stopOpacity="0" />
//       </linearGradient>
//     </defs>
//     {[60, 130, 200, 270, 340].map((y, i) => (
//       <line key={i} x1="0" y1={y} x2="400" y2={y - 40} stroke="url(#lineFade)" strokeWidth="1" />
//     ))}
//   </svg>
// );

// // ─────────────────────────────────────────────
// //  Année affichée dans le pied de page
// //  (figée au chargement du module, identique SSR/client)
// // ─────────────────────────────────────────────
// const CURRENT_YEAR = new Date().getFullYear();

// // ─────────────────────────────────────────────
// //  Clé localStorage pour "Se souvenir de moi"
// // ─────────────────────────────────────────────
// const REMEMBER_KEY = "pat2_remember_email";

// // ─────────────────────────────────────────────
// //  Validation email
// // ─────────────────────────────────────────────
// const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// // ═══════════════════════════════════════════════════
// //  COMPOSANT PRINCIPAL
// // ═══════════════════════════════════════════════════
// export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
//   const router = useRouter();

//   const [view, setView] = useState<FormView>("login");
//   const [animating, setAnimating] = useState(false);
//   const [visible, setVisible] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [mounted, setMounted] = useState(false);

//   // ── Login ──
//   const [loginEmail, setLoginEmail] = useState("");
//   const [loginPassword, setLoginPassword] = useState("");
//   const [loginRememberMe, setLoginRememberMe] = useState(false);
//   const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string; global?: string }>({});

//   // ── Register ──
//   const [regFirstName, setRegFirstName] = useState("");
//   const [regLastName, setRegLastName] = useState("");
//   const [regEmail, setRegEmail] = useState("");
//   const [regPassword, setRegPassword] = useState("");
//   const [regConfirm, setRegConfirm] = useState("");
//   const [regTerms, setRegTerms] = useState(false);
//   const [regErrors, setRegErrors] = useState<{
//     firstName?: string; lastName?: string; email?: string;
//     password?: string; confirm?: string; terms?: string; global?: string;
//   }>({});

//   // ── Forgot ──
//   const [forgotEmail, setForgotEmail] = useState("");
//   const [forgotSent, setForgotSent] = useState(false);
//   const [forgotErrors, setForgotErrors] = useState<{ email?: string }>({});

//   // ── Montage : marque le composant comme hydraté et restaure l'email mémorisé ──
//   useEffect(() => {
//     setMounted(true);
//     try {
//       const saved = localStorage.getItem(REMEMBER_KEY);
//       if (saved) {
//         const parsed = JSON.parse(saved) as { email?: string };
//         if (parsed?.email) {
//           setLoginEmail(parsed.email);
//           setLoginRememberMe(true);
//         }
//       }
//     } catch {
//       // localStorage indisponible (navigation privée, SSR, etc.)
//     }
//   }, []);

//   const REQUIRED_MSG = "Ce champ est requis.";

//   // ── Transition de vue ──
//   const switchView = (next: FormView) => {
//     if (next === view || animating) return;
//     setAnimating(true);
//     setVisible(false);
//     setLoginErrors({});
//     setRegErrors({});
//     setForgotErrors({});
//     window.setTimeout(() => {
//       setView(next);
//       setVisible(true);
//       setAnimating(false);
//       setForgotSent(false);
//     }, 220);
//   };

//   // ── Validations ──
//   const validateLogin = () => {
//     const e: typeof loginErrors = {};
//     if (!loginEmail.trim()) e.email = REQUIRED_MSG;
//     else if (!EMAIL_REGEX.test(loginEmail.trim())) e.email = "Format d'e-mail invalide.";
//     if (!loginPassword) e.password = REQUIRED_MSG;
//     setLoginErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const validateRegister = () => {
//     const e: typeof regErrors = {};
//     if (!regFirstName.trim()) e.firstName = REQUIRED_MSG;
//     if (!regLastName.trim()) e.lastName = REQUIRED_MSG;
//     if (!regEmail.trim()) e.email = REQUIRED_MSG;
//     else if (!EMAIL_REGEX.test(regEmail.trim())) e.email = "Format d'e-mail invalide.";
//     if (!regPassword) e.password = REQUIRED_MSG;
//     else if (regPassword.length < 8) e.password = "Minimum 8 caractères.";
//     if (!regConfirm) e.confirm = REQUIRED_MSG;
//     else if (regConfirm !== regPassword) e.confirm = "Les mots de passe ne correspondent pas.";
//     if (!regTerms) e.terms = "Veuillez accepter les conditions pour continuer.";
//     setRegErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const validateForgot = () => {
//     const e: typeof forgotErrors = {};
//     if (!forgotEmail.trim()) e.email = REQUIRED_MSG;
//     else if (!EMAIL_REGEX.test(forgotEmail.trim())) e.email = "Format d'e-mail invalide.";
//     setForgotErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   // ════════════════════════════════════════════
//   //  CONNEXION — NextAuth credentials
//   // ════════════════════════════════════════════
//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateLogin() || loading) return;
//     setLoading(true);

//     try {
//       const result = await signIn("credentials", {
//         redirect: false,
//         email: loginEmail.trim(),
//         password: loginPassword,
//         rememberMe: String(loginRememberMe),
//       });

//       if (!result) {
//         setLoginErrors({ global: "Impossible de joindre le serveur. Réessayez." });
//         return;
//       }

//       if (result.error) {
//         const msg = result.error;
//         if (msg.includes("e-mail") || msg.includes("Aucun compte") || msg === "CredentialsSignin") {
//           setLoginErrors({ email: "Aucun compte associé à cet e-mail." });
//         } else if (msg.includes("Mot de passe")) {
//           setLoginErrors({ password: "Mot de passe incorrect." });
//         } else if (msg.includes("désactivé")) {
//           setLoginErrors({ global: "Ce compte a été désactivé. Contactez un administrateur." });
//         } else {
//           setLoginErrors({ global: "E-mail ou mot de passe incorrect." });
//         }
//         return;
//       }

//       try {
//         if (loginRememberMe) {
//           localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: loginEmail.trim() }));
//         } else {
//           localStorage.removeItem(REMEMBER_KEY);
//         }
//       } catch {
//         // localStorage indisponible — sans impact sur la connexion
//       }

//       fetch("/api/Utilisateurs/status", { method: "POST" }).catch(() => {});

//       if (onLoginSuccess) {
//         const { getSession } = await import("next-auth/react");
//         const session = await getSession();
//         if (session?.user) {
//           const su = session.user as unknown as { id?: string; nom?: string; prenom?: string; email?: string; role?: string };
//           onLoginSuccess({
//             id: su.id ?? "",
//             nom: su.nom ?? "",
//             prenom: su.prenom ?? "",
//             email: session.user.email ?? "",
//             role: su.role ?? "USER",
//           });
//         }
//       } else {
//         router.push("/Dashboard");
//       }
//     } catch {
//       setLoginErrors({ global: "Une erreur est survenue. Réessayez." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ════════════════════════════════════════════
//   //  INSCRIPTION — API REST puis connexion auto
//   //  Le rôle est toujours USER côté serveur ;
//   //  ce formulaire ne propose et n'envoie aucun rôle.
//   // ════════════════════════════════════════════
//   const handleRegister = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateRegister() || loading) return;
//     setLoading(true);

//     try {
//       const res = await fetch("/api/auth/register", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           nom: regLastName.trim(),
//           prenom: regFirstName.trim(),
//           email: regEmail.trim(),
//           password: regPassword,
//         }),
//       });

//       let data: any = null;
//       try {
//         data = await res.json();
//       } catch {
//         // Réponse non-JSON inattendue
//       }

//       if (!res.ok) {
//         if (res.status === 409) {
//           setRegErrors({ email: "Cet e-mail est déjà utilisé." });
//         } else {
//           setRegErrors({ global: data?.error || "Erreur lors de la création du compte." });
//         }
//         return;
//       }

//       const signInResult = await signIn("credentials", {
//         redirect: false,
//         email: regEmail.trim(),
//         password: regPassword,
//         rememberMe: "false",
//       });

//       if (signInResult?.error) {
//         switchView("login");
//         return;
//       }

//       fetch("/api/Utilisateurs/status", { method: "POST" }).catch(() => {});

//       if (onLoginSuccess && data?.user) {
//         onLoginSuccess(data.user);
//       } else {
//         router.push("/Dashboard");
//       }
//     } catch {
//       setRegErrors({ global: "Une erreur est survenue. Réessayez." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleForgot = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateForgot()) return;
//     // TODO : brancher à un service d'envoi d'e-mail (Resend, Nodemailer, etc.)
//     setForgotSent(true);
//   };

//   // ── Force du mot de passe ──
//   const pwdStrength =
//     regPassword.length === 0 ? -1 :
//       regPassword.length < 6 ? 0 :
//         regPassword.length < 8 ? 1 :
//           regPassword.length < 12 ? 2 : 3;
//   const pwdColors = ["#c4524a", "#cc8b3c", "#5b9bd1", "#4a9d6e"];
//   const pwdLabels = ["Faible", "Moyen", "Bon", "Excellent"];

//   // ════════════════════════════════════════════
//   //  RENDU
//   // ════════════════════════════════════════════
//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');

//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//         ::placeholder { color: rgba(255,255,255,0.22); font-family: 'Inter', system-ui, sans-serif; font-size: 13px; }
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-thumb { background: rgba(91,155,209,0.35); border-radius: 2px; }

//         .auth-root {
//           display: flex; min-height: 100vh; overflow: hidden;
//           background: #0a1018; font-family: 'Inter', system-ui, sans-serif;
//         }
//         .left-panel {
//           width: 44%; flex-shrink: 0; position: relative; overflow: hidden;
//           background: linear-gradient(160deg, #0d1722 0%, #111d2b 60%, #0a1018 100%);
//           display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px 48px;
//         }
//         .right-panel {
//           width: 56%; flex-shrink: 0; display: flex; flex-direction: column;
//           align-items: center; justify-content: center; padding: 48px 36px;
//           background: #0a1018;
//           position: relative; overflow-y: auto;
//         }

//         @keyframes fadeUp {
//           from { opacity: 0; transform: translateY(12px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes dotBounce {
//           0%, 80%, 100% { transform: scale(0); opacity: 0; }
//           40% { transform: scale(1); opacity: 1; }
//         }
//         @keyframes shake {
//           0%, 100% { transform: translateX(0); }
//           20% { transform: translateX(-5px); }
//           40% { transform: translateX(5px); }
//           60% { transform: translateX(-3px); }
//           80% { transform: translateX(3px); }
//         }
//         @keyframes slideDown {
//           from { opacity: 0; transform: translateY(-6px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         @media (prefers-reduced-motion: reduce) {
//           * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
//         }

//         .form-enter { animation: fadeUp 0.32s ease forwards; }

//         .btn-primary {
//           width: 100%; padding: 13px;
//           background: #2f6ea3;
//           border: none; border-radius: 9px; color: #fff;
//           font-family: 'Inter', system-ui, sans-serif; font-size: 13.5px; font-weight: 600;
//           letter-spacing: 0.01em; cursor: pointer;
//           transition: background-color 0.18s, transform 0.12s;
//         }
//         .btn-primary:hover:not(:disabled) { background: #3a7fb8; }
//         .btn-primary:active:not(:disabled) { transform: scale(0.99); }
//         .btn-primary:disabled { opacity: .55; cursor: not-allowed; }
//         .btn-primary:focus-visible { outline: 2px solid #5b9bd1; outline-offset: 2px; }

//         .dot-loader {
//           display: inline-block; width: 6px; height: 6px; border-radius: 50%;
//           background: #fff; margin: 0 2.5px;
//           animation: dotBounce 1.2s infinite ease-in-out;
//         }
//         .dot-loader:nth-child(2) { animation-delay: .15s; }
//         .dot-loader:nth-child(3) { animation-delay: .3s; }

//         .tab-btn {
//           flex: 1; padding: 11px; background: transparent; border: none;
//           border-bottom: 2px solid transparent; color: rgba(255,255,255,0.35);
//           font-family: 'Inter', system-ui, sans-serif; font-size: 12px; font-weight: 600;
//           letter-spacing: 0.04em; cursor: pointer; transition: color 0.18s, border-color 0.18s;
//         }
//         .tab-btn.active { color: #5b9bd1; border-bottom-color: #5b9bd1; }
//         .tab-btn:hover:not(.active) { color: rgba(255,255,255,0.6); }
//         .tab-btn:focus-visible { outline: 2px solid #5b9bd1; outline-offset: -2px; }

//         .link-btn {
//           background: none; border: none; color: #5b9bd1; font-family: 'Inter', system-ui, sans-serif;
//           font-size: 12.5px; font-weight: 500; cursor: pointer; text-decoration: underline;
//           text-underline-offset: 3px; transition: color 0.18s; padding: 0;
//         }
//         .link-btn:hover { color: #7eb3df; }
//         .link-btn:focus-visible { outline: 2px solid #5b9bd1; outline-offset: 2px; border-radius: 2px; }

//         .err-inline {
//           display: flex; align-items: center; gap: 6px;
//           margin-top: 6px; padding: 5px 9px;
//           background: rgba(226,118,110,0.07); border-radius: 6px;
//           font-size: 11px; color: #e2766e; font-family: 'Inter', system-ui, sans-serif;
//           font-weight: 500; animation: slideDown 0.2s ease;
//         }

//         .terms-err {
//           display: flex; align-items: center; gap: 8px;
//           padding: 9px 12px; border-radius: 8px;
//           background: rgba(226,118,110,0.08); border: 1px solid rgba(226,118,110,0.25);
//           font-size: 11.5px; color: #e2766e; font-family: 'Inter', system-ui, sans-serif;
//           font-weight: 500; margin-bottom: 12px; animation: shake 0.36s ease;
//         }

//         .global-err {
//           display: flex; align-items: flex-start; gap: 9px;
//           padding: 11px 14px; border-radius: 9px; margin-bottom: 18px;
//           background: rgba(226,118,110,0.08); border: 1px solid rgba(226,118,110,0.3);
//           animation: slideDown 0.24s ease;
//         }

//         .form-card {
//           background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.06);
//           border-radius: 16px; padding: 30px 28px;
//         }

//         .badge {
//           display: inline-flex; align-items: center; gap: 6px;
//           padding: 4px 11px; border-radius: 20px;
//           background: rgba(91,155,209,0.08); border: 1px solid rgba(91,155,209,0.22);
//           font-size: 10px; color: #7eb3df; font-family: 'Inter', system-ui, sans-serif;
//           font-weight: 600; letter-spacing: 0.05em; margin-bottom: 18px;
//         }

//         .remember-checkbox-wrapper {
//           display: flex; align-items: center; gap: 9px;
//           cursor: pointer; user-select: none; position: relative;
//         }
//         .remember-checkbox-box {
//           width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
//           border: 1.5px solid rgba(91,155,209,0.4);
//           background: rgba(255,255,255,0.02);
//           display: flex; align-items: center; justify-content: center;
//           transition: all 0.18s ease;
//         }
//         .remember-checkbox-box.checked {
//           background: rgba(91,155,209,0.22);
//           border-color: #5b9bd1;
//         }
//         .remember-label {
//           font-size: 12.5px;
//           color: rgba(220,228,238,0.6);
//           font-family: 'Inter', system-ui, sans-serif;
//           transition: color 0.18s;
//         }
//         .remember-label.checked { color: rgba(220,228,238,0.88); }

//         .session-hint {
//           font-size: 10.5px;
//           color: rgba(91,155,209,0.6);
//           margin-left: 4px;
//         }

//         .footer-link {
//           font-size: 11px; color: rgba(220,228,238,0.32); cursor: pointer;
//           letter-spacing: 0.02em; transition: color 0.18s; background: none; border: none; padding: 0;
//         }
//         .footer-link:hover { color: rgba(126,179,223,0.85); }

//         @media (max-width: 860px) {
//           .left-panel { display: none !important; }
//           .right-panel { width: 100% !important; padding: 32px 20px !important; }
//         }
//       `}</style>

//       <div className="auth-root">

//         {/* ══ PANNEAU GAUCHE ══ */}
//         <div className="left-panel">
//           <BrandPanelArt />

//           <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "380px" }}>
//             <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
//               <VaultSeal />
//             </div>

//             <div style={{
//               fontFamily: "'Inter', system-ui, sans-serif", fontSize: "11px", fontWeight: 700,
//               letterSpacing: "0.22em", color: "#5b9bd1", textTransform: "uppercase",
//               marginBottom: "16px", opacity: 0.9,
//             }}>
//               Patrimoine&nbsp;Pro
//             </div>

//             <h1 style={{
//               fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(26px,3vw,32px)",
//               fontWeight: 500, color: "#eef2f7", lineHeight: 1.25, marginBottom: "16px",
//             }}>
//               La gestion patrimoniale,<br />sous bonne garde.
//             </h1>

//             <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "22px" }}>
//               <div style={{ width: "36px", height: "1px", background: "rgba(91,155,209,0.4)" }} />
//               <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#5b9bd1" }} />
//               <div style={{ width: "36px", height: "1px", background: "rgba(91,155,209,0.4)" }} />
//             </div>

//             <p style={{
//               fontSize: "13px", color: "rgba(200,212,228,0.5)", lineHeight: 1.75,
//               fontWeight: 400, maxWidth: "300px", margin: "0 auto",
//             }}>
//               Suivez, affectez et entretenez les actifs de votre entreprise depuis un espace unique et sécurisé.
//             </p>
//           </div>
//         </div>

//         {/* ══ PANNEAU DROIT ══ */}
//         <div className="right-panel">
//           <div style={{ width: "100%", maxWidth: "420px" }}>

//             {/* En-tête */}
//             <div style={{ marginBottom: "24px" }}>
//               <div className="badge">
//                 <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                   <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
//                 </svg>
//                 {view === "login" ? "Connexion sécurisée" : view === "register" ? "Nouveau compte" : "Récupération de compte"}
//               </div>
//               <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "28px", fontWeight: 500, color: "#eef2f7", marginBottom: "6px", lineHeight: 1.15 }}>
//                 {view === "login" ? "Connexion" : view === "register" ? "Créer un compte" : "Mot de passe oublié"}
//               </h2>
//               <p style={{ color: "rgba(200,212,228,0.5)", fontSize: "13px", lineHeight: 1.6 }}>
//                 {view === "login"
//                   ? "Accédez à votre tableau de bord."
//                   : view === "register"
//                     ? "Quelques informations pour démarrer."
//                     : "Indiquez votre e-mail pour réinitialiser votre mot de passe."}
//               </p>
//             </div>

//             {/* Onglets */}
//             {view !== "forgot" && (
//               <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
//                 <button type="button" className={`tab-btn ${view === "login" ? "active" : ""}`} onClick={() => switchView("login")}>
//                   Connexion
//                 </button>
//                 <button type="button" className={`tab-btn ${view === "register" ? "active" : ""}`} onClick={() => switchView("register")}>
//                   Inscription
//                 </button>
//               </div>
//             )}

//             {/* Carte formulaire */}
//             <div className={`form-card ${mounted && visible ? "form-enter" : ""}`} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.18s" }}>

//               {/* ════ CONNEXION ════ */}
//               {view === "login" && (
//                 <form onSubmit={handleLogin} noValidate>
//                   {loginErrors.global && (
//                     <div className="global-err" role="alert">
//                       <span style={{ color: "#e2766e", marginTop: "1px" }}><ErrorIcon /></span>
//                       <span style={{ fontSize: "12.5px", color: "#e2766e", lineHeight: 1.5 }}>{loginErrors.global}</span>
//                     </div>
//                   )}

//                   <InputField
//                     label="Adresse e-mail"
//                     type="email"
//                     placeholder="vous@gmail.com"
//                     value={loginEmail}
//                     autoComplete="email"
//                     onChange={(v) => { setLoginEmail(v); if (loginErrors.email) setLoginErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
//                     error={loginErrors.email}
//                   />
//                   <InputField
//                     label="Mot de passe"
//                     type="password"
//                     placeholder="••••••••"
//                     value={loginPassword}
//                     autoComplete="current-password"
//                     onChange={(v) => { setLoginPassword(v); if (loginErrors.password) setLoginErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
//                     error={loginErrors.password}
//                   />

//                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", marginTop: "-2px" }}>
//                     <label className="remember-checkbox-wrapper">
//                       <input
//                         type="checkbox"
//                         checked={loginRememberMe}
//                         onChange={(e) => setLoginRememberMe(e.target.checked)}
//                         style={{ position: "absolute", opacity: 0, width: 16, height: 16, cursor: "pointer" }}
//                       />
//                       <div className={`remember-checkbox-box ${loginRememberMe ? "checked" : ""}`} aria-hidden="true">
//                         {loginRememberMe && (
//                           <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
//                             <polyline points="2,6 5,9 10,3" stroke="#5b9bd1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
//                           </svg>
//                         )}
//                       </div>
//                       <span className={`remember-label ${loginRememberMe ? "checked" : ""}`}>
//                         Se souvenir de moi
//                         <span className="session-hint">{loginRememberMe ? "· 30 jours" : "· 8 heures"}</span>
//                       </span>
//                     </label>
//                     <button type="button" className="link-btn" onClick={() => switchView("forgot")}>
//                       Mot de passe oublié ?
//                     </button>
//                   </div>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading ? (
//                       <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
//                         <span className="dot-loader" /><span className="dot-loader" /><span className="dot-loader" />
//                       </span>
//                     ) : "Se connecter"}
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12.5px", color: "rgba(200,212,228,0.4)" }}>
//                     Pas encore de compte ?{" "}
//                     <button type="button" className="link-btn" onClick={() => switchView("register")}>S&apos;inscrire</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ INSCRIPTION ════ */}
//               {view === "register" && (
//                 <form onSubmit={handleRegister} noValidate>
//                   {regErrors.global && (
//                     <div className="global-err" role="alert">
//                       <span style={{ color: "#e2766e", marginTop: "1px" }}><ErrorIcon /></span>
//                       <span style={{ fontSize: "12.5px", color: "#e2766e", lineHeight: 1.5 }}>{regErrors.global}</span>
//                     </div>
//                   )}

//                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
//                     <InputField
//                       label="Prénom"
//                       type="text"
//                       placeholder="Jean"
//                       value={regFirstName}
//                       autoComplete="given-name"
//                       onChange={(v) => { setRegFirstName(v); if (regErrors.firstName) setRegErrors(p => ({ ...p, firstName: undefined })); }}
//                       icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
//                       error={regErrors.firstName}
//                     />
//                     <InputField
//                       label="Nom"
//                       type="text"
//                       placeholder="Kouassi"
//                       value={regLastName}
//                       autoComplete="family-name"
//                       onChange={(v) => { setRegLastName(v); if (regErrors.lastName) setRegErrors(p => ({ ...p, lastName: undefined })); }}
//                       icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
//                       error={regErrors.lastName}
//                     />
//                   </div>

//                   <InputField
//                     label="Adresse e-mail professionnelle"
//                     type="email"
//                     placeholder="jean.kouassi@gmail.com"
//                     value={regEmail}
//                     autoComplete="email"
//                     onChange={(v) => { setRegEmail(v); if (regErrors.email) setRegErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
//                     error={regErrors.email}
//                   />

//                   <InputField
//                     label="Mot de passe"
//                     type="password"
//                     placeholder="Minimum 8 caractères"
//                     value={regPassword}
//                     autoComplete="new-password"
//                     onChange={(v) => { setRegPassword(v); if (regErrors.password) setRegErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
//                     error={regErrors.password}
//                   />

//                   {regPassword.length > 0 && (
//                     <div style={{ marginBottom: "16px", marginTop: "-10px" }}>
//                       <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
//                         {[0, 1, 2, 3].map((i) => (
//                           <div key={i} style={{
//                             flex: 1, height: "3px", borderRadius: "2px",
//                             background: pwdStrength >= i ? pwdColors[pwdStrength] : "rgba(255,255,255,0.07)",
//                             transition: "background 0.25s",
//                           }} />
//                         ))}
//                       </div>
//                       <span style={{ fontSize: "10.5px", color: pwdStrength >= 0 ? pwdColors[pwdStrength] : "rgba(200,212,228,0.4)", fontWeight: 600 }}>
//                         {pwdStrength >= 0 ? pwdLabels[pwdStrength] : ""}
//                       </span>
//                     </div>
//                   )}

//                   <InputField
//                     label="Confirmer le mot de passe"
//                     type="password"
//                     placeholder="Répétez le mot de passe"
//                     value={regConfirm}
//                     autoComplete="new-password"
//                     onChange={(v) => { setRegConfirm(v); if (regErrors.confirm) setRegErrors(p => ({ ...p, confirm: undefined })); }}
//                     icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
//                     error={regErrors.confirm}
//                   />

//                   {regErrors.terms && (
//                     <div className="terms-err" role="alert">
//                       <ErrorIcon />
//                       {regErrors.terms}
//                     </div>
//                   )}

//                   <label style={{
//                     display: "flex", alignItems: "flex-start", gap: "9px", cursor: "pointer",
//                     fontSize: "11.5px",
//                     color: regErrors.terms ? "rgba(226,118,110,0.9)" : "rgba(200,212,228,0.55)",
//                     marginBottom: "20px", lineHeight: 1.6,
//                     padding: "10px 12px", borderRadius: "8px",
//                     border: `1px solid ${regErrors.terms ? "rgba(226,118,110,0.3)" : "rgba(255,255,255,0.05)"}`,
//                     background: regErrors.terms ? "rgba(226,118,110,0.05)" : "rgba(255,255,255,0.015)",
//                     transition: "all 0.2s",
//                   }}>
//                     <input
//                       type="checkbox"
//                       checked={regTerms}
//                       onChange={(e) => { setRegTerms(e.target.checked); if (regErrors.terms) setRegErrors(p => ({ ...p, terms: undefined })); }}
//                       style={{ accentColor: "#5b9bd1", marginTop: "2px", flexShrink: 0, width: "14px", height: "14px", cursor: "pointer" }}
//                     />
//                     <span>
//                       J&apos;accepte les{" "}
//                       <span style={{ color: "#5b9bd1", textDecoration: "underline", textUnderlineOffset: "2px" }}>conditions d&apos;utilisation</span>
//                       {" "}et la{" "}
//                       <span style={{ color: "#5b9bd1", textDecoration: "underline", textUnderlineOffset: "2px" }}>politique de confidentialité</span>.
//                     </span>
//                   </label>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading ? (
//                       <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
//                         <span className="dot-loader" /><span className="dot-loader" /><span className="dot-loader" />
//                       </span>
//                     ) : "Créer mon compte"}
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "18px", fontSize: "12.5px", color: "rgba(200,212,228,0.4)" }}>
//                     Déjà inscrit ?{" "}
//                     <button type="button" className="link-btn" onClick={() => switchView("login")}>Se connecter</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ MOT DE PASSE OUBLIÉ ════ */}
//               {view === "forgot" && (
//                 <div>
//                   {forgotSent ? (
//                     <div style={{ textAlign: "center", padding: "20px 0" }}>
//                       <div style={{
//                         width: "60px", height: "60px", borderRadius: "50%",
//                         background: "rgba(91,155,209,0.1)", border: "1px solid rgba(91,155,209,0.35)",
//                         display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px",
//                       }}>
//                         <svg width="26" height="26" fill="none" stroke="#5b9bd1" strokeWidth="2" viewBox="0 0 24 24">
//                           <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
//                         </svg>
//                       </div>
//                       <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "21px", color: "#eef2f7", marginBottom: "10px", fontWeight: 500 }}>
//                         E-mail envoyé
//                       </h3>
//                       <p style={{ fontSize: "13px", color: "rgba(200,212,228,0.55)", lineHeight: 1.7, marginBottom: "24px" }}>
//                         Si un compte existe pour<br />
//                         <span style={{ color: "#5b9bd1", fontWeight: 500 }}>{forgotEmail}</span>,<br />
//                         un lien de réinitialisation vient d&apos;être envoyé.
//                       </p>
//                       <button type="button" className="btn-primary" onClick={() => switchView("login")}>
//                         Retour à la connexion
//                       </button>
//                     </div>
//                   ) : (
//                     <form onSubmit={handleForgot} noValidate>
//                       <div style={{
//                         background: "rgba(91,155,209,0.06)", border: "1px solid rgba(91,155,209,0.18)",
//                         borderRadius: "8px", padding: "12px 14px", marginBottom: "20px",
//                         fontSize: "12.5px", color: "rgba(200,212,228,0.6)", lineHeight: 1.65,
//                       }}>
//                         Indiquez l&apos;adresse e-mail associée à votre compte ; nous vous envoyons les instructions de réinitialisation.
//                       </div>
//                       <InputField
//                         label="Adresse e-mail"
//                         type="email"
//                         placeholder="vous@entreprise.com"
//                         value={forgotEmail}
//                         autoComplete="email"
//                         onChange={(v) => { setForgotEmail(v); if (forgotErrors.email) setForgotErrors({}); }}
//                         icon={<svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
//                         error={forgotErrors.email}
//                       />
//                       <button type="submit" className="btn-primary" style={{ marginTop: "6px" }}>
//                         Envoyer le lien
//                       </button>
//                       <div style={{ textAlign: "center", marginTop: "18px" }}>
//                         <button type="button" className="link-btn" onClick={() => switchView("login")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
//                           <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
//                           Retour à la connexion
//                         </button>
//                       </div>
//                     </form>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Pied de page */}
//             <div style={{ marginTop: "26px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
//               <span style={{ fontSize: "10.5px", color: "rgba(200,212,228,0.25)" }}>© {CURRENT_YEAR} Patrimoine Pro</span>
//               <div style={{ display: "flex", gap: "16px" }}>
//                 <button type="button" className="footer-link">Confidentialité</button>
//                 <button type="button" className="footer-link">Conditions</button>
//                 <button type="button" className="footer-link">Support</button>
//               </div>
//             </div>

//           </div>
//         </div>

//       </div>
//     </>
//   );
// }





"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
export interface RegisteredUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

interface AuthPageProps {
  onLoginSuccess?: (user: RegisteredUser) => void;
}

type FormView = "login" | "register" | "forgot";

interface InputFieldProps {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  error?: string;
}

// ─────────────────────────────────────────────
//  Icônes
// ─────────────────────────────────────────────
const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

// ─────────────────────────────────────────────
//  InputField
// ─────────────────────────────────────────────
function InputField({ label, type, placeholder, value, onChange, icon, error }: InputFieldProps) {
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPwd ? "text" : "password") : type;
  const hasError = !!error;

  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{
        display: "block", fontSize: "10.5px", fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: hasError ? "#fca5a5" : focused ? "#93c5fd" : "#60a5fa",
        marginBottom: "8px", fontFamily: "'Cormorant Garamond', Georgia, serif",
        transition: "color 0.25s",
      }}>
        {label} <span style={{ color: "#f87171" }}>*</span>
      </label>
      <div style={{
        position: "relative", display: "flex", alignItems: "center",
        background: hasError ? "rgba(248,113,113,0.06)" : focused ? "rgba(59,130,246,0.09)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hasError ? "rgba(248,113,113,0.65)" : focused ? "rgba(96,165,250,0.7)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "10px", transition: "all 0.3s ease",
        boxShadow: hasError
          ? "0 0 0 3px rgba(248,113,113,0.1), inset 0 1px 4px rgba(0,0,0,0.25)"
          : focused
            ? "0 0 0 3px rgba(59,130,246,0.13), inset 0 1px 4px rgba(0,0,0,0.25)"
            : "inset 0 1px 4px rgba(0,0,0,0.2)",
      }}>
        <span style={{
          position: "absolute", left: "14px",
          color: hasError ? "rgba(248,113,113,0.8)" : focused ? "#60a5fa" : "rgba(255,255,255,0.22)",
          transition: "color 0.3s", display: "flex", alignItems: "center",
        }}>{icon}</span>
        <input
          type={inputType} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            padding: "13px 14px 13px 46px", color: "#e8f4ff", fontSize: "14px",
            fontFamily: "'Jost', sans-serif", letterSpacing: "0.02em",
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
            position: "absolute", right: "14px", background: "none", border: "none",
            color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "0",
            display: "flex", alignItems: "center", transition: "color 0.2s",
          }}><EyeIcon open={showPwd} /></button>
        )}
      </div>
      {hasError && (
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          marginTop: "6px", padding: "6px 10px",
          background: "rgba(248,113,113,0.08)", borderRadius: "6px",
          border: "1px solid rgba(248,113,113,0.2)",
        }}>
          <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: "11.5px", color: "#fca5a5", fontFamily: "'Jost', sans-serif", fontWeight: 500 }}>
            {error}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  CityscapeSVG
// ─────────────────────────────────────────────
const CityscapeSVG = () => (
  <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "auto", opacity: 0.15 }}
    preserveAspectRatio="xMidYMax meet">
    <defs>
      <linearGradient id="skyline" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.95" />
      </linearGradient>
    </defs>
    <rect x="0" y="200" width="80" height="200" fill="url(#skyline)" />
    <rect x="20" y="150" width="40" height="250" fill="url(#skyline)" />
    <rect x="80" y="220" width="60" height="180" fill="url(#skyline)" />
    <rect x="130" y="170" width="35" height="230" fill="url(#skyline)" />
    <rect x="155" y="130" width="25" height="270" fill="url(#skyline)" />
    <polygon points="230,60 240,80 250,80" fill="url(#skyline)" />
    <rect x="225" y="80" width="30" height="320" fill="url(#skyline)" />
    <rect x="210" y="160" width="60" height="240" fill="url(#skyline)" />
    <rect x="280" y="190" width="90" height="210" fill="url(#skyline)" />
    <rect x="380" y="100" width="50" height="300" fill="url(#skyline)" />
    <rect x="370" y="140" width="70" height="260" fill="url(#skyline)" />
    <rect x="450" y="210" width="70" height="190" fill="url(#skyline)" />
    <rect x="530" y="230" width="55" height="170" fill="url(#skyline)" />
    <rect x="595" y="80" width="55" height="320" fill="url(#skyline)" />
    <polygon points="617,50 622,80 628,80" fill="url(#skyline)" />
    <rect x="680" y="200" width="65" height="200" fill="url(#skyline)" />
    <rect x="755" y="215" width="80" height="185" fill="url(#skyline)" />
    <rect x="845" y="190" width="45" height="210" fill="url(#skyline)" />
    <rect x="900" y="220" width="70" height="180" fill="url(#skyline)" />
    <rect x="980" y="200" width="80" height="200" fill="url(#skyline)" />
    <rect x="1060" y="230" width="60" height="170" fill="url(#skyline)" />
    <rect x="1120" y="210" width="80" height="190" fill="url(#skyline)" />
    <rect x="0" y="390" width="1200" height="10" fill="rgba(59,130,246,0.5)" />
  </svg>
);

// ─────────────────────────────────────────────
//  Particles
// ─────────────────────────────────────────────
interface Particle { width: number; height: number; left: number; top: number; duration: number; delay: number; }

function Particles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    setParticles([...Array(20)].map(() => ({
      width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
      left: Math.random() * 100, top: Math.random() * 100,
      duration: 6 + Math.random() * 8, delay: Math.random() * 6,
    })));
  }, []);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", width: `${p.width}px`, height: `${p.height}px`,
          borderRadius: "50%", background: "rgba(96,165,250,0.6)",
          left: `${p.left}%`, top: `${p.top}%`,
          animation: `float ${p.duration}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Clé localStorage pour "Se souvenir de moi"
// ─────────────────────────────────────────────
const REMEMBER_KEY = "pat2_remember_email";

// ═══════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════
export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const router = useRouter();

  const [view, setView] = useState<FormView>("login");
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  // ── Login ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRememberMe, setLoginRememberMe] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string; global?: string }>({});

  // ── Register ──
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState("");
  const [regTerms, setRegTerms] = useState(false);
  const [regErrors, setRegErrors] = useState<{
    firstName?: string; lastName?: string; email?: string;
    password?: string; confirm?: string; role?: string; terms?: string; global?: string;
  }>({});

  // ── Forgot ──
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotErrors, setForgotErrors] = useState<{ email?: string }>({});

  // ── Restaurer l'email mémorisé au montage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { email } = JSON.parse(saved) as { email: string };
        if (email) {
          setLoginEmail(email);
          setLoginRememberMe(true);
        }
      }
    } catch {
      // localStorage indisponible (SSR ou navigation privée)
    }
  }, []);

  const MSG = "Veuillez remplir ce champ svp";

  // ── Transition de vue ──
  const switchView = (next: FormView) => {
    if (next === view || animating) return;
    setAnimating(true); setVisible(false);
    setLoginErrors({}); setRegErrors({}); setForgotErrors({});
    setTimeout(() => {
      setView(next); setVisible(true); setAnimating(false); setForgotSent(false);
    }, 300);
  };

  // ── Validations ──
  const validateLogin = () => {
    const e: typeof loginErrors = {};
    if (!loginEmail.trim()) e.email = MSG;
    if (!loginPassword.trim()) e.password = MSG;
    setLoginErrors(e);
    return !Object.keys(e).length;
  };

  const validateRegister = () => {
    const e: typeof regErrors = {};
    if (!regFirstName.trim()) e.firstName = MSG;
    if (!regLastName.trim()) e.lastName = MSG;
    if (!regEmail.trim()) e.email = MSG;
    if (!regRole) e.role = "Veuillez sélectionner un rôle svp";
    if (!regPassword.trim()) e.password = MSG;
    else if (regPassword.length < 6) e.password = "Minimum 8 caractères requis";
    if (!regConfirm.trim()) e.confirm = MSG;
    else if (regConfirm !== regPassword) e.confirm = "Les mots de passe ne correspondent pas";
    if (!regTerms) e.terms = "Vous devez accepter les conditions d'utilisation svp";
    setRegErrors(e);
    return !Object.keys(e).length;
  };

  const validateForgot = () => {
    const e: typeof forgotErrors = {};
    if (!forgotEmail.trim()) e.email = MSG;
    setForgotErrors(e);
    return !Object.keys(e).length;
  };

  // ════════════════════════════════════════════
  //  CONNEXION — NextAuth credentials
  // ════════════════════════════════════════════
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: loginEmail,
        password: loginPassword,
        // ← Transmission du choix "Se souvenir de moi" à NextAuth
        rememberMe: String(loginRememberMe),
      });

      if (result?.error) {
        const msg = result.error;
        if (msg.includes("e-mail") || msg.includes("Aucun compte") || msg === "CredentialsSignin") {
          setLoginErrors({ email: "Aucun compte associé à cet e-mail." });
        } else if (msg.includes("Mot de passe")) {
          setLoginErrors({ password: "Mot de passe incorrect." });
        } else if (msg.includes("désactivé")) {
          setLoginErrors({ global: "Ce compte a été désactivé." });
        } else {
          setLoginErrors({ global: "Email ou mot de passe incorrect." });
        }
        return;
      }

      // ── Persistance locale de l'email si "Se souvenir de moi" ──
      try {
        if (loginRememberMe) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: loginEmail }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        // localStorage indisponible
      }

      // Ping heartbeat immédiat → marque "en ligne"
      await fetch("/api/Utilisateurs/status", { method: "POST" }).catch(() => {});

      if (onLoginSuccess) {
        const { getSession } = await import("next-auth/react");
        const session = await getSession();
        if (session?.user) {
          onLoginSuccess({
            id: (session.user as any).id ?? "",
            nom: (session.user as any).nom ?? "",
            prenom: (session.user as any).prenom ?? "",
            email: session.user.email ?? "",
            role: (session.user as any).role ?? "USER",
          });
        }
      } else {
        router.push("/Dashboard");
      }
    } catch {
      setLoginErrors({ global: "Une erreur est survenue. Réessayez." });
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════
  //  INSCRIPTION — API REST puis connexion auto
  // ════════════════════════════════════════════
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: regLastName,
          prenom: regFirstName,
          email: regEmail,
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setRegErrors({ email: "Cet email est déjà utilisé." });
        } else {
          setRegErrors({ global: data.error || "Erreur lors de la création du compte." });
        }
        return;
      }

      // Connexion automatique après inscription (sans "se souvenir")
      await signIn("credentials", {
        redirect: false,
        email: regEmail,
        password: regPassword,
        rememberMe: "false",
      });

      // Ping heartbeat
      await fetch("/api/Utilisateurs/status", { method: "POST" }).catch(() => {});

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      } else {
        router.push("/Dashboard");
      }
    } catch {
      setRegErrors({ global: "Une erreur est survenue. Réessayez." });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForgot()) return;
    setForgotSent(true);
  };

  // ── Force du mot de passe ──
  const pwdStrength =
    regPassword.length === 0 ? -1 :
      regPassword.length < 4 ? 0 :
        regPassword.length < 6 ? 1 :
          regPassword.length < 8 ? 2 : 3;
  const pwdColors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
  const pwdLabels = ["Trop court", "Faible", "Moyen", "Fort"];

  // ════════════════════════════════════════════
  //  RENDU
  // ════════════════════════════════════════════
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&family=Cinzel:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: rgba(255,255,255,0.2) !important; font-family: 'Jost', sans-serif; font-size: 13.5px; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.4); border-radius: 2px; }

        .auth-root {
          display: flex; height: 100vh; overflow: hidden;
          background: #05111f; font-family: 'Jost', sans-serif;
        }
        .left-panel {
          width: 46%; flex-shrink: 0; position: relative; overflow: hidden;
          background: linear-gradient(150deg, #071628 0%, #0d2348 50%, #060f1e 100%);
          display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 48px;
        }
        .right-panel {
          width: 54%; flex-shrink: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start; padding: 48px 36px 56px;
          background: linear-gradient(170deg, #07111f 0%, #050d18 60%, #060e1c 100%);
          position: relative; overflow-y: auto; overflow-x: hidden;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-22px) scale(1.35); opacity: 0.85; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseBorder {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
          50% { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          18% { transform: translateX(-7px); }
          36% { transform: translateX(7px); }
          54% { transform: translateX(-4px); }
          72% { transform: translateX(4px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-enter { animation: fadeUp 0.38s ease forwards; }

        .btn-primary {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #1a45c8 0%, #2f6ef5 45%, #1a45c8 100%);
          background-size: 200% auto; border: none; border-radius: 11px; color: #fff;
          font-family: 'Cinzel', serif; font-size: 12.5px; font-weight: 600;
          letter-spacing: 0.18em; cursor: pointer;
          transition: background-position .45s, transform .2s, box-shadow .2s;
          position: relative; overflow: hidden;
          box-shadow: 0 5px 22px rgba(59,130,246,0.38);
        }
        .btn-primary:hover:not(:disabled) {
          background-position: right center; transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(59,130,246,0.55);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .btn-primary::after {
          content: ''; position: absolute; top: -50%; left: -65%;
          width: 28%; height: 200%; background: rgba(255,255,255,0.16);
          transform: skewX(-20deg); transition: left .55s ease;
        }
        .btn-primary:hover:not(:disabled)::after { left: 135%; }

        .dot-loader {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: #fff; margin: 0 3px;
          animation: dotBounce 1.3s infinite ease-in-out;
        }
        .dot-loader:nth-child(2) { animation-delay: .18s; }
        .dot-loader:nth-child(3) { animation-delay: .36s; }

        .tab-btn {
          flex: 1; padding: 12px; background: transparent; border: none;
          border-bottom: 2px solid transparent; color: rgba(255,255,255,0.28);
          font-family: 'Jost', sans-serif; font-size: 11.5px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.28s;
        }
        .tab-btn.active { color: #60a5fa; border-bottom-color: #60a5fa; }
        .tab-btn:hover:not(.active) { color: rgba(255,255,255,0.62); }

        .link-btn {
          background: none; border: none; color: #60a5fa; font-family: 'Jost', sans-serif;
          font-size: 13px; cursor: pointer; text-decoration: underline;
          text-underline-offset: 3px; transition: color 0.22s; padding: 0;
        }
        .link-btn:hover { color: #93c5fd; }

        .divider { display: flex; align-items: center; gap: 14px; margin: 20px 0; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07); }

        .select-field {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          padding: 13px 14px 13px 46px; color: #e8f4ff; font-size: 14px;
          font-family: 'Jost', sans-serif; outline: none; appearance: none;
          cursor: pointer; transition: all 0.3s;
        }
        .select-field.err {
          border-color: rgba(248,113,113,0.65); background: rgba(248,113,113,0.06);
          box-shadow: 0 0 0 3px rgba(248,113,113,0.1);
        }
        .select-field:focus {
          border-color: rgba(96,165,250,0.7); background: rgba(59,130,246,0.09);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.13);
        }
        .select-field option { background: #0c1e38; color: #e8f4ff; }

        .err-inline {
          display: flex; align-items: center; gap: 6px;
          margin-top: 6px; padding: 6px 10px;
          background: rgba(248,113,113,0.08); border-radius: 6px;
          border: 1px solid rgba(248,113,113,0.2);
          font-size: 11.5px; color: #fca5a5; font-family: 'Jost', sans-serif;
          font-weight: 500; animation: slideDown 0.25s ease;
        }

        .terms-err {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 8px;
          background: rgba(248,113,113,0.09); border: 1px solid rgba(248,113,113,0.28);
          font-size: 12px; color: #fca5a5; font-family: 'Jost', sans-serif;
          font-weight: 500; margin-bottom: 12px; animation: shake 0.42s ease;
        }

        .global-err {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.35);
          animation: slideDown 0.3s ease;
        }

        .form-card {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 32px 30px; backdrop-filter: blur(6px);
          box-shadow: 0 8px 40px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset;
        }

        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 20px;
          background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25);
          font-size: 10.5px; color: #93c5fd; font-family: 'Jost', sans-serif;
          letter-spacing: 0.06em; margin-bottom: 20px;
        }

        /* ── Checkbox "Se souvenir de moi" stylisée ── */
        .remember-checkbox-wrapper {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none;
        }
        .remember-checkbox-box {
          width: 17px; height: 17px; border-radius: 5px; flex-shrink: 0;
          border: 1.5px solid rgba(96,165,250,0.35);
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.22s ease;
        }
        .remember-checkbox-box.checked {
          background: rgba(59,130,246,0.25);
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .remember-label {
          font-size: 13px;
          color: rgba(200,218,240,0.6);
          font-family: 'Jost', sans-serif;
          transition: color 0.22s;
        }
        .remember-label.checked { color: rgba(200,218,240,0.85); }

        /* Tooltip durée session */
        .session-hint {
          font-size: 10.5px;
          color: rgba(96,165,250,0.55);
          margin-left: 4px;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .left-panel { display: none !important; }
          .right-panel { width: 100% !important; }
        }
      `}</style>

      <div className="auth-root">

        {/* ══ PANNEAU GAUCHE ══ */}
        <div className="left-panel">
          <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.09) 0%,transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "8%", right: "-12%", width: "360px", height: "360px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.06) 0%,transparent 65%)", pointerEvents: "none" }} />
          <Particles />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "430px", height: "430px", borderRadius: "50%", border: "1px solid rgba(59,130,246,0.08)", animation: "rotateSlow 32s linear infinite", pointerEvents: "none" }}>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <div key={deg} style={{ position: "absolute", width: "7px", height: "7px", borderRadius: "50%", background: "rgba(96,165,250,0.6)", top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(215px) translate(-50%,-50%)` }} />
            ))}
          </div>
          <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "400px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.45)", marginBottom: "28px", animation: "pulseBorder 3.2s ease-in-out infinite", boxShadow: "0 0 50px rgba(59,130,246,0.18)" }}>
              <svg width="46" height="46" viewBox="0 0 44 44" fill="none">
                <path d="M22 4 L36 10 L36 28 C36 35 22 40 22 40 C22 40 8 35 8 28 L8 10 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
                <rect x="15" y="18" width="4" height="14" fill="#60a5fa" opacity="0.7" />
                <rect x="20" y="13" width="4" height="19" fill="#93c5fd" opacity="0.9" />
                <rect x="25" y="20" width="4" height="12" fill="#60a5fa" opacity="0.7" />
                <line x1="13" y1="18" x2="31" y2="18" stroke="#93c5fd" strokeWidth="1.5" />
              </svg>
            </div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.35em", color: "#60a5fa", textTransform: "uppercase", marginBottom: "12px", opacity: 0.9 }}>Patrimoine</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 300, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "4px" }}>Gestion de</h1>
            <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 600, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "28px", fontStyle: "italic" }}>Patrimoine d&apos;Entreprise</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center", marginBottom: "26px" }}>
              <div style={{ width: "44px", height: "1px", background: "linear-gradient(to right,transparent,rgba(59,130,246,0.6))" }} />
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6", opacity: 0.8, boxShadow: "0 0 8px rgba(59,130,246,0.6)" }} />
              <div style={{ width: "44px", height: "1px", background: "linear-gradient(to left,transparent,rgba(59,130,246,0.6))" }} />
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(15px,1.7vw,19px)", fontWeight: 300, fontStyle: "italic", color: "rgba(224,236,255,0.88)", lineHeight: 1.75, marginBottom: "18px" }}>
              Votre espace de gestion patrimoniale d&apos;excellence
            </p>
            <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.5)", lineHeight: 1.85, fontWeight: 300, maxWidth: "310px", margin: "0 auto 38px" }}>
              Pilotez, analysez et optimisez les actifs de votre entreprise depuis une plateforme sécurisée.
            </p>
            <div style={{ display: "flex", gap: "28px", justifyContent: "center" }}>
              {[{ value: "500+", label: "Entreprises" }, { value: "99.9%", label: "Disponibilité" }, { value: "ISO 27001", label: "Certifié" }].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: "14px", color: "#60a5fa", fontWeight: 600, marginBottom: "4px" }}>{s.value}</div>
                  <div style={{ fontSize: "9.5px", color: "rgba(200,218,240,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <CityscapeSVG />
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)", pointerEvents: "none" }} />
        </div>

        {/* ══ PANNEAU DROIT ══ */}
        <div className="right-panel">
          <div style={{ position: "fixed", top: 0, right: 0, width: "280px", height: "280px", background: "radial-gradient(ellipse at top right,rgba(59,130,246,0.08),transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

          <div style={{ width: "100%", maxWidth: "450px", position: "relative", zIndex: 1 }}>

            {/* En-tête */}
            <div style={{ marginBottom: "28px" }}>
              <div className="badge">
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {view === "login" ? "Accès sécurisé · SSL" : view === "register" ? "Nouveau compte · SSL" : "Récupération sécurisée"}
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "34px", fontWeight: 500, color: "#e8f4ff", marginBottom: "8px", lineHeight: 1.1 }}>
                {view === "login" ? "Connexion" : view === "register" ? "Inscription" : "Mot de passe oublié"}
              </h2>
              <p style={{ color: "rgba(200,218,240,0.55)", fontSize: "13.5px", lineHeight: 1.65 }}>
                {view === "login"
                  ? "Accédez à votre tableau de bord patrimonial."
                  : view === "register"
                    ? "Créez votre espace de gestion patrimoniale."
                    : "Nous vous enverrons un lien de réinitialisation."}
              </p>
            </div>

            {/* Onglets */}
            {view !== "forgot" && (
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "28px" }}>
                <button className={`tab-btn ${view === "login" ? "active" : ""}`} onClick={() => switchView("login")}>Connexion</button>
                <button className={`tab-btn ${view === "register" ? "active" : ""}`} onClick={() => switchView("register")}>Inscription</button>
              </div>
            )}

            {/* Carte formulaire */}
            <div className={`form-card ${visible ? "form-enter" : ""}`} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.22s" }}>

              {/* ════ CONNEXION ════ */}
              {view === "login" && (
                <form onSubmit={handleLogin} noValidate>
                  {loginErrors.global && (
                    <div className="global-err">
                      <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span style={{ fontSize: "13px", color: "#fca5a5", lineHeight: 1.5 }}>{loginErrors.global}</span>
                    </div>
                  )}

                  <InputField
                    label="Adresse e-mail" type="email" placeholder="votre@email.com"
                    value={loginEmail}
                    onChange={(v) => { setLoginEmail(v); if (loginErrors.email) setLoginErrors(p => ({ ...p, email: undefined })); }}
                    icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
                    error={loginErrors.email}
                  />
                  <InputField
                    label="Mot de passe" type="password" placeholder="••••••••••"
                    value={loginPassword}
                    onChange={(v) => { setLoginPassword(v); if (loginErrors.password) setLoginErrors(p => ({ ...p, password: undefined })); }}
                    icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                    error={loginErrors.password}
                  />

                  {/* ════ SE SOUVENIR DE MOI — stylisé et fonctionnel ════ */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "26px", marginTop: "-4px" }}>
                    <label
                      className="remember-checkbox-wrapper"
                      onClick={() => setLoginRememberMe(v => !v)}
                    >
                      {/* Checkbox custom */}
                      <div className={`remember-checkbox-box ${loginRememberMe ? "checked" : ""}`}>
                        {loginRememberMe && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <polyline points="2,6 5,9 10,3" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {/* Label + hint durée */}
                      <span className={`remember-label ${loginRememberMe ? "checked" : ""}`}>
                        Se souvenir de moi
                        <span className="session-hint">
                          {loginRememberMe ? "(30 jours)" : "(8 heures)"}
                        </span>
                      </span>
                    </label>
                    <button type="button" className="link-btn" onClick={() => switchView("forgot")}>Mot de passe oublié ?</button>
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading
                      ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot-loader" /><span className="dot-loader" /><span className="dot-loader" /></span>
                      : "Se connecter"}
                  </button>

                  <div className="divider"><span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>OU</span></div>

                  <button type="button"
                    style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px", color: "rgba(200,218,240,0.55)", fontSize: "13px", fontFamily: "'Jost',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.3s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.09)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.32)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    Connexion avec SSO entreprise
                  </button>

                  <p style={{ textAlign: "center", marginTop: "22px", fontSize: "13px", color: "rgba(200,218,240,0.42)" }}>
                    Pas encore de compte ?{" "}<button className="link-btn" onClick={() => switchView("register")}>S&apos;inscrire</button>
                  </p>
                </form>
              )}

              {/* ════ INSCRIPTION ════ */}
              {view === "register" && (
                <form onSubmit={handleRegister} noValidate>
                  {regErrors.global && (
                    <div className="global-err">
                      <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span style={{ fontSize: "13px", color: "#fca5a5", lineHeight: 1.5 }}>{regErrors.global}</span>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                    <InputField
                      label="Prénom" type="text" placeholder="Marc"
                      value={regFirstName}
                      onChange={(v) => { setRegFirstName(v); if (regErrors.firstName) setRegErrors(p => ({ ...p, firstName: undefined })); }}
                      icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                      error={regErrors.firstName}
                    />
                    <InputField
                      label="Nom" type="text" placeholder="Ane"
                      value={regLastName}
                      onChange={(v) => { setRegLastName(v); if (regErrors.lastName) setRegErrors(p => ({ ...p, lastName: undefined })); }}
                      icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                      error={regErrors.lastName}
                    />
                  </div>

                  <InputField
                    label="Adresse e-mail professionnelle" type="email" placeholder="Votre@email.com"
                    value={regEmail}
                    onChange={(v) => { setRegEmail(v); if (regErrors.email) setRegErrors(p => ({ ...p, email: undefined })); }}
                    icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
                    error={regErrors.email}
                  />

                  {/* Rôle */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: regErrors.role ? "#fca5a5" : "#60a5fa", marginBottom: "8px", fontFamily: "'Cormorant Garamond',serif" }}>
                      Rôle dans l&apos;entreprise <span style={{ color: "#f87171" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: regErrors.role ? "rgba(248,113,113,0.7)" : "rgba(200,218,240,0.28)", display: "flex", zIndex: 1, pointerEvents: "none" }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      </span>
                      <select
                        className={`select-field${regErrors.role ? " err" : ""}`}
                        value={regRole}
                        onChange={(e) => { setRegRole(e.target.value); if (regErrors.role) setRegErrors(p => ({ ...p, role: undefined })); }}
                      >
                        {/* <option value="">Sélectionner un rôle</option> */}
                        {/* <option value="Admin">Administrateur</option> */}
                        <option value="Utis">Utilisateur</option>
                      </select>
                      <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(200,218,240,0.3)", pointerEvents: "none" }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </div>
                    {regErrors.role && (
                      <div className="err-inline">
                        <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        {regErrors.role}
                      </div>
                    )}
                  </div>

                  <InputField
                    label="Mot de passe" type="password" placeholder="Minimum 8 caractères"
                    value={regPassword}
                    onChange={(v) => { setRegPassword(v); if (regErrors.password) setRegErrors(p => ({ ...p, password: undefined })); }}
                    icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                    error={regErrors.password}
                  />

                  {regPassword.length > 0 && (
                    <div style={{ marginBottom: "18px", marginTop: "-12px" }}>
                      <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: pwdStrength >= i ? pwdColors[pwdStrength] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
                        ))}
                      </div>
                      <span style={{ fontSize: "11px", color: pwdStrength >= 0 ? pwdColors[pwdStrength] : "rgba(200,218,240,0.4)", fontWeight: 600 }}>
                        {pwdStrength >= 0 ? pwdLabels[pwdStrength] : ""}
                      </span>
                    </div>
                  )}

                  <InputField
                    label="Confirmer le mot de passe" type="password" placeholder="Répétez le mot de passe"
                    value={regConfirm}
                    onChange={(v) => { setRegConfirm(v); if (regErrors.confirm) setRegErrors(p => ({ ...p, confirm: undefined })); }}
                    icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                    error={regErrors.confirm}
                  />

                  {regErrors.terms && (
                    <div className="terms-err">
                      <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {regErrors.terms}
                    </div>
                  )}

                  <label style={{
                    display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer",
                    fontSize: "12.5px",
                    color: regErrors.terms ? "rgba(252,165,165,0.9)" : "rgba(200,218,240,0.52)",
                    marginBottom: "22px", lineHeight: 1.6, userSelect: "none",
                    padding: "11px 13px", borderRadius: "9px",
                    border: `1px solid ${regErrors.terms ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.06)"}`,
                    background: regErrors.terms ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.02)",
                    transition: "all 0.3s",
                  }}>
                    <input
                      type="checkbox" checked={regTerms}
                      onChange={(e) => { setRegTerms(e.target.checked); if (regErrors.terms) setRegErrors(p => ({ ...p, terms: undefined })); }}
                      style={{ accentColor: "#3b82f6", marginTop: "2px", flexShrink: 0, width: "15px", height: "15px", cursor: "pointer" }}
                    />
                    <span>
                      J&apos;accepte les{" "}
                      <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>conditions d&apos;utilisation</span>
                      {" "}et la{" "}
                      <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>politique de confidentialité</span>
                      <span style={{ color: "#f87171", marginLeft: "3px", fontWeight: 700 }}>*</span>
                    </span>
                  </label>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading
                      ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot-loader" /><span className="dot-loader" /><span className="dot-loader" /></span>
                      : "Créer mon compte"}
                  </button>

                  <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "rgba(200,218,240,0.4)" }}>
                    Déjà inscrit ?{" "}<button className="link-btn" onClick={() => switchView("login")}>Se connecter</button>
                  </p>
                </form>
              )}

              {/* ════ MOT DE PASSE OUBLIÉ ════ */}
              {view === "forgot" && (
                <div>
                  {forgotSent ? (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                      <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.45)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 26px", animation: "pulseBorder 2.2s ease infinite" }}>
                        <svg width="30" height="30" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      </div>
                      <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", color: "#e8f4ff", marginBottom: "12px", fontWeight: 500 }}>E-mail envoyé !</h3>
                      <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.6)", lineHeight: 1.75, marginBottom: "28px" }}>
                        Un lien de réinitialisation a été envoyé à<br />
                        <span style={{ color: "#60a5fa", fontWeight: 500 }}>{forgotEmail}</span>.<br />
                        Vérifiez votre boîte de réception.
                      </p>
                      <button className="btn-primary" onClick={() => switchView("login")}>Retour à la connexion</button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgot} noValidate>
                      <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "9px", padding: "14px 16px", marginBottom: "24px", fontSize: "13px", color: "rgba(200,218,240,0.65)", lineHeight: 1.7 }}>
                        Entrez votre adresse e-mail professionnelle et nous vous enverrons les instructions pour réinitialiser votre mot de passe.
                      </div>
                      <InputField
                        label="Adresse e-mail" type="email" placeholder="votre@email.com"
                        value={forgotEmail}
                        onChange={(v) => { setForgotEmail(v); if (forgotErrors.email) setForgotErrors({}); }}
                        icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
                        error={forgotErrors.email}
                      />
                      <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>Envoyer le lien</button>
                      <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <button type="button" className="link-btn" onClick={() => switchView("login")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                          Retour à la connexion
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Pied de page */}
            <div style={{ marginTop: "30px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "rgba(200,218,240,0.25)", letterSpacing: "0.06em" }}>© 2026 Patrimoine Pro</span>
              <div style={{ display: "flex", gap: "18px" }}>
                {["Confidentialité", "Conditions", "Support"].map((item) => (
                  <span key={item}
                    style={{ fontSize: "11px", color: "rgba(200,218,240,0.28)", cursor: "pointer", transition: "color 0.22s", letterSpacing: "0.05em" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(96,165,250,0.85)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,218,240,0.28)")}
                  >{item}</span>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}






// "use client";

// import { useState, useEffect } from "react";
// import { signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";

// // ─────────────────────────────────────────────
// //  Types
// // ─────────────────────────────────────────────
// export interface RegisteredUser {
//   id: string;
//   nom: string;
//   prenom: string;
//   email: string;
//   role: string;
// }

// interface AuthPageProps {
//   onLoginSuccess?: (user: RegisteredUser) => void;
// }

// type FormView = "login" | "register" | "forgot";

// interface InputFieldProps {
//   label: string;
//   type: string;
//   placeholder: string;
//   value: string;
//   onChange: (v: string) => void;
//   icon: React.ReactNode;
//   error?: string;
// }

// // ─────────────────────────────────────────────
// //  Icônes
// // ─────────────────────────────────────────────
// const EyeIcon = ({ open }: { open: boolean }) =>
//   open ? (
//     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//       <circle cx="12" cy="12" r="3" />
//     </svg>
//   ) : (
//     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
//       <line x1="1" y1="1" x2="23" y2="23" />
//     </svg>
//   );

// // ─────────────────────────────────────────────
// //  InputField
// // ─────────────────────────────────────────────
// function InputField({ label, type, placeholder, value, onChange, icon, error }: InputFieldProps) {
//   const [showPwd, setShowPwd] = useState(false);
//   const [focused, setFocused] = useState(false);
//   const isPassword = type === "password";
//   const inputType = isPassword ? (showPwd ? "text" : "password") : type;
//   const hasError = !!error;

//   return (
//     <div style={{ marginBottom: "20px" }}>
//       <label style={{
//         display: "block", fontSize: "10.5px", fontWeight: 700,
//         letterSpacing: "0.14em", textTransform: "uppercase",
//         color: hasError ? "#fca5a5" : focused ? "#93c5fd" : "#60a5fa",
//         marginBottom: "8px", fontFamily: "'Cormorant Garamond', Georgia, serif",
//         transition: "color 0.25s",
//       }}>
//         {label} <span style={{ color: "#f87171" }}>*</span>
//       </label>
//       <div style={{
//         position: "relative", display: "flex", alignItems: "center",
//         background: hasError ? "rgba(248,113,113,0.06)" : focused ? "rgba(59,130,246,0.09)" : "rgba(255,255,255,0.03)",
//         border: `1px solid ${hasError ? "rgba(248,113,113,0.65)" : focused ? "rgba(96,165,250,0.7)" : "rgba(255,255,255,0.1)"}`,
//         borderRadius: "10px", transition: "all 0.3s ease",
//         boxShadow: hasError
//           ? "0 0 0 3px rgba(248,113,113,0.1), inset 0 1px 4px rgba(0,0,0,0.25)"
//           : focused
//             ? "0 0 0 3px rgba(59,130,246,0.13), inset 0 1px 4px rgba(0,0,0,0.25)"
//             : "inset 0 1px 4px rgba(0,0,0,0.2)",
//       }}>
//         <span style={{
//           position: "absolute", left: "14px",
//           color: hasError ? "rgba(248,113,113,0.8)" : focused ? "#60a5fa" : "rgba(255,255,255,0.22)",
//           transition: "color 0.3s", display: "flex", alignItems: "center",
//         }}>{icon}</span>
//         <input
//           type={inputType} placeholder={placeholder} value={value}
//           onChange={(e) => onChange(e.target.value)}
//           onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
//           style={{
//             width: "100%", background: "transparent", border: "none", outline: "none",
//             padding: "13px 14px 13px 46px", color: "#e8f4ff", fontSize: "14px",
//             fontFamily: "'Jost', sans-serif", letterSpacing: "0.02em",
//           }}
//         />
//         {isPassword && (
//           <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
//             position: "absolute", right: "14px", background: "none", border: "none",
//             color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "0",
//             display: "flex", alignItems: "center", transition: "color 0.2s",
//           }}><EyeIcon open={showPwd} /></button>
//         )}
//       </div>
//       {hasError && (
//         <div style={{
//           display: "flex", alignItems: "center", gap: "6px",
//           marginTop: "6px", padding: "6px 10px",
//           background: "rgba(248,113,113,0.08)", borderRadius: "6px",
//           border: "1px solid rgba(248,113,113,0.2)",
//         }}>
//           <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
//             <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
//           </svg>
//           <span style={{ fontSize: "11.5px", color: "#fca5a5", fontFamily: "'Jost', sans-serif", fontWeight: 500 }}>
//             {error}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────
// //  CityscapeSVG
// // ─────────────────────────────────────────────
// const CityscapeSVG = () => (
//   <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg"
//     style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "auto", opacity: 0.15 }}
//     preserveAspectRatio="xMidYMax meet">
//     <defs>
//       <linearGradient id="skyline" x1="0" y1="0" x2="0" y2="1">
//         <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
//         <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.95" />
//       </linearGradient>
//     </defs>
//     <rect x="0" y="200" width="80" height="200" fill="url(#skyline)" />
//     <rect x="20" y="150" width="40" height="250" fill="url(#skyline)" />
//     <rect x="80" y="220" width="60" height="180" fill="url(#skyline)" />
//     <rect x="130" y="170" width="35" height="230" fill="url(#skyline)" />
//     <rect x="155" y="130" width="25" height="270" fill="url(#skyline)" />
//     <polygon points="230,60 240,80 250,80" fill="url(#skyline)" />
//     <rect x="225" y="80" width="30" height="320" fill="url(#skyline)" />
//     <rect x="210" y="160" width="60" height="240" fill="url(#skyline)" />
//     <rect x="280" y="190" width="90" height="210" fill="url(#skyline)" />
//     <rect x="380" y="100" width="50" height="300" fill="url(#skyline)" />
//     <rect x="370" y="140" width="70" height="260" fill="url(#skyline)" />
//     <rect x="450" y="210" width="70" height="190" fill="url(#skyline)" />
//     <rect x="530" y="230" width="55" height="170" fill="url(#skyline)" />
//     <rect x="595" y="80" width="55" height="320" fill="url(#skyline)" />
//     <polygon points="617,50 622,80 628,80" fill="url(#skyline)" />
//     <rect x="680" y="200" width="65" height="200" fill="url(#skyline)" />
//     <rect x="755" y="215" width="80" height="185" fill="url(#skyline)" />
//     <rect x="845" y="190" width="45" height="210" fill="url(#skyline)" />
//     <rect x="900" y="220" width="70" height="180" fill="url(#skyline)" />
//     <rect x="980" y="200" width="80" height="200" fill="url(#skyline)" />
//     <rect x="1060" y="230" width="60" height="170" fill="url(#skyline)" />
//     <rect x="1120" y="210" width="80" height="190" fill="url(#skyline)" />
//     <rect x="0" y="390" width="1200" height="10" fill="rgba(59,130,246,0.5)" />
//   </svg>
// );

// // ─────────────────────────────────────────────
// //  Particles
// // ─────────────────────────────────────────────
// interface Particle { width: number; height: number; left: number; top: number; duration: number; delay: number; }

// function Particles() {
//   const [particles, setParticles] = useState<Particle[]>([]);
//   useEffect(() => {
//     setParticles([...Array(20)].map(() => ({
//       width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
//       left: Math.random() * 100, top: Math.random() * 100,
//       duration: 6 + Math.random() * 8, delay: Math.random() * 6,
//     })));
//   }, []);
//   return (
//     <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
//       {particles.map((p, i) => (
//         <div key={i} style={{
//           position: "absolute", width: `${p.width}px`, height: `${p.height}px`,
//           borderRadius: "50%", background: "rgba(96,165,250,0.6)",
//           left: `${p.left}%`, top: `${p.top}%`,
//           animation: `float ${p.duration}s ease-in-out infinite`,
//           animationDelay: `${p.delay}s`,
//         }} />
//       ))}
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════
// //  COMPOSANT PRINCIPAL
// // ═══════════════════════════════════════════════════
// export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
//   const router = useRouter();

//   const [view, setView] = useState<FormView>("login");
//   const [animating, setAnimating] = useState(false);
//   const [visible, setVisible] = useState(true);
//   const [loading, setLoading] = useState(false);

//   // ── Login ──
//   const [loginEmail, setLoginEmail] = useState("");
//   const [loginPassword, setLoginPassword] = useState("");
//   const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string; global?: string }>({});

//   // ── Register ──
//   const [regFirstName, setRegFirstName] = useState("");
//   const [regLastName, setRegLastName] = useState("");
//   const [regEmail, setRegEmail] = useState("");
//   const [regPassword, setRegPassword] = useState("");
//   const [regConfirm, setRegConfirm] = useState("");
//   const [regRole, setRegRole] = useState("");
//   const [regTerms, setRegTerms] = useState(false);
//   const [regErrors, setRegErrors] = useState<{
//     firstName?: string; lastName?: string; email?: string;
//     password?: string; confirm?: string; role?: string; terms?: string; global?: string;
//   }>({});

//   // ── Forgot ──
//   const [forgotEmail, setForgotEmail] = useState("");
//   const [forgotSent, setForgotSent] = useState(false);
//   const [forgotErrors, setForgotErrors] = useState<{ email?: string }>({});

//   const MSG = "Veuillez remplir ce champ svp";

//   // ── Transition de vue ──
//   const switchView = (next: FormView) => {
//     if (next === view || animating) return;
//     setAnimating(true); setVisible(false);
//     setLoginErrors({}); setRegErrors({}); setForgotErrors({});
//     setTimeout(() => {
//       setView(next); setVisible(true); setAnimating(false); setForgotSent(false);
//     }, 300);
//   };

//   // ── Validations ──
//   const validateLogin = () => {
//     const e: typeof loginErrors = {};
//     if (!loginEmail.trim()) e.email = MSG;
//     if (!loginPassword.trim()) e.password = MSG;
//     setLoginErrors(e);
//     return !Object.keys(e).length;
//   };

//   const validateRegister = () => {
//     const e: typeof regErrors = {};
//     if (!regFirstName.trim()) e.firstName = MSG;
//     if (!regLastName.trim()) e.lastName = MSG;
//     if (!regEmail.trim()) e.email = MSG;
//     if (!regRole) e.role = "Veuillez sélectionner un rôle svp";
//     if (!regPassword.trim()) e.password = MSG;
//     else if (regPassword.length < 6) e.password = "Minimum 8 caractères requis";
//     if (!regConfirm.trim()) e.confirm = MSG;
//     else if (regConfirm !== regPassword) e.confirm = "Les mots de passe ne correspondent pas";
//     if (!regTerms) e.terms = "Vous devez accepter les conditions d'utilisation svp";
//     setRegErrors(e);
//     return !Object.keys(e).length;
//   };

//   const validateForgot = () => {
//     const e: typeof forgotErrors = {};
//     if (!forgotEmail.trim()) e.email = MSG;
//     setForgotErrors(e);
//     return !Object.keys(e).length;
//   };

//   // ════════════════════════════════════════════
//   //  CONNEXION — NextAuth credentials
//   // ════════════════════════════════════════════
//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateLogin()) return;
//     setLoading(true);

//     try {
//       const result = await signIn("credentials", {
//         redirect: false,
//         email: loginEmail,
//         password: loginPassword,
//       });

//       if (result?.error) {
//         const msg = result.error;
//         if (msg.includes("e-mail") || msg.includes("Aucun compte") || msg === "CredentialsSignin") {
//           setLoginErrors({ email: "Aucun compte associé à cet e-mail." });
//         } else if (msg.includes("Mot de passe")) {
//           setLoginErrors({ password: "Mot de passe incorrect." });
//         } else if (msg.includes("désactivé")) {
//           setLoginErrors({ global: "Ce compte a été désactivé." });
//         } else {
//           setLoginErrors({ global: "Email ou mot de passe incorrect." });
//         }
//         return;
//       }

//       // Ping heartbeat immédiat → marque "en ligne"
//       await fetch("/api/Utilisateurs/status", { method: "POST" }).catch(() => {});

//       if (onLoginSuccess) {
//         // Si un callback est fourni on l'appelle
//         const { getSession } = await import("next-auth/react");
//         const session = await getSession();
//         if (session?.user) {
//           onLoginSuccess({
//             id: (session.user as any).id ?? "",
//             nom: (session.user as any).nom ?? "",
//             prenom: (session.user as any).prenom ?? "",
//             email: session.user.email ?? "",
//             role: (session.user as any).role ?? "USER",
//           });
//         }
//       } else {
//         // Redirection par défaut vers le dashboard
//         router.push("/Dashboard");
//       }
//     } catch {
//       setLoginErrors({ global: "Une erreur est survenue. Réessayez." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ════════════════════════════════════════════
//   //  INSCRIPTION — API REST puis connexion auto
//   // ════════════════════════════════════════════
//   const handleRegister = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateRegister()) return;
//     setLoading(true);

//     try {
//       // 1. Créer le compte
//       const res = await fetch("/api/auth/register", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           nom: regLastName,
//           prenom: regFirstName,
//           email: regEmail,
//           password: regPassword,
//         }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         if (res.status === 409) {
//           setRegErrors({ email: "Cet email est déjà utilisé." });
//         } else {
//           setRegErrors({ global: data.error || "Erreur lors de la création du compte." });
//         }
//         return;
//       }

//       // 2. Connexion automatique après inscription
//       const signInResult = await signIn("credentials", {
//         redirect: false,
//         email: regEmail,
//         password: regPassword,
//       });

//       // if (signInResult?.error) {
//       //   // Inscription réussie mais connexion échouée → rediriger vers login
//       //   switchView("login");
//       //   return;
//       // }

//       // 3. Ping heartbeat
//       await fetch("/api/Utilisateurs/status", { method: "POST" }).catch(() => {});

//       if (onLoginSuccess) {
//         onLoginSuccess(data.user);
//       } else {
//         router.push("/Dashboard");
//       }
//     } catch {
//       setRegErrors({ global: "Une erreur est survenue. Réessayez." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleForgot = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateForgot()) return;
//     setForgotSent(true);
//     // TODO: brancher à votre service d'envoi d'email (Resend, Nodemailer, etc.)
//   };

//   // ── Force du mot de passe ──
//   const pwdStrength =
//     regPassword.length === 0 ? -1 :
//       regPassword.length < 4 ? 0 :
//         regPassword.length < 6 ? 1 :
//           regPassword.length < 8 ? 2 : 3;
//   const pwdColors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
//   const pwdLabels = ["Trop court", "Faible", "Moyen", "Fort"];

//   // ════════════════════════════════════════════
//   //  RENDU
//   // ════════════════════════════════════════════
//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&family=Cinzel:wght@400;500;600&display=swap');

//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//         ::placeholder { color: rgba(255,255,255,0.2) !important; font-family: 'Jost', sans-serif; font-size: 13.5px; }
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.4); border-radius: 2px; }

//         .auth-root {
//           display: flex; height: 100vh; overflow: hidden;
//           background: #05111f; font-family: 'Jost', sans-serif;
//         }
//         .left-panel {
//           width: 46%; flex-shrink: 0; position: relative; overflow: hidden;
//           background: linear-gradient(150deg, #071628 0%, #0d2348 50%, #060f1e 100%);
//           display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 48px;
//         }
//         .right-panel {
//           width: 54%; flex-shrink: 0; display: flex; flex-direction: column;
//           align-items: center; justify-content: flex-start; padding: 48px 36px 56px;
//           background: linear-gradient(170deg, #07111f 0%, #050d18 60%, #060e1c 100%);
//           position: relative; overflow-y: auto; overflow-x: hidden;
//         }

//         @keyframes float {
//           0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
//           50% { transform: translateY(-22px) scale(1.35); opacity: 0.85; }
//         }
//         @keyframes fadeUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes pulseBorder {
//           0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
//           50% { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
//         }
//         @keyframes rotateSlow {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
//         @keyframes dotBounce {
//           0%, 80%, 100% { transform: scale(0); opacity: 0; }
//           40% { transform: scale(1); opacity: 1; }
//         }
//         @keyframes shake {
//           0%, 100% { transform: translateX(0); }
//           18% { transform: translateX(-7px); }
//           36% { transform: translateX(7px); }
//           54% { transform: translateX(-4px); }
//           72% { transform: translateX(4px); }
//         }
//         @keyframes slideDown {
//           from { opacity: 0; transform: translateY(-8px); }
//           to { opacity: 1; transform: translateY(0); }
//         }

//         .form-enter { animation: fadeUp 0.38s ease forwards; }

//         .btn-primary {
//           width: 100%; padding: 15px;
//           background: linear-gradient(135deg, #1a45c8 0%, #2f6ef5 45%, #1a45c8 100%);
//           background-size: 200% auto; border: none; border-radius: 11px; color: #fff;
//           font-family: 'Cinzel', serif; font-size: 12.5px; font-weight: 600;
//           letter-spacing: 0.18em; cursor: pointer;
//           transition: background-position .45s, transform .2s, box-shadow .2s;
//           position: relative; overflow: hidden;
//           box-shadow: 0 5px 22px rgba(59,130,246,0.38);
//         }
//         .btn-primary:hover:not(:disabled) {
//           background-position: right center; transform: translateY(-2px);
//           box-shadow: 0 10px 32px rgba(59,130,246,0.55);
//         }
//         .btn-primary:active:not(:disabled) { transform: translateY(0); }
//         .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
//         .btn-primary::after {
//           content: ''; position: absolute; top: -50%; left: -65%;
//           width: 28%; height: 200%; background: rgba(255,255,255,0.16);
//           transform: skewX(-20deg); transition: left .55s ease;
//         }
//         .btn-primary:hover:not(:disabled)::after { left: 135%; }

//         .dot-loader {
//           display: inline-block; width: 7px; height: 7px; border-radius: 50%;
//           background: #fff; margin: 0 3px;
//           animation: dotBounce 1.3s infinite ease-in-out;
//         }
//         .dot-loader:nth-child(2) { animation-delay: .18s; }
//         .dot-loader:nth-child(3) { animation-delay: .36s; }

//         .tab-btn {
//           flex: 1; padding: 12px; background: transparent; border: none;
//           border-bottom: 2px solid transparent; color: rgba(255,255,255,0.28);
//           font-family: 'Jost', sans-serif; font-size: 11.5px; font-weight: 600;
//           letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.28s;
//         }
//         .tab-btn.active { color: #60a5fa; border-bottom-color: #60a5fa; }
//         .tab-btn:hover:not(.active) { color: rgba(255,255,255,0.62); }

//         .link-btn {
//           background: none; border: none; color: #60a5fa; font-family: 'Jost', sans-serif;
//           font-size: 13px; cursor: pointer; text-decoration: underline;
//           text-underline-offset: 3px; transition: color 0.22s; padding: 0;
//         }
//         .link-btn:hover { color: #93c5fd; }

//         .divider { display: flex; align-items: center; gap: 14px; margin: 20px 0; }
//         .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07); }

//         .select-field {
//           width: 100%; background: rgba(255,255,255,0.03);
//           border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
//           padding: 13px 14px 13px 46px; color: #e8f4ff; font-size: 14px;
//           font-family: 'Jost', sans-serif; outline: none; appearance: none;
//           cursor: pointer; transition: all 0.3s;
//         }
//         .select-field.err {
//           border-color: rgba(248,113,113,0.65); background: rgba(248,113,113,0.06);
//           box-shadow: 0 0 0 3px rgba(248,113,113,0.1);
//         }
//         .select-field:focus {
//           border-color: rgba(96,165,250,0.7); background: rgba(59,130,246,0.09);
//           box-shadow: 0 0 0 3px rgba(59,130,246,0.13);
//         }
//         .select-field option { background: #0c1e38; color: #e8f4ff; }

//         .err-inline {
//           display: flex; align-items: center; gap: 6px;
//           margin-top: 6px; padding: 6px 10px;
//           background: rgba(248,113,113,0.08); border-radius: 6px;
//           border: 1px solid rgba(248,113,113,0.2);
//           font-size: 11.5px; color: #fca5a5; font-family: 'Jost', sans-serif;
//           font-weight: 500; animation: slideDown 0.25s ease;
//         }

//         .terms-err {
//           display: flex; align-items: center; gap: 8px;
//           padding: 10px 14px; border-radius: 8px;
//           background: rgba(248,113,113,0.09); border: 1px solid rgba(248,113,113,0.28);
//           font-size: 12px; color: #fca5a5; font-family: 'Jost', sans-serif;
//           font-weight: 500; margin-bottom: 12px; animation: shake 0.42s ease;
//         }

//         .global-err {
//           display: flex; align-items: flex-start; gap: 10px;
//           padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;
//           background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.35);
//           animation: slideDown 0.3s ease;
//         }

//         .form-card {
//           background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
//           border-radius: 18px; padding: 32px 30px; backdrop-filter: blur(6px);
//           box-shadow: 0 8px 40px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset;
//         }

//         .badge {
//           display: inline-flex; align-items: center; gap: 6px;
//           padding: 5px 12px; border-radius: 20px;
//           background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25);
//           font-size: 10.5px; color: #93c5fd; font-family: 'Jost', sans-serif;
//           letter-spacing: 0.06em; margin-bottom: 20px;
//         }

//         @media (max-width: 768px) {
//           .left-panel { display: none !important; }
//           .right-panel { width: 100% !important; }
//         }
//       `}</style>

//       <div className="auth-root">

//         {/* ══ PANNEAU GAUCHE ══ */}
//         <div className="left-panel">
//           <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.09) 0%,transparent 65%)", pointerEvents: "none" }} />
//           <div style={{ position: "absolute", bottom: "8%", right: "-12%", width: "360px", height: "360px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.06) 0%,transparent 65%)", pointerEvents: "none" }} />
//           <Particles />
//           <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "430px", height: "430px", borderRadius: "50%", border: "1px solid rgba(59,130,246,0.08)", animation: "rotateSlow 32s linear infinite", pointerEvents: "none" }}>
//             {[0, 60, 120, 180, 240, 300].map((deg) => (
//               <div key={deg} style={{ position: "absolute", width: "7px", height: "7px", borderRadius: "50%", background: "rgba(96,165,250,0.6)", top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(215px) translate(-50%,-50%)` }} />
//             ))}
//           </div>
//           <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "400px" }}>
//             <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.45)", marginBottom: "28px", animation: "pulseBorder 3.2s ease-in-out infinite", boxShadow: "0 0 50px rgba(59,130,246,0.18)" }}>
//               <svg width="46" height="46" viewBox="0 0 44 44" fill="none">
//                 <path d="M22 4 L36 10 L36 28 C36 35 22 40 22 40 C22 40 8 35 8 28 L8 10 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
//                 <rect x="15" y="18" width="4" height="14" fill="#60a5fa" opacity="0.7" />
//                 <rect x="20" y="13" width="4" height="19" fill="#93c5fd" opacity="0.9" />
//                 <rect x="25" y="20" width="4" height="12" fill="#60a5fa" opacity="0.7" />
//                 <line x1="13" y1="18" x2="31" y2="18" stroke="#93c5fd" strokeWidth="1.5" />
//               </svg>
//             </div>
//             <div style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.35em", color: "#60a5fa", textTransform: "uppercase", marginBottom: "12px", opacity: 0.9 }}>Patrimoine</div>
//             <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 300, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "4px" }}>Gestion de</h1>
//             <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 600, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "28px", fontStyle: "italic" }}>Patrimoine d&apos;Entreprise</h1>
//             <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center", marginBottom: "26px" }}>
//               <div style={{ width: "44px", height: "1px", background: "linear-gradient(to right,transparent,rgba(59,130,246,0.6))" }} />
//               <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6", opacity: 0.8, boxShadow: "0 0 8px rgba(59,130,246,0.6)" }} />
//               <div style={{ width: "44px", height: "1px", background: "linear-gradient(to left,transparent,rgba(59,130,246,0.6))" }} />
//             </div>
//             <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(15px,1.7vw,19px)", fontWeight: 300, fontStyle: "italic", color: "rgba(224,236,255,0.88)", lineHeight: 1.75, marginBottom: "18px" }}>
//               Votre espace de gestion patrimoniale d&apos;excellence
//             </p>
//             <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.5)", lineHeight: 1.85, fontWeight: 300, maxWidth: "310px", margin: "0 auto 38px" }}>
//               Pilotez, analysez et optimisez les actifs de votre entreprise depuis une plateforme sécurisée.
//             </p>
//             <div style={{ display: "flex", gap: "28px", justifyContent: "center" }}>
//               {[{ value: "500+", label: "Entreprises" }, { value: "99.9%", label: "Disponibilité" }, { value: "ISO 27001", label: "Certifié" }].map((s) => (
//                 <div key={s.label} style={{ textAlign: "center" }}>
//                   <div style={{ fontFamily: "'Cinzel',serif", fontSize: "14px", color: "#60a5fa", fontWeight: 600, marginBottom: "4px" }}>{s.value}</div>
//                   <div style={{ fontSize: "9.5px", color: "rgba(200,218,240,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{s.label}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <CityscapeSVG />
//           <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)", pointerEvents: "none" }} />
//         </div>

//         {/* ══ PANNEAU DROIT ══ */}
//         <div className="right-panel">
//           <div style={{ position: "fixed", top: 0, right: 0, width: "280px", height: "280px", background: "radial-gradient(ellipse at top right,rgba(59,130,246,0.08),transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

//           <div style={{ width: "100%", maxWidth: "450px", position: "relative", zIndex: 1 }}>

//             {/* En-tête */}
//             <div style={{ marginBottom: "28px" }}>
//               <div className="badge">
//                 <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                   <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
//                 </svg>
//                 {view === "login" ? "Accès sécurisé · SSL" : view === "register" ? "Nouveau compte · SSL" : "Récupération sécurisée"}
//               </div>
//               <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "34px", fontWeight: 500, color: "#e8f4ff", marginBottom: "8px", lineHeight: 1.1 }}>
//                 {view === "login" ? "Connexion" : view === "register" ? "Inscription" : "Mot de passe oublié"}
//               </h2>
//               <p style={{ color: "rgba(200,218,240,0.55)", fontSize: "13.5px", lineHeight: 1.65 }}>
//                 {view === "login"
//                   ? "Accédez à votre tableau de bord patrimonial."
//                   : view === "register"
//                     ? "Créez votre espace de gestion patrimoniale."
//                     : "Nous vous enverrons un lien de réinitialisation."}
//               </p>
//             </div>

//             {/* Onglets */}
//             {view !== "forgot" && (
//               <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "28px" }}>
//                 <button className={`tab-btn ${view === "login" ? "active" : ""}`} onClick={() => switchView("login")}>Connexion</button>
//                 <button className={`tab-btn ${view === "register" ? "active" : ""}`} onClick={() => switchView("register")}>Inscription</button>
//               </div>
//             )}

//             {/* Carte formulaire */}
//             <div className={`form-card ${visible ? "form-enter" : ""}`} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.22s" }}>

//               {/* ════ CONNEXION ════ */}
//               {view === "login" && (
//                 <form onSubmit={handleLogin} noValidate>
//                   {loginErrors.global && (
//                     <div className="global-err">
//                       <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
//                         <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
//                       </svg>
//                       <span style={{ fontSize: "13px", color: "#fca5a5", lineHeight: 1.5 }}>{loginErrors.global}</span>
//                     </div>
//                   )}

//                   <InputField
//                     label="Adresse e-mail" type="email" placeholder="votre@email.com"
//                     value={loginEmail}
//                     onChange={(v) => { setLoginEmail(v); if (loginErrors.email) setLoginErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
//                     error={loginErrors.email}
//                   />
//                   <InputField
//                     label="Mot de passe" type="password" placeholder="••••••••••"
//                     value={loginPassword}
//                     onChange={(v) => { setLoginPassword(v); if (loginErrors.password) setLoginErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
//                     error={loginErrors.password}
//                   />

//                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "26px", marginTop: "-4px" }}>
//                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "rgba(200,218,240,0.5)", userSelect: "none" }}>
//                       <input type="checkbox" style={{ accentColor: "#3b82f6" }} /> Se souvenir de moi
//                     </label>
//                     <button type="button" className="link-btn" onClick={() => switchView("forgot")}>Mot de passe oublié ?</button>
//                   </div>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading
//                       ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot-loader" /><span className="dot-loader" /><span className="dot-loader" /></span>
//                       : "Se connecter"}
//                   </button>

//                   <div className="divider"><span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>OU</span></div>

//                   <button type="button"
//                     style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px", color: "rgba(200,218,240,0.55)", fontSize: "13px", fontFamily: "'Jost',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.3s" }}
//                     onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.09)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.32)"; }}
//                     onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
//                   >
//                     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//                       <path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
//                     </svg>
//                     Connexion avec SSO entreprise
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "22px", fontSize: "13px", color: "rgba(200,218,240,0.42)" }}>
//                     Pas encore de compte ?{" "}<button className="link-btn" onClick={() => switchView("register")}>S&apos;inscrire</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ INSCRIPTION ════ */}
//               {view === "register" && (
//                 <form onSubmit={handleRegister} noValidate>
//                   {regErrors.global && (
//                     <div className="global-err">
//                       <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
//                         <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
//                       </svg>
//                       <span style={{ fontSize: "13px", color: "#fca5a5", lineHeight: 1.5 }}>{regErrors.global}</span>
//                     </div>
//                   )}

//                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
//                     <InputField
//                       label="Prénom" type="text" placeholder="Marc"
//                       value={regFirstName}
//                       onChange={(v) => { setRegFirstName(v); if (regErrors.firstName) setRegErrors(p => ({ ...p, firstName: undefined })); }}
//                       icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
//                       error={regErrors.firstName}
//                     />
//                     <InputField
//                       label="Nom" type="text" placeholder="Ane"
//                       value={regLastName}
//                       onChange={(v) => { setRegLastName(v); if (regErrors.lastName) setRegErrors(p => ({ ...p, lastName: undefined })); }}
//                       icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
//                       error={regErrors.lastName}
//                     />
//                   </div>

//                   <InputField
//                     label="Adresse e-mail professionnelle" type="email" placeholder="Votre@email.com"
//                     value={regEmail}
//                     onChange={(v) => { setRegEmail(v); if (regErrors.email) setRegErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
//                     error={regErrors.email}
//                   />

//                   {/* Rôle */}
//                   <div style={{ marginBottom: "20px" }}>
//                     <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: regErrors.role ? "#fca5a5" : "#60a5fa", marginBottom: "8px", fontFamily: "'Cormorant Garamond',serif" }}>
//                       Rôle dans l&apos;entreprise <span style={{ color: "#f87171" }}>*</span>
//                     </label>
//                     <div style={{ position: "relative" }}>
//                       <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: regErrors.role ? "rgba(248,113,113,0.7)" : "rgba(200,218,240,0.28)", display: "flex", zIndex: 1, pointerEvents: "none" }}>
//                         <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
//                       </span>
//                       <select
//                         className={`select-field${regErrors.role ? " err" : ""}`}
//                         value={regRole}
//                         onChange={(e) => { setRegRole(e.target.value); if (regErrors.role) setRegErrors(p => ({ ...p, role: undefined })); }}
//                       >
//                         <option value="">Sélectionner un rôle</option>
//                         {/* <option value="Admin">Administrateur</option> */}
//                         <option value="Utis">Utilisateur</option>
//                       </select>
//                       <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(200,218,240,0.3)", pointerEvents: "none" }}>
//                         <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
//                       </span>
//                     </div>
//                     {regErrors.role && (
//                       <div className="err-inline">
//                         <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
//                         {regErrors.role}
//                       </div>
//                     )}
//                   </div>

//                   <InputField
//                     label="Mot de passe" type="password" placeholder="Minimum 8 caractères"
//                     value={regPassword}
//                     onChange={(v) => { setRegPassword(v); if (regErrors.password) setRegErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
//                     error={regErrors.password}
//                   />

//                   {regPassword.length > 0 && (
//                     <div style={{ marginBottom: "18px", marginTop: "-12px" }}>
//                       <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
//                         {[0, 1, 2, 3].map((i) => (
//                           <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: pwdStrength >= i ? pwdColors[pwdStrength] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
//                         ))}
//                       </div>
//                       <span style={{ fontSize: "11px", color: pwdStrength >= 0 ? pwdColors[pwdStrength] : "rgba(200,218,240,0.4)", fontWeight: 600 }}>
//                         {pwdStrength >= 0 ? pwdLabels[pwdStrength] : ""}
//                       </span>
//                     </div>
//                   )}

//                   <InputField
//                     label="Confirmer le mot de passe" type="password" placeholder="Répétez le mot de passe"
//                     value={regConfirm}
//                     onChange={(v) => { setRegConfirm(v); if (regErrors.confirm) setRegErrors(p => ({ ...p, confirm: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
//                     error={regErrors.confirm}
//                   />

//                   {regErrors.terms && (
//                     <div className="terms-err">
//                       <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
//                       {regErrors.terms}
//                     </div>
//                   )}

//                   <label style={{
//                     display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer",
//                     fontSize: "12.5px",
//                     color: regErrors.terms ? "rgba(252,165,165,0.9)" : "rgba(200,218,240,0.52)",
//                     marginBottom: "22px", lineHeight: 1.6, userSelect: "none",
//                     padding: "11px 13px", borderRadius: "9px",
//                     border: `1px solid ${regErrors.terms ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.06)"}`,
//                     background: regErrors.terms ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.02)",
//                     transition: "all 0.3s",
//                   }}>
//                     <input
//                       type="checkbox" checked={regTerms}
//                       onChange={(e) => { setRegTerms(e.target.checked); if (regErrors.terms) setRegErrors(p => ({ ...p, terms: undefined })); }}
//                       style={{ accentColor: "#3b82f6", marginTop: "2px", flexShrink: 0, width: "15px", height: "15px", cursor: "pointer" }}
//                     />
//                     <span>
//                       J&apos;accepte les{" "}
//                       <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>conditions d&apos;utilisation</span>
//                       {" "}et la{" "}
//                       <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>politique de confidentialité</span>
//                       <span style={{ color: "#f87171", marginLeft: "3px", fontWeight: 700 }}>*</span>
//                     </span>
//                   </label>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading
//                       ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot-loader" /><span className="dot-loader" /><span className="dot-loader" /></span>
//                       : "Créer mon compte"}
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "rgba(200,218,240,0.4)" }}>
//                     Déjà inscrit ?{" "}<button className="link-btn" onClick={() => switchView("login")}>Se connecter</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ MOT DE PASSE OUBLIÉ ════ */}
//               {view === "forgot" && (
//                 <div>
//                   {forgotSent ? (
//                     <div style={{ textAlign: "center", padding: "24px 0" }}>
//                       <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.45)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 26px", animation: "pulseBorder 2.2s ease infinite" }}>
//                         <svg width="30" height="30" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
//                       </div>
//                       <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", color: "#e8f4ff", marginBottom: "12px", fontWeight: 500 }}>E-mail envoyé !</h3>
//                       <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.6)", lineHeight: 1.75, marginBottom: "28px" }}>
//                         Un lien de réinitialisation a été envoyé à<br />
//                         <span style={{ color: "#60a5fa", fontWeight: 500 }}>{forgotEmail}</span>.<br />
//                         Vérifiez votre boîte de réception.
//                       </p>
//                       <button className="btn-primary" onClick={() => switchView("login")}>Retour à la connexion</button>
//                     </div>
//                   ) : (
//                     <form onSubmit={handleForgot} noValidate>
//                       <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "9px", padding: "14px 16px", marginBottom: "24px", fontSize: "13px", color: "rgba(200,218,240,0.65)", lineHeight: 1.7 }}>
//                         Entrez votre adresse e-mail professionnelle et nous vous enverrons les instructions pour réinitialiser votre mot de passe.
//                       </div>
//                       <InputField
//                         label="Adresse e-mail" type="email" placeholder="votre@email.com"
//                         value={forgotEmail}
//                         onChange={(v) => { setForgotEmail(v); if (forgotErrors.email) setForgotErrors({}); }}
//                         icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
//                         error={forgotErrors.email}
//                       />
//                       <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>Envoyer le lien</button>
//                       <div style={{ textAlign: "center", marginTop: "20px" }}>
//                         <button type="button" className="link-btn" onClick={() => switchView("login")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
//                           <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
//                           Retour à la connexion
//                         </button>
//                       </div>
//                     </form>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Pied de page */}
//             <div style={{ marginTop: "30px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <span style={{ fontSize: "11px", color: "rgba(200,218,240,0.25)", letterSpacing: "0.06em" }}>© 2026 Patrimoine Pro</span>
//               <div style={{ display: "flex", gap: "18px" }}>
//                 {["Confidentialité", "Conditions", "Support"].map((item) => (
//                   <span key={item}
//                     style={{ fontSize: "11px", color: "rgba(200,218,240,0.28)", cursor: "pointer", transition: "color 0.22s", letterSpacing: "0.05em" }}
//                     onMouseEnter={e => (e.currentTarget.style.color = "rgba(96,165,250,0.85)")}
//                     onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,218,240,0.28)")}
//                   >{item}</span>
//                 ))}
//               </div>
//             </div>

//           </div>
//         </div>

//       </div>
//     </>
//   );
// }






// "use client";

// import { useState, useEffect } from "react";
// import {
//   registerUser,
//   loginUser,
//   type RegisteredUser,
// } from "../../lib/userStorage"; // ← adaptez ce chemin selon votre projet

// interface AuthPageProps {
//   onLoginSuccess: (user: RegisteredUser) => void;
// }

// type FormView = "login" | "register" | "forgot";

// interface InputFieldProps {
//   label: string;
//   type: string;
//   placeholder: string;
//   value: string;
//   onChange: (v: string) => void;
//   icon: React.ReactNode;
//   error?: string;
// }

// const EyeIcon = ({ open }: { open: boolean }) =>
//   open ? (
//     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
//     </svg>
//   ) : (
//     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
//       <line x1="1" y1="1" x2="23" y2="23" />
//     </svg>
//   );

// function InputField({ label, type, placeholder, value, onChange, icon, error }: InputFieldProps) {
//   const [showPwd, setShowPwd] = useState(false);
//   const [focused, setFocused] = useState(false);
//   const isPassword = type === "password";
//   const inputType  = isPassword ? (showPwd ? "text" : "password") : type;
//   const hasError   = !!error;

//   return (
//     <div style={{ marginBottom: "20px" }}>
//       <label style={{
//         display: "block", fontSize: "10.5px", fontWeight: 700,
//         letterSpacing: "0.14em", textTransform: "uppercase",
//         color: hasError ? "#fca5a5" : focused ? "#93c5fd" : "#60a5fa",
//         marginBottom: "8px", fontFamily: "'Cormorant Garamond', Georgia, serif",
//         transition: "color 0.25s",
//       }}>
//         {label} <span style={{ color: "#f87171" }}>*</span>
//       </label>
//       <div style={{
//         position: "relative", display: "flex", alignItems: "center",
//         background: hasError ? "rgba(248,113,113,0.06)" : focused ? "rgba(59,130,246,0.09)" : "rgba(255,255,255,0.03)",
//         border: `1px solid ${hasError ? "rgba(248,113,113,0.65)" : focused ? "rgba(96,165,250,0.7)" : "rgba(255,255,255,0.1)"}`,
//         borderRadius: "10px", transition: "all 0.3s ease",
//         boxShadow: hasError
//           ? "0 0 0 3px rgba(248,113,113,0.1), inset 0 1px 4px rgba(0,0,0,0.25)"
//           : focused
//             ? "0 0 0 3px rgba(59,130,246,0.13), inset 0 1px 4px rgba(0,0,0,0.25)"
//             : "inset 0 1px 4px rgba(0,0,0,0.2)",
//       }}>
//         <span style={{
//           position: "absolute", left: "14px",
//           color: hasError ? "rgba(248,113,113,0.8)" : focused ? "#60a5fa" : "rgba(255,255,255,0.22)",
//           transition: "color 0.3s", display: "flex", alignItems: "center",
//         }}>{icon}</span>
//         <input
//           type={inputType} placeholder={placeholder} value={value}
//           onChange={(e) => onChange(e.target.value)}
//           onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
//           style={{
//             width: "100%", background: "transparent", border: "none", outline: "none",
//             padding: "13px 14px 13px 46px", color: "#e8f4ff", fontSize: "14px",
//             fontFamily: "'Jost', sans-serif", letterSpacing: "0.02em",
//           }}
//         />
//         {isPassword && (
//           <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
//             position: "absolute", right: "14px", background: "none", border: "none",
//             color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "0",
//             display: "flex", alignItems: "center", transition: "color 0.2s",
//           }}><EyeIcon open={showPwd} /></button>
//         )}
//       </div>
//       {hasError && (
//         <div style={{
//           display: "flex", alignItems: "center", gap: "6px",
//           marginTop: "6px", padding: "6px 10px",
//           background: "rgba(248,113,113,0.08)", borderRadius: "6px",
//           border: "1px solid rgba(248,113,113,0.2)",
//         }}>
//           <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
//             <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
//           </svg>
//           <span style={{ fontSize: "11.5px", color: "#fca5a5", fontFamily: "'Jost', sans-serif", fontWeight: 500 }}>
//             {error}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ── Cityscape ── */
// const CityscapeSVG = () => (
//   <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg"
//     style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "auto", opacity: 0.15 }}
//     preserveAspectRatio="xMidYMax meet">
//     <defs>
//       <linearGradient id="skyline" x1="0" y1="0" x2="0" y2="1">
//         <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
//         <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.95" />
//       </linearGradient>
//     </defs>
//     <rect x="0" y="200" width="80" height="200" fill="url(#skyline)" />
//     <rect x="20" y="150" width="40" height="250" fill="url(#skyline)" />
//     <rect x="80" y="220" width="60" height="180" fill="url(#skyline)" />
//     <rect x="130" y="170" width="35" height="230" fill="url(#skyline)" />
//     <rect x="155" y="130" width="25" height="270" fill="url(#skyline)" />
//     <polygon points="230,60 240,80 250,80" fill="url(#skyline)" />
//     <rect x="225" y="80" width="30" height="320" fill="url(#skyline)" />
//     <rect x="210" y="160" width="60" height="240" fill="url(#skyline)" />
//     <rect x="280" y="190" width="90" height="210" fill="url(#skyline)" />
//     <rect x="380" y="100" width="50" height="300" fill="url(#skyline)" />
//     <rect x="370" y="140" width="70" height="260" fill="url(#skyline)" />
//     <rect x="450" y="210" width="70" height="190" fill="url(#skyline)" />
//     <rect x="530" y="230" width="55" height="170" fill="url(#skyline)" />
//     <rect x="595" y="80" width="55" height="320" fill="url(#skyline)" />
//     <polygon points="617,50 622,80 628,80" fill="url(#skyline)" />
//     <rect x="680" y="200" width="65" height="200" fill="url(#skyline)" />
//     <rect x="755" y="215" width="80" height="185" fill="url(#skyline)" />
//     <rect x="845" y="190" width="45" height="210" fill="url(#skyline)" />
//     <rect x="900" y="220" width="70" height="180" fill="url(#skyline)" />
//     <rect x="980" y="200" width="80" height="200" fill="url(#skyline)" />
//     <rect x="1060" y="230" width="60" height="170" fill="url(#skyline)" />
//     <rect x="1120" y="210" width="80" height="190" fill="url(#skyline)" />
//     <rect x="0" y="390" width="1200" height="10" fill="rgba(59,130,246,0.5)" />
//   </svg>
// );

// /* ── Particles ── */
// interface Particle { width: number; height: number; left: number; top: number; duration: number; delay: number; }

// function Particles() {
//   const [particles, setParticles] = useState<Particle[]>([]);
//   useEffect(() => {
//     setParticles([...Array(20)].map(() => ({
//       width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
//       left: Math.random() * 100, top: Math.random() * 100,
//       duration: 6 + Math.random() * 8, delay: Math.random() * 6,
//     })));
//   }, []);
//   return (
//     <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
//       {particles.map((p, i) => (
//         <div key={i} style={{
//           position: "absolute", width: `${p.width}px`, height: `${p.height}px`,
//           borderRadius: "50%", background: "rgba(96,165,250,0.6)",
//           left: `${p.left}%`, top: `${p.top}%`,
//           animation: `float ${p.duration}s ease-in-out infinite`,
//           animationDelay: `${p.delay}s`,
//         }} />
//       ))}
//     </div>
//   );
// }

// /* ══════════════════════════════ MAIN COMPONENT ══════════════════════════════ */
// export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
//   const [view, setView]           = useState<FormView>("login");
//   const [animating, setAnimating] = useState(false);
//   const [visible, setVisible]     = useState(true);
//   const [loading, setLoading]     = useState(false);

//   /* ── Login ── */
//   const [loginEmail, setLoginEmail]       = useState("");
//   const [loginPassword, setLoginPassword] = useState("");
//   const [loginErrors, setLoginErrors]     = useState<{ email?: string; password?: string; global?: string }>({});

//   /* ── Register ── */
//   const [regFirstName, setRegFirstName] = useState("");
//   const [regLastName, setRegLastName]   = useState("");
//   const [regEmail, setRegEmail]         = useState("");
//   const [regPassword, setRegPassword]   = useState("");
//   const [regConfirm, setRegConfirm]     = useState("");
//   const [regRole, setRegRole]           = useState("");
//   const [regTerms, setRegTerms]         = useState(false);
//   const [regErrors, setRegErrors]       = useState<{
//     firstName?: string; lastName?: string; email?: string;
//     password?: string; confirm?: string; role?: string; terms?: string; global?: string;
//   }>({});

//   /* ── Forgot ── */
//   const [forgotEmail, setForgotEmail]   = useState("");
//   const [forgotSent, setForgotSent]     = useState(false);
//   const [forgotErrors, setForgotErrors] = useState<{ email?: string }>({});

//   const MSG = "Veuillez remplir ce champ svp";

//   /* ── Switch de vue ── */
//   const switchView = (next: FormView) => {
//     if (next === view || animating) return;
//     setAnimating(true); setVisible(false);
//     setLoginErrors({}); setRegErrors({}); setForgotErrors({});
//     setTimeout(() => {
//       setView(next); setVisible(true); setAnimating(false); setForgotSent(false);
//     }, 300);
//   };

//   /* ── Validation connexion ── */
//   const validateLogin = () => {
//     const e: typeof loginErrors = {};
//     if (!loginEmail.trim())    e.email    = MSG;
//     if (!loginPassword.trim()) e.password = MSG;
//     setLoginErrors(e);
//     return !Object.keys(e).length;
//   };

//   /* ── Validation inscription ── */
//   const validateRegister = () => {
//     const e: typeof regErrors = {};
//     if (!regFirstName.trim()) e.firstName = MSG;
//     if (!regLastName.trim())  e.lastName  = MSG;
//     if (!regEmail.trim())     e.email     = MSG;
//     if (!regRole)             e.role      = "Veuillez sélectionner un rôle svp";
//     if (!regPassword.trim())  e.password  = MSG;
//     if (!regConfirm.trim())   e.confirm   = MSG;
//     else if (regConfirm !== regPassword) e.confirm = "Les mots de passe ne correspondent pas";
//     if (!regTerms)            e.terms     = "Vous devez accepter les conditions d'utilisation svp";
//     setRegErrors(e);
//     return !Object.keys(e).length;
//   };

//   const validateForgot = () => {
//     const e: typeof forgotErrors = {};
//     if (!forgotEmail.trim()) e.email = MSG;
//     setForgotErrors(e);
//     return !Object.keys(e).length;
//   };

//   /* ══════════════════════════════════════════════
//      CONNEXION — vérifie le compte enregistré
//   ══════════════════════════════════════════════ */
//   const handleLogin = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateLogin()) return;
//     setLoading(true);

//     // Légère pause pour l'UX (simulation réseau)
//     setTimeout(() => {
//       const result = loginUser(loginEmail, loginPassword);
//       setLoading(false);

//       if (result.success && result.user) {
//         onLoginSuccess(result.user);
//       } else {
//         // Affichage de l'erreur retournée par userStorage
//         if (result.error?.includes("e-mail") || result.error?.includes("Aucun compte")) {
//           setLoginErrors({ email: result.error });
//         } else if (result.error?.includes("Mot de passe")) {
//           setLoginErrors({ password: result.error });
//         } else {
//           setLoginErrors({ global: result.error });
//         }
//       }
//     }, 800);
//   };

//   /* ══════════════════════════════════════════════
//      INSCRIPTION — crée le compte dans le store
//   ══════════════════════════════════════════════ */
//   const handleRegister = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateRegister()) return;
//     setLoading(true);

//     setTimeout(() => {
//       const result = registerUser({
//         firstName: regFirstName,
//         lastName: regLastName,
//         email: regEmail,
//         password: regPassword,
//         role: regRole,
//       });
//       setLoading(false);

//       if (result.success && result.user) {
//         onLoginSuccess(result.user);
//       } else {
//         // E-mail déjà utilisé
//         setRegErrors({ email: result.error });
//       }
//     }, 800);
//   };

//   const handleForgot = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateForgot()) return;
//     setForgotSent(true);
//   };

//   /* ── Force du mot de passe ── */
//   const pwdStrength =
//     regPassword.length === 0 ? -1 :
//     regPassword.length < 4   ?  0 :
//     regPassword.length < 6   ?  1 :
//     regPassword.length < 8   ?  2 : 3;
//   const pwdColors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
//   const pwdLabels = ["Trop court", "Faible", "Moyen", "Fort"];

//   /* ══ JSX ══════════════════════════════════════════════════════════════════ */
//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&family=Cinzel:wght@400;500;600&display=swap');

//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//         ::placeholder { color: rgba(255,255,255,0.2) !important; font-family: 'Jost', sans-serif; font-size: 13.5px; }
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.4); border-radius: 2px; }

//         .auth-root {
//           display: flex; height: 100vh; overflow: hidden;
//           background: #05111f; font-family: 'Jost', sans-serif;
//         }
//         .left-panel {
//           width: 46%; flex-shrink: 0; position: relative; overflow: hidden;
//           background: linear-gradient(150deg, #071628 0%, #0d2348 50%, #060f1e 100%);
//           display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 48px;
//         }
//         .right-panel {
//           width: 54%; flex-shrink: 0; display: flex; flex-direction: column;
//           align-items: center; justify-content: flex-start; padding: 48px 36px 56px;
//           background: linear-gradient(170deg, #07111f 0%, #050d18 60%, #060e1c 100%);
//           position: relative; overflow-y: auto; overflow-x: hidden;
//         }

//         @keyframes float {
//           0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
//           50% { transform: translateY(-22px) scale(1.35); opacity: 0.85; }
//         }
//         @keyframes fadeUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes pulseBorder {
//           0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
//           50% { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
//         }
//         @keyframes rotateSlow {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
//         @keyframes dotBounce {
//           0%, 80%, 100% { transform: scale(0); opacity: 0; }
//           40% { transform: scale(1); opacity: 1; }
//         }
//         @keyframes shake {
//           0%, 100% { transform: translateX(0); }
//           18% { transform: translateX(-7px); }
//           36% { transform: translateX(7px); }
//           54% { transform: translateX(-4px); }
//           72% { transform: translateX(4px); }
//         }
//         @keyframes slideDown {
//           from { opacity: 0; transform: translateY(-8px); }
//           to { opacity: 1; transform: translateY(0); }
//         }

//         .form-enter { animation: fadeUp 0.38s ease forwards; }

//         .btn-primary {
//           width: 100%; padding: 15px;
//           background: linear-gradient(135deg, #1a45c8 0%, #2f6ef5 45%, #1a45c8 100%);
//           background-size: 200% auto; border: none; border-radius: 11px; color: #fff;
//           font-family: 'Cinzel', serif; font-size: 12.5px; font-weight: 600;
//           letter-spacing: 0.18em; cursor: pointer;
//           transition: background-position .45s, transform .2s, box-shadow .2s;
//           position: relative; overflow: hidden;
//           box-shadow: 0 5px 22px rgba(59,130,246,0.38);
//         }
//         .btn-primary:hover:not(:disabled) {
//           background-position: right center; transform: translateY(-2px);
//           box-shadow: 0 10px 32px rgba(59,130,246,0.55);
//         }
//         .btn-primary:active:not(:disabled) { transform: translateY(0); }
//         .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
//         .btn-primary::after {
//           content: ''; position: absolute; top: -50%; left: -65%;
//           width: 28%; height: 200%; background: rgba(255,255,255,0.16);
//           transform: skewX(-20deg); transition: left .55s ease;
//         }
//         .btn-primary:hover:not(:disabled)::after { left: 135%; }

//         .dot {
//           display: inline-block; width: 7px; height: 7px; border-radius: 50%;
//           background: #fff; margin: 0 3px;
//           animation: dotBounce 1.3s infinite ease-in-out;
//         }
//         .dot:nth-child(2) { animation-delay: .18s; }
//         .dot:nth-child(3) { animation-delay: .36s; }

//         .tab-btn {
//           flex: 1; padding: 12px; background: transparent; border: none;
//           border-bottom: 2px solid transparent; color: rgba(255,255,255,0.28);
//           font-family: 'Jost', sans-serif; font-size: 11.5px; font-weight: 600;
//           letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.28s;
//         }
//         .tab-btn.active { color: #60a5fa; border-bottom-color: #60a5fa; }
//         .tab-btn:hover:not(.active) { color: rgba(255,255,255,0.62); }

//         .link-btn {
//           background: none; border: none; color: #60a5fa; font-family: 'Jost', sans-serif;
//           font-size: 13px; cursor: pointer; text-decoration: underline;
//           text-underline-offset: 3px; transition: color 0.22s; padding: 0;
//         }
//         .link-btn:hover { color: #93c5fd; }

//         .divider { display: flex; align-items: center; gap: 14px; margin: 20px 0; }
//         .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07); }

//         .select-field {
//           width: 100%; background: rgba(255,255,255,0.03);
//           border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
//           padding: 13px 14px 13px 46px; color: #e8f4ff; font-size: 14px;
//           font-family: 'Jost', sans-serif; outline: none; appearance: none;
//           cursor: pointer; transition: all 0.3s;
//         }
//         .select-field.err {
//           border-color: rgba(248,113,113,0.65); background: rgba(248,113,113,0.06);
//           box-shadow: 0 0 0 3px rgba(248,113,113,0.1);
//         }
//         .select-field:focus {
//           border-color: rgba(96,165,250,0.7); background: rgba(59,130,246,0.09);
//           box-shadow: 0 0 0 3px rgba(59,130,246,0.13);
//         }
//         .select-field option { background: #0c1e38; color: #e8f4ff; }

//         .err-inline {
//           display: flex; align-items: center; gap: 6px;
//           margin-top: 6px; padding: 6px 10px;
//           background: rgba(248,113,113,0.08); border-radius: 6px;
//           border: 1px solid rgba(248,113,113,0.2);
//           font-size: 11.5px; color: #fca5a5; font-family: 'Jost', sans-serif;
//           font-weight: 500; animation: slideDown 0.25s ease;
//         }

//         .terms-err {
//           display: flex; align-items: center; gap: 8px;
//           padding: 10px 14px; border-radius: 8px;
//           background: rgba(248,113,113,0.09); border: 1px solid rgba(248,113,113,0.28);
//           font-size: 12px; color: #fca5a5; font-family: 'Jost', sans-serif;
//           font-weight: 500; margin-bottom: 12px; animation: shake 0.42s ease;
//         }

//         /* ── Bannière d'erreur globale ── */
//         .global-err {
//           display: flex; align-items: flex-start; gap: 10px;
//           padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;
//           background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.35);
//           animation: slideDown 0.3s ease;
//         }

//         .form-card {
//           background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
//           border-radius: 18px; padding: 32px 30px; backdrop-filter: blur(6px);
//           box-shadow: 0 8px 40px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset;
//         }

//         .badge {
//           display: inline-flex; align-items: center; gap: 6px;
//           padding: 5px 12px; border-radius: 20px;
//           background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25);
//           font-size: 10.5px; color: #93c5fd; font-family: 'Jost', sans-serif;
//           letter-spacing: 0.06em; margin-bottom: 20px;
//         }

//         @media (max-width: 768px) {
//           .left-panel { display: none !important; }
//           .right-panel { width: 100% !important; }
//         }
//       `}</style>

//       <div className="auth-root">

//         {/* ══ PANNEAU GAUCHE ══ */}
//         <div className="left-panel">
//           <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.09) 0%,transparent 65%)", pointerEvents: "none" }} />
//           <div style={{ position: "absolute", bottom: "8%", right: "-12%", width: "360px", height: "360px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.06) 0%,transparent 65%)", pointerEvents: "none" }} />
//           <Particles />
//           <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "430px", height: "430px", borderRadius: "50%", border: "1px solid rgba(59,130,246,0.08)", animation: "rotateSlow 32s linear infinite", pointerEvents: "none" }}>
//             {[0,60,120,180,240,300].map((deg) => (
//               <div key={deg} style={{ position: "absolute", width: "7px", height: "7px", borderRadius: "50%", background: "rgba(96,165,250,0.6)", top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(215px) translate(-50%,-50%)` }} />
//             ))}
//           </div>
//           <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "400px" }}>
//             <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.45)", marginBottom: "28px", animation: "pulseBorder 3.2s ease-in-out infinite", boxShadow: "0 0 50px rgba(59,130,246,0.18)" }}>
//               <svg width="46" height="46" viewBox="0 0 44 44" fill="none">
//                 <path d="M22 4 L36 10 L36 28 C36 35 22 40 22 40 C22 40 8 35 8 28 L8 10 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round"/>
//                 <rect x="15" y="18" width="4" height="14" fill="#60a5fa" opacity="0.7"/>
//                 <rect x="20" y="13" width="4" height="19" fill="#93c5fd" opacity="0.9"/>
//                 <rect x="25" y="20" width="4" height="12" fill="#60a5fa" opacity="0.7"/>
//                 <line x1="13" y1="18" x2="31" y2="18" stroke="#93c5fd" strokeWidth="1.5"/>
//               </svg>
//             </div>
//             <div style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.35em", color: "#60a5fa", textTransform: "uppercase", marginBottom: "12px", opacity: 0.9 }}>Patrimoine</div>
//             <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 300, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "4px" }}>Gestion de</h1>
//             <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 600, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "28px", fontStyle: "italic" }}>Patrimoine d&apos;Entreprise</h1>
//             <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center", marginBottom: "26px" }}>
//               <div style={{ width: "44px", height: "1px", background: "linear-gradient(to right,transparent,rgba(59,130,246,0.6))" }} />
//               <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6", opacity: 0.8, boxShadow: "0 0 8px rgba(59,130,246,0.6)" }} />
//               <div style={{ width: "44px", height: "1px", background: "linear-gradient(to left,transparent,rgba(59,130,246,0.6))" }} />
//             </div>
//             <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(15px,1.7vw,19px)", fontWeight: 300, fontStyle: "italic", color: "rgba(224,236,255,0.88)", lineHeight: 1.75, marginBottom: "18px" }}>
//               Votre espace de gestion patrimoniale d&apos;excellence
//             </p>
//             <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.5)", lineHeight: 1.85, fontWeight: 300, maxWidth: "310px", margin: "0 auto 38px" }}>
//               Pilotez, analysez et optimisez les actifs de votre entreprise depuis une plateforme sécurisée.
//             </p>
//             <div style={{ display: "flex", gap: "28px", justifyContent: "center" }}>
//               {[{ value: "500+", label: "Entreprises" }, { value: "99.9%", label: "Disponibilité" }, { value: "ISO 27001", label: "Certifié" }].map((s) => (
//                 <div key={s.label} style={{ textAlign: "center" }}>
//                   <div style={{ fontFamily: "'Cinzel',serif", fontSize: "14px", color: "#60a5fa", fontWeight: 600, marginBottom: "4px" }}>{s.value}</div>
//                   <div style={{ fontSize: "9.5px", color: "rgba(200,218,240,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{s.label}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <CityscapeSVG />
//           <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)", pointerEvents: "none" }} />
//         </div>

//         {/* ══ PANNEAU DROIT ══ */}
//         <div className="right-panel">
//           <div style={{ position: "fixed", top: 0, right: 0, width: "280px", height: "280px", background: "radial-gradient(ellipse at top right,rgba(59,130,246,0.08),transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

//           <div style={{ width: "100%", maxWidth: "450px", position: "relative", zIndex: 1 }}>

//             {/* En-tête */}
//             <div style={{ marginBottom: "28px" }}>
//               <div className="badge">
//                 <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                   <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
//                 </svg>
//                 {view === "login" ? "Accès sécurisé · SSL" : view === "register" ? "Nouveau compte · SSL" : "Récupération sécurisée"}
//               </div>
//               <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "34px", fontWeight: 500, color: "#e8f4ff", marginBottom: "8px", lineHeight: 1.1 }}>
//                 {view === "login" ? "Connexion" : view === "register" ? "Inscription" : "Mot de passe oublié"}
//               </h2>
//               <p style={{ color: "rgba(200,218,240,0.55)", fontSize: "13.5px", lineHeight: 1.65 }}>
//                 {view === "login"
//                   ? "Accédez à votre tableau de bord patrimonial."
//                   : view === "register"
//                     ? "Créez votre espace de gestion patrimoniale."
//                     : "Nous vous enverrons un lien de réinitialisation."}
//               </p>
//             </div>

//             {/* Onglets */}
//             {view !== "forgot" && (
//               <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "28px" }}>
//                 <button className={`tab-btn ${view === "login" ? "active" : ""}`} onClick={() => switchView("login")}>Connexion</button>
//                 <button className={`tab-btn ${view === "register" ? "active" : ""}`} onClick={() => switchView("register")}>Inscription</button>
//               </div>
//             )}

//             {/* Formulaires */}
//             <div className={`form-card ${visible ? "form-enter" : ""}`} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.22s" }}>

//               {/* ════ CONNEXION ════ */}
//               {view === "login" && (
//                 <form onSubmit={handleLogin} noValidate>

//                   {/* ── Bannière erreur globale ── */}
//                   {loginErrors.global && (
//                     <div className="global-err">
//                       <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
//                         <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
//                       </svg>
//                       <span style={{ fontSize: "13px", color: "#fca5a5", lineHeight: 1.5 }}>{loginErrors.global}</span>
//                     </div>
//                   )}

//                   <InputField
//                     label="Adresse e-mail" type="email" placeholder="votre@gmail.com"
//                     value={loginEmail}
//                     onChange={(v) => { setLoginEmail(v); if (loginErrors.email) setLoginErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
//                     error={loginErrors.email}
//                   />
//                   <InputField
//                     label="Mot de passe" type="password" placeholder="••••••••••"
//                     value={loginPassword}
//                     onChange={(v) => { setLoginPassword(v); if (loginErrors.password) setLoginErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
//                     error={loginErrors.password}
//                   />

//                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "26px", marginTop: "-4px" }}>
//                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "rgba(200,218,240,0.5)", userSelect: "none" }}>
//                       <input type="checkbox" style={{ accentColor: "#3b82f6" }} /> Se souvenir de moi
//                     </label>
//                     <button type="button" className="link-btn" onClick={() => switchView("forgot")}>Mot de passe oublié ?</button>
//                   </div>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading
//                       ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot"/><span className="dot"/><span className="dot"/></span>
//                       : "Se connecter"}
//                   </button>

//                   <div className="divider"><span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>OU</span></div>

//                   <button type="button"
//                     style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px", color: "rgba(200,218,240,0.55)", fontSize: "13px", fontFamily: "'Jost',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.3s" }}
//                     onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.09)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.32)"; }}
//                     onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
//                   >
//                     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
//                     Connexion avec SSO entreprise
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "22px", fontSize: "13px", color: "rgba(200,218,240,0.42)" }}>
//                     Pas encore de compte ?{" "}<button className="link-btn" onClick={() => switchView("register")}>S&apos;inscrire</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ INSCRIPTION ════ */}
//               {view === "register" && (
//                 <form onSubmit={handleRegister} noValidate>

//                   {regErrors.global && (
//                     <div className="global-err">
//                       <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: "1px" }}>
//                         <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
//                       </svg>
//                       <span style={{ fontSize: "13px", color: "#fca5a5", lineHeight: 1.5 }}>{regErrors.global}</span>
//                     </div>
//                   )}

//                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
//                     <InputField
//                       label="Prénom" type="text" placeholder="Marc"
//                       value={regFirstName}
//                       onChange={(v) => { setRegFirstName(v); if (regErrors.firstName) setRegErrors(p => ({ ...p, firstName: undefined })); }}
//                       icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
//                       error={regErrors.firstName}
//                     />
//                     <InputField
//                       label="Nom" type="text" placeholder="Ane"
//                       value={regLastName}
//                       onChange={(v) => { setRegLastName(v); if (regErrors.lastName) setRegErrors(p => ({ ...p, lastName: undefined })); }}
//                       icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
//                       error={regErrors.lastName}
//                     />
//                   </div>

//                   <InputField
//                     label="Adresse e-mail professionnelle" type="email" placeholder="prenom.nom@gmail.com"
//                     value={regEmail}
//                     onChange={(v) => { setRegEmail(v); if (regErrors.email) setRegErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
//                     error={regErrors.email}
//                   />

//                   {/* Rôle */}
//                   <div style={{ marginBottom: "20px" }}>
//                     <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: regErrors.role ? "#fca5a5" : "#60a5fa", marginBottom: "8px", fontFamily: "'Cormorant Garamond',serif" }}>
//                       Rôle dans l&apos;entreprise <span style={{ color: "#f87171" }}>*</span>
//                     </label>
//                     <div style={{ position: "relative" }}>
//                       <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: regErrors.role ? "rgba(248,113,113,0.7)" : "rgba(200,218,240,0.28)", display: "flex", zIndex: 1, pointerEvents: "none" }}>
//                         <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
//                       </span>
//                       <select
//                         className={`select-field${regErrors.role ? " err" : ""}`}
//                         value={regRole}
//                         onChange={(e) => { setRegRole(e.target.value); if (regErrors.role) setRegErrors(p => ({ ...p, role: undefined })); }}
//                       >
//                         <option value="">Sélectionner un rôle</option>
//                         <option value="daf">Directeur Administratif et Financier</option>
//                         <option value="comptable">Comptable</option>
//                         <option value="gestionnaire">Gestionnaire de patrimoine</option>
//                         <option value="auditeur">Auditeur interne</option>
//                         <option value="admin">Administrateur système</option>
//                         <option value="informaticien">Informaticien</option>
//                         <option value="fournisseur">Fournisseur</option>
//                         <option value="rh">Ressource Humaine</option>
//                       </select>
//                       <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(200,218,240,0.3)", pointerEvents: "none" }}>
//                         <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
//                       </span>
//                     </div>
//                     {regErrors.role && (
//                       <div className="err-inline">
//                         <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
//                         {regErrors.role}
//                       </div>
//                     )}
//                   </div>

//                   <InputField
//                     label="Mot de passe" type="password" placeholder="Minimum 8 caractères"
//                     value={regPassword}
//                     onChange={(v) => { setRegPassword(v); if (regErrors.password) setRegErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
//                     error={regErrors.password}
//                   />

//                   {regPassword.length > 0 && (
//                     <div style={{ marginBottom: "18px", marginTop: "-12px" }}>
//                       <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
//                         {[0,1,2,3].map((i) => (
//                           <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: pwdStrength >= i ? pwdColors[pwdStrength] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
//                         ))}
//                       </div>
//                       <span style={{ fontSize: "11px", color: pwdStrength >= 0 ? pwdColors[pwdStrength] : "rgba(200,218,240,0.4)", fontWeight: 600 }}>
//                         {pwdStrength >= 0 ? pwdLabels[pwdStrength] : ""}
//                       </span>
//                     </div>
//                   )}

//                   <InputField
//                     label="Confirmer le mot de passe" type="password" placeholder="Répétez le mot de passe"
//                     value={regConfirm}
//                     onChange={(v) => { setRegConfirm(v); if (regErrors.confirm) setRegErrors(p => ({ ...p, confirm: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
//                     error={regErrors.confirm}
//                   />

//                   {regErrors.terms && (
//                     <div className="terms-err">
//                       <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
//                       {regErrors.terms}
//                     </div>
//                   )}

//                   <label style={{
//                     display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer",
//                     fontSize: "12.5px",
//                     color: regErrors.terms ? "rgba(252,165,165,0.9)" : "rgba(200,218,240,0.52)",
//                     marginBottom: "22px", lineHeight: 1.6, userSelect: "none",
//                     padding: "11px 13px", borderRadius: "9px",
//                     border: `1px solid ${regErrors.terms ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.06)"}`,
//                     background: regErrors.terms ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.02)",
//                     transition: "all 0.3s",
//                   }}>
//                     <input
//                       type="checkbox" checked={regTerms}
//                       onChange={(e) => { setRegTerms(e.target.checked); if (regErrors.terms) setRegErrors(p => ({ ...p, terms: undefined })); }}
//                       style={{ accentColor: "#3b82f6", marginTop: "2px", flexShrink: 0, width: "15px", height: "15px", cursor: "pointer" }}
//                     />
//                     <span>
//                       J&apos;accepte les{" "}
//                       <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>conditions d&apos;utilisation</span>
//                       {" "}et la{" "}
//                       <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>politique de confidentialité</span>
//                       <span style={{ color: "#f87171", marginLeft: "3px", fontWeight: 700 }}>*</span>
//                     </span>
//                   </label>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading
//                       ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot"/><span className="dot"/><span className="dot"/></span>
//                       : "Créer mon compte"}
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "rgba(200,218,240,0.4)" }}>
//                     Déjà inscrit ?{" "}<button className="link-btn" onClick={() => switchView("login")}>Se connecter</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ MOT DE PASSE OUBLIÉ ════ */}
//               {view === "forgot" && (
//                 <div>
//                   {forgotSent ? (
//                     <div style={{ textAlign: "center", padding: "24px 0" }}>
//                       <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.45)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 26px", animation: "pulseBorder 2.2s ease infinite" }}>
//                         <svg width="30" height="30" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
//                       </div>
//                       <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", color: "#e8f4ff", marginBottom: "12px", fontWeight: 500 }}>E-mail envoyé !</h3>
//                       <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.6)", lineHeight: 1.75, marginBottom: "28px" }}>
//                         Un lien de réinitialisation a été envoyé à<br />
//                         <span style={{ color: "#60a5fa", fontWeight: 500 }}>{forgotEmail}</span>.<br />
//                         Vérifiez votre boîte de réception.
//                       </p>
//                       <button className="btn-primary" onClick={() => switchView("login")}>Retour à la connexion</button>
//                     </div>
//                   ) : (
//                     <form onSubmit={handleForgot} noValidate>
//                       <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "9px", padding: "14px 16px", marginBottom: "24px", fontSize: "13px", color: "rgba(200,218,240,0.65)", lineHeight: 1.7 }}>
//                         Entrez votre adresse e-mail professionnelle et nous vous enverrons les instructions pour réinitialiser votre mot de passe.
//                       </div>
//                       <InputField
//                         label="Adresse e-mail" type="email" placeholder="votre@gmail.com"
//                         value={forgotEmail}
//                         onChange={(v) => { setForgotEmail(v); if (forgotErrors.email) setForgotErrors({}); }}
//                         icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
//                         error={forgotErrors.email}
//                       />
//                       <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>Envoyer le lien</button>
//                       <div style={{ textAlign: "center", marginTop: "20px" }}>
//                         <button type="button" className="link-btn" onClick={() => switchView("login")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
//                           <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
//                           Retour à la connexion
//                         </button>
//                       </div>
//                     </form>
//                   )}
//                 </div>
//               )}

//             </div>

//             {/* Pied de page */}
//             <div style={{ marginTop: "30px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <span style={{ fontSize: "11px", color: "rgba(200,218,240,0.25)", letterSpacing: "0.06em" }}>© 2026 Patrimoine Pro</span>
//               <div style={{ display: "flex", gap: "18px" }}>
//                 {["Confidentialité", "Conditions", "Support"].map((item) => (
//                   <span key={item}
//                     style={{ fontSize: "11px", color: "rgba(200,218,240,0.28)", cursor: "pointer", transition: "color 0.22s", letterSpacing: "0.05em" }}
//                     onMouseEnter={e => (e.currentTarget.style.color = "rgba(96,165,250,0.85)")}
//                     onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,218,240,0.28)")}
//                   >{item}</span>
//                 ))}
//               </div>
//             </div>

//           </div>
//         </div>

//       </div>
//     </>
//   );
// }






// "use client";

// import { useState, useEffect } from "react";

// interface AuthPageProps {
//   onLoginSuccess: () => void;
// }

// type FormView = "login" | "register" | "forgot";

// interface InputFieldProps {
//   label: string;
//   type: string;
//   placeholder: string;
//   value: string;
//   onChange: (v: string) => void;
//   icon: React.ReactNode;
//   error?: string;
// }

// const EyeIcon = ({ open }: { open: boolean }) =>
//   open ? (
//     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
//     </svg>
//   ) : (
//     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//       <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
//       <line x1="1" y1="1" x2="23" y2="23" />
//     </svg>
//   );

// /* ── Champ de saisie avec gestion d'erreur ─────────────────────────────── */
// function InputField({ label, type, placeholder, value, onChange, icon, error }: InputFieldProps) {
//   const [showPwd, setShowPwd] = useState(false);
//   const [focused, setFocused] = useState(false);
//   const isPassword = type === "password";
//   const inputType  = isPassword ? (showPwd ? "text" : "password") : type;
//   const hasError   = !!error;

//   return (
//     <div style={{ marginBottom: "20px" }}>
//       <label style={{
//         display: "block", fontSize: "10.5px", fontWeight: 700,
//         letterSpacing: "0.14em", textTransform: "uppercase",
//         color: hasError ? "#fca5a5" : focused ? "#93c5fd" : "#60a5fa",
//         marginBottom: "8px", fontFamily: "'Cormorant Garamond', Georgia, serif",
//         transition: "color 0.25s",
//       }}>
//         {label} <span style={{ color: "#f87171" }}>*</span>
//       </label>
//       <div style={{
//         position: "relative", display: "flex", alignItems: "center",
//         background: hasError
//           ? "rgba(248,113,113,0.06)"
//           : focused ? "rgba(59,130,246,0.09)" : "rgba(255,255,255,0.03)",
//         border: `1px solid ${hasError ? "rgba(248,113,113,0.65)" : focused ? "rgba(96,165,250,0.7)" : "rgba(255,255,255,0.1)"}`,
//         borderRadius: "10px", transition: "all 0.3s ease",
//         boxShadow: hasError
//           ? "0 0 0 3px rgba(248,113,113,0.1), inset 0 1px 4px rgba(0,0,0,0.25)"
//           : focused
//             ? "0 0 0 3px rgba(59,130,246,0.13), inset 0 1px 4px rgba(0,0,0,0.25)"
//             : "inset 0 1px 4px rgba(0,0,0,0.2)",
//       }}>
//         <span style={{
//           position: "absolute", left: "14px",
//           color: hasError ? "rgba(248,113,113,0.8)" : focused ? "#60a5fa" : "rgba(255,255,255,0.22)",
//           transition: "color 0.3s", display: "flex", alignItems: "center",
//         }}>{icon}</span>
//         <input
//           type={inputType} placeholder={placeholder} value={value}
//           onChange={(e) => onChange(e.target.value)}
//           onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
//           style={{
//             width: "100%", background: "transparent", border: "none", outline: "none",
//             padding: "13px 14px 13px 46px", color: "#e8f4ff", fontSize: "14px",
//             fontFamily: "'Jost', sans-serif", letterSpacing: "0.02em",
//           }}
//         />
//         {isPassword && (
//           <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
//             position: "absolute", right: "14px", background: "none", border: "none",
//             color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "0",
//             display: "flex", alignItems: "center", transition: "color 0.2s",
//           }}><EyeIcon open={showPwd} /></button>
//         )}
//       </div>
//       {/* ✅ Message d'erreur */}
//       {hasError && (
//         <div style={{
//           display: "flex", alignItems: "center", gap: "6px",
//           marginTop: "6px", padding: "6px 10px",
//           background: "rgba(248,113,113,0.08)", borderRadius: "6px",
//           border: "1px solid rgba(248,113,113,0.2)",
//         }}>
//           <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
//             <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
//           </svg>
//           <span style={{ fontSize: "11.5px", color: "#fca5a5", fontFamily: "'Jost', sans-serif", fontWeight: 500 }}>
//             {error}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ── Cityscape ───────────────────────────────────────────────────────────── */
// const CityscapeSVG = () => (
//   <svg viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg"
//     style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "auto", opacity: 0.15 }}
//     preserveAspectRatio="xMidYMax meet">
//     <defs>
//       <linearGradient id="skyline" x1="0" y1="0" x2="0" y2="1">
//         <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
//         <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.95" />
//       </linearGradient>
//     </defs>
//     <rect x="0" y="200" width="80" height="200" fill="url(#skyline)" />
//     <rect x="20" y="150" width="40" height="250" fill="url(#skyline)" />
//     <rect x="80" y="220" width="60" height="180" fill="url(#skyline)" />
//     <rect x="130" y="170" width="35" height="230" fill="url(#skyline)" />
//     <rect x="155" y="130" width="25" height="270" fill="url(#skyline)" />
//     <polygon points="230,60 240,80 250,80" fill="url(#skyline)" />
//     <rect x="225" y="80" width="30" height="320" fill="url(#skyline)" />
//     <rect x="210" y="160" width="60" height="240" fill="url(#skyline)" />
//     <rect x="280" y="190" width="90" height="210" fill="url(#skyline)" />
//     <rect x="380" y="100" width="50" height="300" fill="url(#skyline)" />
//     <rect x="370" y="140" width="70" height="260" fill="url(#skyline)" />
//     <rect x="450" y="210" width="70" height="190" fill="url(#skyline)" />
//     <rect x="530" y="230" width="55" height="170" fill="url(#skyline)" />
//     <rect x="595" y="80" width="55" height="320" fill="url(#skyline)" />
//     <polygon points="617,50 622,80 628,80" fill="url(#skyline)" />
//     <rect x="680" y="200" width="65" height="200" fill="url(#skyline)" />
//     <rect x="755" y="215" width="80" height="185" fill="url(#skyline)" />
//     <rect x="845" y="190" width="45" height="210" fill="url(#skyline)" />
//     <rect x="900" y="220" width="70" height="180" fill="url(#skyline)" />
//     <rect x="980" y="200" width="80" height="200" fill="url(#skyline)" />
//     <rect x="1060" y="230" width="60" height="170" fill="url(#skyline)" />
//     <rect x="1120" y="210" width="80" height="190" fill="url(#skyline)" />
//     <rect x="0" y="390" width="1200" height="10" fill="rgba(59,130,246,0.5)" />
//   </svg>
// );

// /* ── Particles ───────────────────────────────────────────────────────────── */
// interface Particle { width: number; height: number; left: number; top: number; duration: number; delay: number; }

// function Particles() {
//   const [particles, setParticles] = useState<Particle[]>([]);
//   useEffect(() => {
//     setParticles([...Array(20)].map(() => ({
//       width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
//       left: Math.random() * 100, top: Math.random() * 100,
//       duration: 6 + Math.random() * 8, delay: Math.random() * 6,
//     })));
//   }, []);
//   return (
//     <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
//       {particles.map((p, i) => (
//         <div key={i} style={{
//           position: "absolute", width: `${p.width}px`, height: `${p.height}px`,
//           borderRadius: "50%", background: "rgba(96,165,250,0.6)",
//           left: `${p.left}%`, top: `${p.top}%`,
//           animation: `float ${p.duration}s ease-in-out infinite`,
//           animationDelay: `${p.delay}s`,
//         }} />
//       ))}
//     </div>
//   );
// }

// /* ══════════════════════════════ MAIN COMPONENT ══════════════════════════════ */
// export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
//   const [view, setView]           = useState<FormView>("login");
//   const [animating, setAnimating] = useState(false);
//   const [visible, setVisible]     = useState(true);
//   const [loading, setLoading]     = useState(false);

//   /* ── États Login ── */
//   const [loginEmail, setLoginEmail]       = useState("");
//   const [loginPassword, setLoginPassword] = useState("");
//   const [loginErrors, setLoginErrors]     = useState<{ email?: string; password?: string }>({});

//   /* ── États Register ── */
//   const [regFirstName, setRegFirstName] = useState("");
//   const [regLastName, setRegLastName]   = useState("");
//   const [regEmail, setRegEmail]         = useState("");
//   const [regPassword, setRegPassword]   = useState("");
//   const [regConfirm, setRegConfirm]     = useState("");
//   const [regRole, setRegRole]           = useState("");
//   const [regTerms, setRegTerms]         = useState(false);
//   const [regErrors, setRegErrors]       = useState<{
//     firstName?: string; lastName?: string; email?: string;
//     password?: string; confirm?: string; role?: string; terms?: string;
//   }>({});

//   /* ── États Forgot ── */
//   const [forgotEmail, setForgotEmail] = useState("");
//   const [forgotSent, setForgotSent]   = useState(false);
//   const [forgotErrors, setForgotErrors] = useState<{ email?: string }>({});

//   const MSG = "Veuillez remplir ce champ svp";

//   /* ── Switch de vue ── */
//   const switchView = (next: FormView) => {
//     if (next === view || animating) return;
//     setAnimating(true); setVisible(false);
//     setLoginErrors({}); setRegErrors({}); setForgotErrors({});
//     setTimeout(() => {
//       setView(next); setVisible(true); setAnimating(false); setForgotSent(false);
//     }, 300);
//   };

//   /* ── Validations ── */
//   const validateLogin = () => {
//     const e: typeof loginErrors = {};
//     if (!loginEmail.trim())    e.email    = MSG;
//     if (!loginPassword.trim()) e.password = MSG;
//     setLoginErrors(e);
//     return !Object.keys(e).length;
//   };

//   const validateRegister = () => {
//     const e: typeof regErrors = {};
//     if (!regFirstName.trim()) e.firstName = MSG;
//     if (!regLastName.trim())  e.lastName  = MSG;
//     if (!regEmail.trim())     e.email     = MSG;
//     if (!regRole)             e.role      = "Veuillez sélectionner un rôle svp";
//     if (!regPassword.trim())  e.password  = MSG;
//     if (!regConfirm.trim())   e.confirm   = MSG;
//     else if (regConfirm !== regPassword) e.confirm = "Les mots de passe ne correspondent pas";
//     if (!regTerms)            e.terms     = "Vous devez accepter les conditions d'utilisation svp";
//     setRegErrors(e);
//     return !Object.keys(e).length;
//   };

//   const validateForgot = () => {
//     const e: typeof forgotErrors = {};
//     if (!forgotEmail.trim()) e.email = MSG;
//     setForgotErrors(e);
//     return !Object.keys(e).length;
//   };

//   /* ── Handlers ── */
//   const handleLogin = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateLogin()) return;
//     setLoading(true);
//     setTimeout(() => { setLoading(false); onLoginSuccess(); }, 1200);
//   };

//   const handleRegister = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateRegister()) return;
//     setLoading(true);
//     setTimeout(() => { setLoading(false); onLoginSuccess(); }, 1200);
//   };

//   const handleForgot = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateForgot()) return;
//     setForgotSent(true);
//   };

//   /* ── Force du mot de passe ── */
//   const pwdStrength =
//     regPassword.length === 0 ? -1 :
//     regPassword.length < 4   ?  0 :
//     regPassword.length < 6   ?  1 :
//     regPassword.length < 8   ?  2 : 3;
//   const pwdColors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
//   const pwdLabels = ["Trop court", "Faible", "Moyen", "Fort"];

//   /* ══ JSX ══════════════════════════════════════════════════════════════════ */
//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&family=Cinzel:wght@400;500;600&display=swap');

//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//         ::placeholder { color: rgba(255,255,255,0.2) !important; font-family: 'Jost', sans-serif; font-size: 13.5px; }
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.4); border-radius: 2px; }

//         /* ── Layout principal : 100vh fixe, pas de scroll global ── */
//         .auth-root {
//           display: flex;
//           height: 100vh;
//           overflow: hidden;
//           background: #05111f;
//           font-family: 'Jost', sans-serif;
//         }

//         /* ── Panneau gauche : entièrement statique ── */
//         .left-panel {
//           width: 46%;
//           flex-shrink: 0;
//           position: relative;
//           overflow: hidden;
//           background: linear-gradient(150deg, #071628 0%, #0d2348 50%, #060f1e 100%);
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           padding: 60px 48px;
//         }

//         /* ── Panneau droit : seul élément défilable ── */
//         .right-panel {
//           width: 54%;
//           flex-shrink: 0;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: flex-start;
//           padding: 48px 36px 56px;
//           background: linear-gradient(170deg, #07111f 0%, #050d18 60%, #060e1c 100%);
//           position: relative;
//           overflow-y: auto;
//           overflow-x: hidden;
//         }

//         /* ── Animations ── */
//         @keyframes float {
//           0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
//           50%       { transform: translateY(-22px) scale(1.35); opacity: 0.85; }
//         }
//         @keyframes fadeUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes pulseBorder {
//           0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
//           50%       { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
//         }
//         @keyframes rotateSlow {
//           from { transform: rotate(0deg); }
//           to   { transform: rotate(360deg); }
//         }
//         @keyframes dotBounce {
//           0%, 80%, 100% { transform: scale(0); opacity: 0; }
//           40%            { transform: scale(1); opacity: 1; }
//         }
//         @keyframes shake {
//           0%, 100% { transform: translateX(0); }
//           18%       { transform: translateX(-7px); }
//           36%       { transform: translateX(7px); }
//           54%       { transform: translateX(-4px); }
//           72%       { transform: translateX(4px); }
//         }
//         @keyframes slideDown {
//           from { opacity: 0; transform: translateY(-8px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }

//         .form-enter { animation: fadeUp 0.38s ease forwards; }

//         /* ── Bouton principal ── */
//         .btn-primary {
//           width: 100%; padding: 15px;
//           background: linear-gradient(135deg, #1a45c8 0%, #2f6ef5 45%, #1a45c8 100%);
//           background-size: 200% auto;
//           border: none; border-radius: 11px; color: #fff;
//           font-family: 'Cinzel', serif; font-size: 12.5px; font-weight: 600;
//           letter-spacing: 0.18em; cursor: pointer;
//           transition: background-position .45s, transform .2s, box-shadow .2s;
//           position: relative; overflow: hidden;
//           box-shadow: 0 5px 22px rgba(59,130,246,0.38);
//         }
//         .btn-primary:hover:not(:disabled) {
//           background-position: right center;
//           transform: translateY(-2px);
//           box-shadow: 0 10px 32px rgba(59,130,246,0.55);
//         }
//         .btn-primary:active:not(:disabled) { transform: translateY(0); }
//         .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
//         .btn-primary::after {
//           content: ''; position: absolute; top: -50%; left: -65%;
//           width: 28%; height: 200%;
//           background: rgba(255,255,255,0.16); transform: skewX(-20deg);
//           transition: left .55s ease;
//         }
//         .btn-primary:hover:not(:disabled)::after { left: 135%; }

//         /* ── Loader dots ── */
//         .dot {
//           display: inline-block; width: 7px; height: 7px;
//           border-radius: 50%; background: #fff; margin: 0 3px;
//           animation: dotBounce 1.3s infinite ease-in-out;
//         }
//         .dot:nth-child(2) { animation-delay: .18s; }
//         .dot:nth-child(3) { animation-delay: .36s; }

//         /* ── Onglets ── */
//         .tab-btn {
//           flex: 1; padding: 12px; background: transparent; border: none;
//           border-bottom: 2px solid transparent;
//           color: rgba(255,255,255,0.28);
//           font-family: 'Jost', sans-serif; font-size: 11.5px; font-weight: 600;
//           letter-spacing: 0.12em; text-transform: uppercase;
//           cursor: pointer; transition: all 0.28s;
//         }
//         .tab-btn.active { color: #60a5fa; border-bottom-color: #60a5fa; }
//         .tab-btn:hover:not(.active) { color: rgba(255,255,255,0.62); }

//         /* ── Lien bouton ── */
//         .link-btn {
//           background: none; border: none; color: #60a5fa;
//           font-family: 'Jost', sans-serif; font-size: 13px;
//           cursor: pointer; text-decoration: underline;
//           text-underline-offset: 3px; transition: color 0.22s; padding: 0;
//         }
//         .link-btn:hover { color: #93c5fd; }

//         /* ── Séparateur ── */
//         .divider { display: flex; align-items: center; gap: 14px; margin: 20px 0; }
//         .divider::before, .divider::after {
//           content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07);
//         }

//         /* ── Select ── */
//         .select-field {
//           width: 100%;
//           background: rgba(255,255,255,0.03);
//           border: 1px solid rgba(255,255,255,0.1);
//           border-radius: 10px;
//           padding: 13px 14px 13px 46px;
//           color: #e8f4ff; font-size: 14px; font-family: 'Jost', sans-serif;
//           outline: none; appearance: none; cursor: pointer; transition: all 0.3s;
//         }
//         .select-field.err {
//           border-color: rgba(248,113,113,0.65);
//           background: rgba(248,113,113,0.06);
//           box-shadow: 0 0 0 3px rgba(248,113,113,0.1);
//         }
//         .select-field:focus {
//           border-color: rgba(96,165,250,0.7);
//           background: rgba(59,130,246,0.09);
//           box-shadow: 0 0 0 3px rgba(59,130,246,0.13);
//         }
//         .select-field option { background: #0c1e38; color: #e8f4ff; }

//         /* ── Bloc d'erreur générique ── */
//         .err-inline {
//           display: flex; align-items: center; gap: 6px;
//           margin-top: 6px; padding: 6px 10px;
//           background: rgba(248,113,113,0.08); border-radius: 6px;
//           border: 1px solid rgba(248,113,113,0.2);
//           font-size: 11.5px; color: #fca5a5;
//           font-family: 'Jost', sans-serif; font-weight: 500;
//           animation: slideDown 0.25s ease;
//         }

//         /* ── Bloc erreur conditions (shake) ── */
//         .terms-err {
//           display: flex; align-items: center; gap: 8px;
//           padding: 10px 14px; border-radius: 8px;
//           background: rgba(248,113,113,0.09);
//           border: 1px solid rgba(248,113,113,0.28);
//           font-size: 12px; color: #fca5a5;
//           font-family: 'Jost', sans-serif; font-weight: 500;
//           margin-bottom: 12px;
//           animation: shake 0.42s ease;
//         }

//         /* ── Carte de formulaire ── */
//         .form-card {
//           background: rgba(255,255,255,0.025);
//           border: 1px solid rgba(255,255,255,0.07);
//           border-radius: 18px;
//           padding: 32px 30px;
//           backdrop-filter: blur(6px);
//           box-shadow: 0 8px 40px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset;
//         }

//         /* ── Badge de sécurité ── */
//         .badge {
//           display: inline-flex; align-items: center; gap: 6px;
//           padding: 5px 12px; border-radius: 20px;
//           background: rgba(59,130,246,0.1);
//           border: 1px solid rgba(59,130,246,0.25);
//           font-size: 10.5px; color: #93c5fd;
//           font-family: 'Jost', sans-serif; letter-spacing: 0.06em;
//           margin-bottom: 20px;
//         }

//         @media (max-width: 768px) {
//           .left-panel  { display: none !important; }
//           .right-panel { width: 100% !important; }
//         }
//       `}</style>

//       <div className="auth-root">

//         {/* ══════════════ PANNEAU GAUCHE — STATIQUE ══════════════ */}
//         <div className="left-panel">
//           {/* Halos décoratifs */}
//           <div style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.09) 0%,transparent 65%)", pointerEvents: "none" }} />
//           <div style={{ position: "absolute", bottom: "8%", right: "-12%", width: "360px", height: "360px", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.06) 0%,transparent 65%)", pointerEvents: "none" }} />

//           <Particles />

//           {/* Anneau rotatif */}
//           <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "430px", height: "430px", borderRadius: "50%", border: "1px solid rgba(59,130,246,0.08)", animation: "rotateSlow 32s linear infinite", pointerEvents: "none" }}>
//             {[0,60,120,180,240,300].map((deg) => (
//               <div key={deg} style={{ position: "absolute", width: "7px", height: "7px", borderRadius: "50%", background: "rgba(96,165,250,0.6)", top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(215px) translate(-50%,-50%)` }} />
//             ))}
//           </div>

//           {/* Contenu */}
//           <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "400px" }}>
//             {/* Logo */}
//             <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.45)", marginBottom: "28px", animation: "pulseBorder 3.2s ease-in-out infinite", boxShadow: "0 0 50px rgba(59,130,246,0.18)" }}>
//               <svg width="46" height="46" viewBox="0 0 44 44" fill="none">
//                 <path d="M22 4 L36 10 L36 28 C36 35 22 40 22 40 C22 40 8 35 8 28 L8 10 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round"/>
//                 <rect x="15" y="18" width="4" height="14" fill="#60a5fa" opacity="0.7"/>
//                 <rect x="20" y="13" width="4" height="19" fill="#93c5fd" opacity="0.9"/>
//                 <rect x="25" y="20" width="4" height="12" fill="#60a5fa" opacity="0.7"/>
//                 <line x1="13" y1="18" x2="31" y2="18" stroke="#93c5fd" strokeWidth="1.5"/>
//               </svg>
//             </div>

//             <div style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.35em", color: "#60a5fa", textTransform: "uppercase", marginBottom: "12px", opacity: 0.9 }}>Patrimoine</div>
//             <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 300, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "4px" }}>Gestion de</h1>
//             <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(26px,3vw,36px)", fontWeight: 600, color: "#e8f4ff", lineHeight: 1.2, marginBottom: "28px", fontStyle: "italic" }}>Patrimoine d&apos;Entreprise</h1>

//             {/* Séparateur décoratif */}
//             <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center", marginBottom: "26px" }}>
//               <div style={{ width: "44px", height: "1px", background: "linear-gradient(to right,transparent,rgba(59,130,246,0.6))" }} />
//               <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6", opacity: 0.8, boxShadow: "0 0 8px rgba(59,130,246,0.6)" }} />
//               <div style={{ width: "44px", height: "1px", background: "linear-gradient(to left,transparent,rgba(59,130,246,0.6))" }} />
//             </div>

//             <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "clamp(15px,1.7vw,19px)", fontWeight: 300, fontStyle: "italic", color: "rgba(224,236,255,0.88)", lineHeight: 1.75, marginBottom: "18px" }}>
//               Votre espace de gestion patrimoniale d&apos;excellence
//             </p>
//             <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.5)", lineHeight: 1.85, fontWeight: 300, maxWidth: "310px", margin: "0 auto 38px" }}>
//               Pilotez, analysez et optimisez les actifs de votre entreprise depuis une plateforme sécurisée.
//             </p>

//             {/* Statistiques */}
//             <div style={{ display: "flex", gap: "28px", justifyContent: "center" }}>
//               {[{ value: "500+", label: "Entreprises" }, { value: "99.9%", label: "Disponibilité" }, { value: "ISO 27001", label: "Certifié" }].map((s) => (
//                 <div key={s.label} style={{ textAlign: "center" }}>
//                   <div style={{ fontFamily: "'Cinzel',serif", fontSize: "14px", color: "#60a5fa", fontWeight: 600, marginBottom: "4px" }}>{s.value}</div>
//                   <div style={{ fontSize: "9.5px", color: "rgba(200,218,240,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{s.label}</div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <CityscapeSVG />
//           <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)", pointerEvents: "none" }} />
//         </div>

//         {/* ══════════════ PANNEAU DROIT — DÉFILABLE ══════════════ */}
//         <div className="right-panel">
//           {/* Halo coin haut droite */}
//           <div style={{ position: "fixed", top: 0, right: 0, width: "280px", height: "280px", background: "radial-gradient(ellipse at top right,rgba(59,130,246,0.08),transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

//           <div style={{ width: "100%", maxWidth: "450px", position: "relative", zIndex: 1 }}>

//             {/* ── En-tête ── */}
//             <div style={{ marginBottom: "28px" }}>
//               <div className="badge">
//                 <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                   <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
//                 </svg>
//                 {view === "login" ? "Accès sécurisé · SSL" : view === "register" ? "Nouveau compte · SSL" : "Récupération sécurisée"}
//               </div>
//               <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "34px", fontWeight: 500, color: "#e8f4ff", marginBottom: "8px", lineHeight: 1.1 }}>
//                 {view === "login" ? "Connexion" : view === "register" ? "Inscription" : "Mot de passe oublié"}
//               </h2>
//               <p style={{ color: "rgba(200,218,240,0.55)", fontSize: "13.5px", lineHeight: 1.65 }}>
//                 {view === "login"
//                   ? "Accédez à votre tableau de bord patrimonial."
//                   : view === "register"
//                     ? "Créez votre espace de gestion patrimoniale."
//                     : "Nous vous enverrons un lien de réinitialisation."}
//               </p>
//             </div>

//             {/* ── Onglets ── */}
//             {view !== "forgot" && (
//               <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "28px" }}>
//                 <button className={`tab-btn ${view === "login" ? "active" : ""}`} onClick={() => switchView("login")}>Connexion</button>
//                 <button className={`tab-btn ${view === "register" ? "active" : ""}`} onClick={() => switchView("register")}>Inscription</button>
//               </div>
//             )}

//             {/* ── Formulaires ── */}
//             <div className={`form-card ${visible ? "form-enter" : ""}`} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.22s" }}>

//               {/* ════ CONNEXION ════ */}
//               {view === "login" && (
//                 <form onSubmit={handleLogin} noValidate>
//                   <InputField
//                     label="Adresse e-mail" type="email" placeholder="votre@gmail.com"
//                     value={loginEmail}
//                     onChange={(v) => { setLoginEmail(v); if (loginErrors.email) setLoginErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
//                     error={loginErrors.email}
//                   />
//                   <InputField
//                     label="Mot de passe" type="password" placeholder="••••••••••"
//                     value={loginPassword}
//                     onChange={(v) => { setLoginPassword(v); if (loginErrors.password) setLoginErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
//                     error={loginErrors.password}
//                   />

//                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "26px", marginTop: "-4px" }}>
//                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "rgba(200,218,240,0.5)", userSelect: "none" }}>
//                       <input type="checkbox" style={{ accentColor: "#3b82f6" }} /> Se souvenir de moi
//                     </label>
//                     <button type="button" className="link-btn" onClick={() => switchView("forgot")}>Mot de passe oublié ?</button>
//                   </div>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading
//                       ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot"/><span className="dot"/><span className="dot"/></span>
//                       : "Se connecter"}
//                   </button>

//                   <div className="divider"><span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>OU</span></div>

//                   <button type="button"
//                     style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px", color: "rgba(200,218,240,0.55)", fontSize: "13px", fontFamily: "'Jost',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.3s" }}
//                     onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.09)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.32)"; }}
//                     onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
//                   >
//                     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
//                     Connexion avec SSO entreprise
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "22px", fontSize: "13px", color: "rgba(200,218,240,0.42)" }}>
//                     Pas encore de compte ?{" "}<button className="link-btn" onClick={() => switchView("register")}>S&apos;inscrire</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ INSCRIPTION ════ */}
//               {view === "register" && (
//                 <form onSubmit={handleRegister} noValidate>
//                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
//                     <InputField
//                       label="Prénom" type="text" placeholder="Marc"
//                       value={regFirstName}
//                       onChange={(v) => { setRegFirstName(v); if (regErrors.firstName) setRegErrors(p => ({ ...p, firstName: undefined })); }}
//                       icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
//                       error={regErrors.firstName}
//                     />
//                     <InputField
//                       label="Nom" type="text" placeholder="Ane"
//                       value={regLastName}
//                       onChange={(v) => { setRegLastName(v); if (regErrors.lastName) setRegErrors(p => ({ ...p, lastName: undefined })); }}
//                       icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
//                       error={regErrors.lastName}
//                     />
//                   </div>

//                   <InputField
//                     label="Adresse e-mail professionnelle" type="email" placeholder="prenom.nom@gmail.com"
//                     value={regEmail}
//                     onChange={(v) => { setRegEmail(v); if (regErrors.email) setRegErrors(p => ({ ...p, email: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
//                     error={regErrors.email}
//                   />

//                   {/* Rôle */}
//                   <div style={{ marginBottom: "20px" }}>
//                     <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: regErrors.role ? "#fca5a5" : "#60a5fa", marginBottom: "8px", fontFamily: "'Cormorant Garamond',serif" }}>
//                       Rôle dans l&apos;entreprise <span style={{ color: "#f87171" }}>*</span>
//                     </label>
//                     <div style={{ position: "relative" }}>
//                       <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: regErrors.role ? "rgba(248,113,113,0.7)" : "rgba(200,218,240,0.28)", display: "flex", zIndex: 1, pointerEvents: "none" }}>
//                         <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
//                       </span>
//                       <select
//                         className={`select-field${regErrors.role ? " err" : ""}`}
//                         value={regRole}
//                         onChange={(e) => { setRegRole(e.target.value); if (regErrors.role) setRegErrors(p => ({ ...p, role: undefined })); }}
//                       >
//                         <option value="">Sélectionner un rôle</option>
//                         <option value="daf">Directeur Administratif et Financier</option>
//                         <option value="comptable">Comptable</option>
//                         <option value="gestionnaire">Gestionnaire de patrimoine</option>
//                         <option value="auditeur">Auditeur interne</option>
//                         <option value="admin">Administrateur système</option>
//                         <option value="informaticien">Informaticien</option>
//                         <option value="fournisseur">Fournisseur</option>
//                         <option value="rh">Ressource Humaine</option>
//                       </select>
//                       <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(200,218,240,0.3)", pointerEvents: "none" }}>
//                         <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
//                       </span>
//                     </div>
//                     {regErrors.role && (
//                       <div className="err-inline">
//                         <svg width="12" height="12" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
//                         {regErrors.role}
//                       </div>
//                     )}
//                   </div>

//                   <InputField
//                     label="Mot de passe" type="password" placeholder="Minimum 8 caractères"
//                     value={regPassword}
//                     onChange={(v) => { setRegPassword(v); if (regErrors.password) setRegErrors(p => ({ ...p, password: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
//                     error={regErrors.password}
//                   />

//                   {/* Jauge de force */}
//                   {regPassword.length > 0 && (
//                     <div style={{ marginBottom: "18px", marginTop: "-12px" }}>
//                       <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
//                         {[0,1,2,3].map((i) => (
//                           <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: pwdStrength >= i ? pwdColors[pwdStrength] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
//                         ))}
//                       </div>
//                       <span style={{ fontSize: "11px", color: pwdStrength >= 0 ? pwdColors[pwdStrength] : "rgba(200,218,240,0.4)", fontWeight: 600 }}>
//                         {pwdStrength >= 0 ? pwdLabels[pwdStrength] : ""}
//                       </span>
//                     </div>
//                   )}

//                   <InputField
//                     label="Confirmer le mot de passe" type="password" placeholder="Répétez le mot de passe"
//                     value={regConfirm}
//                     onChange={(v) => { setRegConfirm(v); if (regErrors.confirm) setRegErrors(p => ({ ...p, confirm: undefined })); }}
//                     icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
//                     error={regErrors.confirm}
//                   />

//                   {/* ✅ Erreur conditions */}
//                   {regErrors.terms && (
//                     <div className="terms-err">
//                       <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2.2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
//                       {regErrors.terms}
//                     </div>
//                   )}

//                   {/* ✅ Checkbox conditions obligatoires */}
//                   <label style={{
//                     display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer",
//                     fontSize: "12.5px",
//                     color: regErrors.terms ? "rgba(252,165,165,0.9)" : "rgba(200,218,240,0.52)",
//                     marginBottom: "22px", lineHeight: 1.6, userSelect: "none",
//                     padding: "11px 13px", borderRadius: "9px",
//                     border: `1px solid ${regErrors.terms ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.06)"}`,
//                     background: regErrors.terms ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.02)",
//                     transition: "all 0.3s",
//                   }}>
//                     <input
//                       type="checkbox" checked={regTerms}
//                       onChange={(e) => { setRegTerms(e.target.checked); if (regErrors.terms) setRegErrors(p => ({ ...p, terms: undefined })); }}
//                       style={{ accentColor: "#3b82f6", marginTop: "2px", flexShrink: 0, width: "15px", height: "15px", cursor: "pointer" }}
//                     />
//                     <span>
//                       J&apos;accepte les{" "}
//                       <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>conditions d&apos;utilisation</span>
//                       {" "}et la{" "}
//                       <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>politique de confidentialité</span>
//                       <span style={{ color: "#f87171", marginLeft: "3px", fontWeight: 700 }}>*</span>
//                     </span>
//                   </label>

//                   <button type="submit" className="btn-primary" disabled={loading}>
//                     {loading
//                       ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}><span className="dot"/><span className="dot"/><span className="dot"/></span>
//                       : "Créer mon compte"}
//                   </button>

//                   <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "rgba(200,218,240,0.4)" }}>
//                     Déjà inscrit ?{" "}<button className="link-btn" onClick={() => switchView("login")}>Se connecter</button>
//                   </p>
//                 </form>
//               )}

//               {/* ════ MOT DE PASSE OUBLIÉ ════ */}
//               {view === "forgot" && (
//                 <div>
//                   {forgotSent ? (
//                     <div style={{ textAlign: "center", padding: "24px 0" }}>
//                       <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.45)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 26px", animation: "pulseBorder 2.2s ease infinite" }}>
//                         <svg width="30" height="30" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
//                       </div>
//                       <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", color: "#e8f4ff", marginBottom: "12px", fontWeight: 500 }}>E-mail envoyé !</h3>
//                       <p style={{ fontSize: "13.5px", color: "rgba(200,218,240,0.6)", lineHeight: 1.75, marginBottom: "28px" }}>
//                         Un lien de réinitialisation a été envoyé à<br />
//                         <span style={{ color: "#60a5fa", fontWeight: 500 }}>{forgotEmail}</span>.<br />
//                         Vérifiez votre boîte de réception.
//                       </p>
//                       <button className="btn-primary" onClick={() => switchView("login")}>Retour à la connexion</button>
//                     </div>
//                   ) : (
//                     <form onSubmit={handleForgot} noValidate>
//                       <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "9px", padding: "14px 16px", marginBottom: "24px", fontSize: "13px", color: "rgba(200,218,240,0.65)", lineHeight: 1.7 }}>
//                         Entrez votre adresse e-mail professionnelle et nous vous enverrons les instructions pour réinitialiser votre mot de passe.
//                       </div>
//                       <InputField
//                         label="Adresse e-mail" type="email" placeholder="votre@gmail.com"
//                         value={forgotEmail}
//                         onChange={(v) => { setForgotEmail(v); if (forgotErrors.email) setForgotErrors({}); }}
//                         icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
//                         error={forgotErrors.email}
//                       />
//                       <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>Envoyer le lien</button>
//                       <div style={{ textAlign: "center", marginTop: "20px" }}>
//                         <button type="button" className="link-btn" onClick={() => switchView("login")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
//                           <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
//                           Retour à la connexion
//                         </button>
//                       </div>
//                     </form>
//                   )}
//                 </div>
//               )}

//             </div>{/* fin form-card */}

//             {/* ── Pied de page ── */}
//             <div style={{ marginTop: "30px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <span style={{ fontSize: "11px", color: "rgba(200,218,240,0.25)", letterSpacing: "0.06em" }}>© 2026 Patrimoine Pro</span>
//               <div style={{ display: "flex", gap: "18px" }}>
//                 {["Confidentialité", "Conditions", "Support"].map((item) => (
//                   <span key={item}
//                     style={{ fontSize: "11px", color: "rgba(200,218,240,0.28)", cursor: "pointer", transition: "color 0.22s", letterSpacing: "0.05em" }}
//                     onMouseEnter={e => (e.currentTarget.style.color = "rgba(96,165,250,0.85)")}
//                     onMouseLeave={e => (e.currentTarget.style.color = "rgba(200,218,240,0.28)")}
//                   >{item}</span>
//                 ))}
//               </div>
//             </div>

//           </div>
//         </div>

//       </div>
//     </>
//   );
// }