generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String        @id @default(uuid())
  departementId String?
  nom           String
  prenom        String
  email         String        @unique
  telephone     String?
  password      String
  role          Role          @default(USER)
  actif         Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  affectations  Affectation[]
  historiques   Historique[]
  departement   Departement?  @relation(fields: [departementId], references: [id])
}

model Departement {
  id            String   @id @default(uuid())
  responsableId String?
  nom           String
  description   String?
  createdAt     DateTime @default(now())
  biens         Bien[]
  users         User[]
}

model Historique {
  id             String   @id @default(uuid())
  userId         String
  entiteId       String?
  action         String
  entite         String
  ancienneValeur String?
  nouvelleValeur String?
  date           DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
}

model Fournisseur {
  id           String        @id @default(uuid())
  nom          String
  email        String?
  telephone    String?
  adresse      String?
  type         String?
  contratDebut DateTime?
  contratFin   DateTime?
  createdAt    DateTime      @default(now())
  biens        Bien[]
  maintenances Maintenance[]
}

model Bien {
  id              String        @id @default(uuid())
  fournisseurId   String?
  departementId   String?
  codeInventaire  String        @unique
  nom             String
  description     String?
  type            String?
  categorie       String?
  numeroSerie     String?
  valeurAchat     Float?
  dateAcquisition DateTime?
  dateMiseService DateTime?
  etat            String?
  localisation    String?
  garantieFin     DateTime?
  qrCode          String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
  affectations    Affectation[]
  departement     Departement?  @relation(fields: [departementId], references: [id])
  fournisseur     Fournisseur?  @relation(fields: [fournisseurId], references: [id])
  maintenances    Maintenance[]
}

model Maintenance {
  id                   String       @id @default(uuid())
  bienId               String
  technicienId         String?
  fournisseurId        String?
  type                 String?
  description          String?
  dateDebut            DateTime?
  dateFin              DateTime?
  cout                 Float?
  statut               String?
  prochaineMaintenance DateTime?
  createdAt            DateTime     @default(now())
  bien                 Bien         @relation(fields: [bienId], references: [id])
  fournisseur          Fournisseur? @relation(fields: [fournisseurId], references: [id])
}

model Affectation {
  id                  String    @id @default(uuid())
  bienId              String
  userId              String
  validateurId        String?
  dateAffectation     DateTime
  datePrevisionRetour DateTime?
  dateRetour          DateTime?
  statut              String?
  commentaire         String?
  createdAt           DateTime  @default(now())
  bien                Bien      @relation(fields: [bienId], references: [id])
  user                User      @relation(fields: [userId], references: [id])
}

enum Role {
  ADMIN
  USER
}
