"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * OnlineHeartbeat
 * Placez ce composant dans votre layout.tsx principal (dans le SessionProvider).
 * Il envoie un ping à /api/users/status toutes les 30 secondes
 * pour maintenir le statut "en ligne" de l'utilisateur connecté.
 */
export default function OnlineHeartbeat() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    const ping = async () => {
      try {
        await fetch("/api/users/status", { method: "POST" });
      } catch {
        // Silencieux — pas critique
      }
    };

    ping(); // Ping immédiat à la connexion
    const interval = setInterval(ping, 30_000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [session, status]);

  return null;
}