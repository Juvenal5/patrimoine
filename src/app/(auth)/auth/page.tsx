"use client";

import { useState } from "react";
import {
  FiMail,
  FiLock,
  FiPhone,
  FiUser,
  FiShield,
} from "react-icons/fi";

export default function AuthPage() {
  const [mode, setMode] = useState<
    "login" | "register" | "forgot"
  >("login");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [registerData, setRegisterData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    password: "",
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [forgotEmail, setForgotEmail] = useState("");

  async function handleRegister(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerData),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setMessage(data.message);

      window.location.href = "/dashboard";
    } catch (error) {
      setError("Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setMessage(data.message);

      window.location.href = "/dashboard";
    } catch (error) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: forgotEmail,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setMessage(data.message);
    } catch (error) {
      setError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-[#07111f]">
      {/* LEFT */}
      <div
        className="hidden lg:flex w-1/2 relative p-16 items-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=2070&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-xl text-white z-10">
          <div className="w-24 h-24 rounded-3xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center mb-8 backdrop-blur-md">
            <FiShield className="text-5xl text-cyan-400" />
          </div>

          <h1 className="text-6xl font-black leading-tight mb-6">
            Gestion de
            <span className="block text-cyan-400">
              Patrimoine
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-8">
            Bienvenue sur votre plateforme de gestion
            du patrimoine d’entreprise.
            <br />
            <br />
            Gérez efficacement vos biens,
            affectations, maintenances et
            utilisateurs dans une interface moderne,
            rapide et sécurisée.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
              <h3 className="text-3xl font-bold text-cyan-400">
                100%
              </h3>
              <p className="text-slate-300 mt-2">
                Sécurisé
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
              <h3 className="text-3xl font-bold text-cyan-400">
                24/7
              </h3>
              <p className="text-slate-300 mt-2">
                Disponible
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#091524] via-[#0d1729] to-[#07111f]">
        <div className="w-full max-w-xl rounded-[35px] border border-white/10 bg-white/5 backdrop-blur-2xl p-10 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-white mb-3">
              {mode === "login"
                ? "Connexion"
                : mode === "register"
                ? "Inscription"
                : "Mot de passe oublié"}
            </h2>

            <p className="text-slate-400">
              Accédez à votre espace sécurisé
            </p>
          </div>

          <div className="flex gap-3 justify-center mb-8 flex-wrap">
            <button
              onClick={() => setMode("login")}
              className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                mode === "login"
                  ? "bg-cyan-500 text-black"
                  : "bg-white/5 text-white"
              }`}
            >
              Connexion
            </button>

            <button
              onClick={() => setMode("register")}
              className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                mode === "register"
                  ? "bg-cyan-500 text-black"
                  : "bg-white/5 text-white"
              }`}
            >
              Inscription
            </button>

            <button
              onClick={() => setMode("forgot")}
              className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                mode === "forgot"
                  ? "bg-cyan-500 text-black"
                  : "bg-white/5 text-white"
              }`}
            >
              Récupération
            </button>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-300">
              {message}
            </div>
          )}

          {/* LOGIN */}
          {mode === "login" && (
            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >
              <Input
                icon={<FiMail />}
                placeholder="Adresse email"
                value={loginData.email}
                onChange={(v) =>
                  setLoginData({
                    ...loginData,
                    email: v,
                  })
                }
              />

              <Input
                icon={<FiLock />}
                placeholder="Mot de passe"
                type="password"
                value={loginData.password}
                onChange={(v) =>
                  setLoginData({
                    ...loginData,
                    password: v,
                  })
                }
              />

              <button className="w-full h-14 rounded-2xl bg-cyan-500 text-black font-bold text-lg">
                {loading
                  ? "Connexion..."
                  : "Se connecter"}
              </button>
            </form>
          )}

          {/* REGISTER */}
          {mode === "register" && (
            <form
              onSubmit={handleRegister}
              className="space-y-5"
            >
              <div className="grid md:grid-cols-2 gap-5">
                <Input
                  icon={<FiUser />}
                  placeholder="Nom"
                  value={registerData.nom}
                  onChange={(v) =>
                    setRegisterData({
                      ...registerData,
                      nom: v,
                    })
                  }
                />

                <Input
                  icon={<FiUser />}
                  placeholder="Prénom"
                  value={registerData.prenom}
                  onChange={(v) =>
                    setRegisterData({
                      ...registerData,
                      prenom: v,
                    })
                  }
                />
              </div>

              <Input
                icon={<FiMail />}
                placeholder="Adresse email"
                value={registerData.email}
                onChange={(v) =>
                  setRegisterData({
                    ...registerData,
                    email: v,
                  })
                }
              />

              <Input
                icon={<FiPhone />}
                placeholder="Téléphone"
                value={registerData.telephone}
                onChange={(v) =>
                  setRegisterData({
                    ...registerData,
                    telephone: v,
                  })
                }
              />

              <Input
                icon={<FiLock />}
                placeholder="Mot de passe"
                type="password"
                value={registerData.password}
                onChange={(v) =>
                  setRegisterData({
                    ...registerData,
                    password: v,
                  })
                }
              />

              <button className="w-full h-14 rounded-2xl bg-cyan-500 text-black font-bold text-lg">
                {loading
                  ? "Création..."
                  : "Créer un compte"}
              </button>
            </form>
          )}

          {/* FORGOT */}
          {mode === "forgot" && (
            <form
              onSubmit={handleForgot}
              className="space-y-5"
            >
              <Input
                icon={<FiMail />}
                placeholder="Votre adresse email"
                value={forgotEmail}
                onChange={setForgotEmail}
              />

              <button className="w-full h-14 rounded-2xl bg-cyan-500 text-black font-bold text-lg">
                {loading
                  ? "Envoi..."
                  : "Envoyer le lien"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

interface InputProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

function Input({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
}: InputProps) {
  return (
    <div className="h-14 px-5 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-3 focus-within:border-cyan-400">
      <div className="text-cyan-400 text-xl">
        {icon}
      </div>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="bg-transparent outline-none text-white w-full placeholder:text-slate-500"
      />
    </div>
  );
}