import { NextRequest, NextResponse } from "next/server";
import { refreshActivityToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    
    // Rafraîchir le token
    const newToken = await refreshActivityToken(token);
    
    if (!newToken) {
      return NextResponse.json(
        { error: "Impossible de rafraîchir le token" },
        { status: 400 }
      );
    }

    // Répondre avec le nouveau token
    return NextResponse.json({ token: newToken });
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
} 