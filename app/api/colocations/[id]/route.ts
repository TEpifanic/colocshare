import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

export async function GET(
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

    // Vérifier que l'utilisateur est membre de la colocation
    const membership = await prisma.membership.findFirst({
      where: {
        userId: userId,
        colocationId: params.id,
        leftAt: null // Membres actifs uniquement
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Accès non autorisé à cette colocation' },
        { status: 403 }
      );
    }

    // Récupérer les détails de la colocation
    const colocation = await prisma.colocation.findUnique({
      where: {
        id: params.id
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
                avatar: true // Utiliser avatar au lieu de image
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
        { error: 'Colocation non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json(colocation);
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