import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    message: "Déconnexion réussie",
  });

  response.cookies.set("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}