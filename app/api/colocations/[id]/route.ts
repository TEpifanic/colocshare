import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

// Cache des colocations par ID
const colocationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Headers de cache pour la réponse
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    };

    // Attendre et extraire l'ID de la colocation
    const colocationId = params.id;

    // Vérification de l'authentification via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401, headers }
      );
    }

    const token = authHeader.split(" ")[1];
    const { isValid, userId } = await verifyJwtToken(token);

    if (!isValid || !userId) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401, headers }
      );
    }

    // Vérifier si les données sont en cache
    const cacheKey = `${colocationId}_${userId}`;
    const now = Date.now();
    const cachedData = colocationCache.get(cacheKey);
    
    if (cachedData && (now - cachedData.timestamp < CACHE_DURATION)) {
      return NextResponse.json(cachedData.data, { headers });
    }

    // Optimisation: récupérer la colocation et vérifier les droits d'accès en une seule requête
    const colocation = await prisma.colocation.findFirst({
      where: {
        id: colocationId,
        memberships: {
          some: {
            userId: userId,
            leftAt: null
          }
        }
      },
      include: {
        memberships: {
          where: {
            leftAt: null // Membres actifs uniquement
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        invitations: {
          where: {
            expiresAt: {
              gt: new Date()
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!colocation) {
      return NextResponse.json(
        { error: 'Colocation non trouvée ou accès non autorisé' },
        { status: 404, headers }
      );
    }

    // Mettre en cache le résultat
    colocationCache.set(cacheKey, {
      data: colocation,
      timestamp: now
    });

    // Nettoyer le cache périodiquement
    if (colocationCache.size > 100) {
      for (const [key, value] of colocationCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          colocationCache.delete(key);
        }
      }
    }

    return NextResponse.json(colocation, { headers });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la colocation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const { isValid, userId } = await verifyJwtToken(token);

    if (!isValid || !userId) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est propriétaire de la colocation
    const membership = await prisma.membership.findFirst({
      where: {
        userId: userId,
        colocationId: params.id,
        role: 'OWNER',
        leftAt: null // Membres actifs uniquement
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut supprimer la colocation' },
        { status: 403 }
      );
    }

    // Supprimer la colocation
    await prisma.colocation.delete({
      where: {
        id: params.id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Erreur lors de la suppression de la colocation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 