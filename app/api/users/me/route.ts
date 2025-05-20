import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwtToken } from "@/lib/jwt";

// Cache des utilisateurs par ID
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET(req: NextRequest) {
  try {
    // Headers de cache pour la réponse
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Mise en cache pendant 60 secondes, accepte les réponses périmées pendant 5 minutes
    };

    // Récupérer le token d'autorisation
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401, headers }
      );
    }

    const token = authHeader.split(" ")[1];
    
    // Vérifier le token
    const { isValid, userId } = await verifyJwtToken(token);

    if (!isValid || !userId) {
      return NextResponse.json(
        { error: "Token invalide" },
        { status: 401, headers }
      );
    }

    // Vérifier si l'utilisateur est dans le cache
    const now = Date.now();
    const cachedUser = userCache.get(userId);
    
    if (cachedUser && (now - cachedUser.timestamp < CACHE_DURATION)) {
      return NextResponse.json(cachedUser.data, { headers });
    }

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404, headers }
      );
    }

    // Mettre en cache les informations de l'utilisateur
    userCache.set(userId, { 
      data: user, 
      timestamp: now 
    });
    
    // Nettoyer le cache périodiquement
    if (userCache.size > 100) { // Si le cache contient plus de 100 utilisateurs
      for (const [cachedUserId, cachedValue] of userCache.entries()) {
        if (now - cachedValue.timestamp > CACHE_DURATION * 2) {
          userCache.delete(cachedUserId);
        }
      }
    }

    // Renvoyer les informations de l'utilisateur
    return NextResponse.json(user, { headers });
  } catch (error) {
    console.error("Erreur lors de la récupération des informations utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}