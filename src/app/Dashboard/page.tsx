// "use client"

// import { useEffect, useState } from "react"
// import Link from "next/link"
// import {
//  Users,
//  Building,
//  Package,
//  Wrench,
//  Truck,
//  ClipboardList
// } from "lucide-react"

// type DashboardData = {
//  users:number
//  departements:number
//  biens:number
//  fournisseurs:number
//  maintenances:number
//  affectations:number
//  nouveauxUsers:any[]
// }

// export default function Dashboard(){

//  const [data,setData] = useState<DashboardData | null>(null)
//  const [loading,setLoading] = useState(true)

//  useEffect(()=>{

//   const fetchData = async () => {

//    const res = await fetch("/api/Dashboard")
//    const result = await res.json()

//    setData(result)
//    setLoading(false)
//   }

//   fetchData()

//  },[])

//  if(loading){

//   return(
//    <div className="flex items-center justify-center h-screen">
//     <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600"></div>
//    </div>
//   )
//  }

//  return(

//   <div className="p-10 space-y-10 bg-gray-50 min-h-screen">

//    {/* HEADER */}

//    <div className="flex justify-between items-center">

//     <div>
//      <h1 className="text-3xl font-bold text-gray-800">
//       Dashboard Administrateur
//      </h1>

//      <p className="text-gray-500">
//       Gestion du patrimoine de l entreprise
//      </p>
//     </div>

//    </div>

//    {/* STATISTIQUES */}

//    <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">

//     <StatCard
//      title="Utilisateurs"
//      value={data!.users}
//      icon={<Users size={28}/>}
//      link="/dashboard/utilisateurs"
//      color="from-blue-500 to-blue-700"
//     />

//     <StatCard
//      title="Departements"
//      value={data!.departements}
//      icon={<Building size={28}/>}
//      link="/dashboard/departements"
//      color="from-purple-500 to-purple-700"
//     />

//     <StatCard
//      title="Biens"
//      value={data!.biens}
//      icon={<Package size={28}/>}
//      link="/dashboard/biens"
//      color="from-green-500 to-green-700"
//     />

//     <StatCard
//      title="Fournisseurs"
//      value={data!.fournisseurs}
//      icon={<Truck size={28}/>}
//      link="/dashboard/fournisseurs"
//      color="from-orange-500 to-orange-700"
//     />

//     <StatCard
//      title="Maintenance"
//      value={data!.maintenances}
//      icon={<Wrench size={28}/>}
//      link="/dashboard/maintenance"
//      color="from-red-500 to-red-700"
//     />

//     <StatCard
//      title="Affectations"
//      value={data!.affectations}
//      icon={<ClipboardList size={28}/>}
//      link="/dashboard/affectations"
//      color="from-indigo-500 to-indigo-700"
//     />

//    </div>


//    {/* NOUVEAUX UTILISATEURS */}

//    <div className="bg-white shadow-md rounded-xl p-6">

//     <h2 className="text-xl font-semibold text-gray-700 mb-5">
//      Nouveaux utilisateurs
//     </h2>

//     <div className="overflow-x-auto">

//      <table className="w-full text-left">

//       <thead className="bg-gray-100">

//        <tr>

//         <th className="p-3">Nom</th>
//         <th className="p-3">Email</th>
//         <th className="p-3">Role</th>
//         <th className="p-3">Date</th>

//        </tr>

//       </thead>

//       <tbody>

//        {data!.nouveauxUsers.map((u:any)=>(

//         <tr
//          key={u.id}
//          className="border-b hover:bg-gray-50 transition"
//         >

//          <td className="p-3 font-medium">
//           {u.nom} {u.prenom}
//          </td>

//          <td className="p-3 text-gray-600">
//           {u.email}
//          </td>

//          <td className="p-3">

//           <span className={`px-3 py-1 rounded-full text-sm
//            ${u.role === "ADMIN"
//             ? "bg-red-100 text-red-600"
//             : "bg-green-100 text-green-600"}
//           `}>

//            {u.role}

//           </span>

//          </td>

//          <td className="p-3 text-gray-500">

//           {new Date(u.createdAt).toLocaleDateString()}

//          </td>

//         </tr>

//        ))}

//       </tbody>

//      </table>

//     </div>

//    </div>

//   </div>
//  )
// }


// function StatCard({
//  title,
//  value,
//  icon,
//  link,
//  color
// }:{
//  title:string
//  value:number
//  icon:any
//  link:string
//  color:string
// }){

//  return(

//   <Link href={link}>

//    <div className={`bg-gradient-to-r ${color}
//    text-white p-6 rounded-xl shadow-lg
//    hover:scale-105 transition transform`}>

//     <div className="flex justify-between items-center">

//      <div>

//       <p className="text-sm opacity-90">
//        {title}
//       </p>

//       <h2 className="text-3xl font-bold mt-2">
//        {value}
//       </h2>

//      </div>

//      <div className="opacity-80">

//       {icon}

//      </div>

//     </div>

//    </div>

//   </Link>

//  )
// }