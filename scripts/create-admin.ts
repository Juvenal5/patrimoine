/**
 * Script de bootstrap — crée le premier compte ADMIN.
 *
 * Usage :
 *   npx tsx scripts/create-admin.ts
 *
 * (ou node avec ts-node selon ta config)
 *
 * Modifie les valeurs ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NOM / ADMIN_PRENOM
 * ci-dessous avant de lancer le script, ou passe-les en variables d'environnement.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "anejuvenal970@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Juve225.@";
const ADMIN_NOM      = process.env.ADMIN_NOM      || "Ane";
const ADMIN_PRENOM   = process.env.ADMIN_PRENOM   || "Juvenal";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    if (existing.role === "ADMIN") {
      console.log(`✔ Le compte admin existe déjà : ${ADMIN_EMAIL}`);
      return;
    }
    // Promeut un compte existant en ADMIN
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: "ADMIN" },
    });
    console.log(`✔ Compte existant promu ADMIN : ${ADMIN_EMAIL}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: {
      nom: ADMIN_NOM,
      prenom: ADMIN_PRENOM,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "ADMIN",
      actif: true,
    },
  });

  await prisma.historique.create({
    data: {
      userId: admin.id,
      action: "CREATION_COMPTE",
      entite: "User",
      entiteId: admin.id,
      nouvelleValeur: JSON.stringify({ email: admin.email, role: "ADMIN", bootstrap: true }),
    },
  });

  console.log("✔ Compte administrateur créé avec succès :");
  console.log(`  Email     : ${ADMIN_EMAIL}`);
  console.log(`  Mot de passe : ${ADMIN_PASSWORD}`);
  console.log("⚠ Pensez à changer ce mot de passe après la première connexion.");
}

main()
  .catch((e) => {
    console.error("Erreur lors de la création de l'admin :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });