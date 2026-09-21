-- CreateTable
CREATE TABLE "RapportGenere" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "departementId" TEXT,
    "categorie" TEXT,
    "statut" TEXT,
    "periodeDebut" TIMESTAMP(3),
    "periodeFin" TIMESTAMP(3),
    "contenu" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RapportGenere_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RapportGenere" ADD CONSTRAINT "RapportGenere_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
