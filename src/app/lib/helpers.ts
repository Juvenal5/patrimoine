import { prisma } from "./prisma";

// ─── Génération d'un code inventaire unique ────────────────────────────────
// Format : <PREFIXE-CATEGORIE>-<ANNEE>-<SEQUENCE sur 4 chiffres>
// ex : INF-2026-0001

const PREFIXES: Record<string, string> = {
  Informatique: "INF",
  Mobilier: "MOB",
  Véhicule: "VEH",
  Équipement: "EQP",
  Électroménager: "ELM",
  Télécommunication: "TEL",
  Immobilier: "IMM",
  Autre: "AUT",
};

export async function genererCodeInventaire(categorie?: string | null): Promise<string> {
  const prefixe = PREFIXES[categorie || "Autre"] ?? "AUT";
  const annee = new Date().getFullYear();
  const debutAnnee = new Date(`${annee}-01-01T00:00:00.000Z`);

  const count = await prisma.bien.count({
    where: { createdAt: { gte: debutAnnee }, codeInventaire: { startsWith: `${prefixe}-${annee}-` } },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `${prefixe}-${annee}-${sequence}`;
}

// ─── Conversion Buffer -> ArrayBuffer (compatible BodyInit de NextResponse) ─
// TypeScript ne considère pas Buffer comme assignable à BodyInit selon les
// versions de @types/node / lib DOM. On extrait l'ArrayBuffer sous-jacent.
export function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

// ─── Parsing sécurisé des query params numériques ──────────────────────────

export function parseIntSafe(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ─── Bornes de dates pour une "période" (utilisé par Dashboard & Rapports) ─

export function bornesPeriode(periode: string, debutPerso?: string | null, finPerso?: string | null) {
  const maintenant = new Date();
  let debut: Date;
  let fin: Date = maintenant;

  switch (periode) {
    case "today": {
      debut = new Date(maintenant); debut.setHours(0, 0, 0, 0);
      break;
    }
    case "week": {
      debut = new Date(maintenant);
      const jour = debut.getDay() || 7; // lundi = 1
      debut.setDate(debut.getDate() - jour + 1);
      debut.setHours(0, 0, 0, 0);
      break;
    }
    case "year": {
      debut = new Date(maintenant.getFullYear(), 0, 1);
      break;
    }
    case "custom": {
      debut = debutPerso ? new Date(debutPerso) : new Date(maintenant.getFullYear(), 0, 1);
      fin = finPerso ? new Date(finPerso) : maintenant;
      break;
    }
    case "semaine": {
      debut = new Date(maintenant);
      debut.setDate(debut.getDate() - 7);
      break;
    }
    case "annee": {
      debut = new Date(maintenant);
      debut.setFullYear(debut.getFullYear() - 1);
      break;
    }
    case "month":
    case "mois":
    default: {
      debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
      break;
    }
  }
  return { debut, fin };
}





// import  prisma  from "./prisma";

// // ─── Génération d'un code inventaire unique ────────────────────────────────
// // Format : <PREFIXE-CATEGORIE>-<ANNEE>-<SEQUENCE sur 4 chiffres>
// // ex : INF-2026-0001

// const PREFIXES: Record<string, string> = {
//   Informatique: "INF",
//   Mobilier: "MOB",
//   Véhicule: "VEH",
//   Équipement: "EQP",
//   Électroménager: "ELM",
//   Télécommunication: "TEL",
//   Immobilier: "IMM",
//   Autre: "AUT",
// };

// export async function genererCodeInventaire(categorie?: string | null): Promise<string> {
//   const prefixe = PREFIXES[categorie || "Autre"] ?? "AUT";
//   const annee = new Date().getFullYear();
//   const debutAnnee = new Date(`${annee}-01-01T00:00:00.000Z`);

//   const count = await prisma.bien.count({
//     where: { createdAt: { gte: debutAnnee }, codeInventaire: { startsWith: `${prefixe}-${annee}-` } },
//   });

//   const sequence = String(count + 1).padStart(4, "0");
//   return `${prefixe}-${annee}-${sequence}`;
// }

// // ─── Parsing sécurisé des query params numériques ──────────────────────────

// export function parseIntSafe(value: string | null, fallback: number): number {
//   if (!value) return fallback;
//   const n = parseInt(value, 10);
//   return Number.isFinite(n) && n > 0 ? n : fallback;
// }

// // ─── Bornes de dates pour une "période" (utilisé par Dashboard & Rapports) ─

// export function bornesPeriode(periode: string, debutPerso?: string | null, finPerso?: string | null) {
//   const maintenant = new Date();
//   let debut: Date;
//   let fin: Date = maintenant;

//   switch (periode) {
//     case "today": {
//       debut = new Date(maintenant); debut.setHours(0, 0, 0, 0);
//       break;
//     }
//     case "week": {
//       debut = new Date(maintenant);
//       const jour = debut.getDay() || 7; // lundi = 1
//       debut.setDate(debut.getDate() - jour + 1);
//       debut.setHours(0, 0, 0, 0);
//       break;
//     }
//     case "year": {
//       debut = new Date(maintenant.getFullYear(), 0, 1);
//       break;
//     }
//     case "custom": {
//       debut = debutPerso ? new Date(debutPerso) : new Date(maintenant.getFullYear(), 0, 1);
//       fin = finPerso ? new Date(finPerso) : maintenant;
//       break;
//     }
//     case "semaine": {
//       debut = new Date(maintenant);
//       debut.setDate(debut.getDate() - 7);
//       break;
//     }
//     case "annee": {
//       debut = new Date(maintenant);
//       debut.setFullYear(debut.getFullYear() - 1);
//       break;
//     }
//     case "month":
//     case "mois":
//     default: {
//       debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
//       break;
//     }
//   }
//   return { debut, fin };
// }