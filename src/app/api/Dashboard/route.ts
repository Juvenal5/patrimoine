// import { prisma } from "@/lib/prisma"
// import { NextResponse } from "next/server"

// export async function GET() {

//  const users = await prisma.user.count()

//  const departements = await prisma.departement.count()

//  const biens = await prisma.bien.count()

//  const fournisseurs = await prisma.fournisseur.count()

//  const maintenances = await prisma.maintenance.count()

//  const affectations = await prisma.affectation.count()

//  const nouveauxUsers = await prisma.user.findMany({
//   orderBy:{createdAt:"desc"},
//   take:5
//  })

//  return NextResponse.json({
//   users,
//   departements,
//   biens,
//   fournisseurs,
//   maintenances,
//   affectations,
//   nouveauxUsers
//  })
// }