import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

// POST /api/colocations/[id]/expenses/reset - Remettre à zéro les compteurs de dépenses
export async function POST(
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

    // Vérifier si l'utilisateur est membre de la colocation et a les droits ADMIN ou OWNER
    const membership = await prisma.membership.findUnique({
      where: {
        userId_colocationId: {
          userId,
          colocationId: params.id
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas membre de cette colocation' },
        { status: 403 }
      );
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Vous n\'avez pas les droits pour effectuer cette action' },
        { status: 403 }
      );
    }

    // Mettre à jour toutes les dépenses non réglées en réglées
    await prisma.$transaction([
      prisma.expense.updateMany({
        where: {
          colocationId: params.id,
          isSettled: false
        },
        data: {
          isSettled: true
        }
      }),
      // Marquer toutes les parts de dépenses comme payées
      prisma.expenseShare.updateMany({
        where: {
          expense: {
            colocationId: params.id,
            isSettled: false
          },
          isPaid: false
        },
        data: {
          isPaid: true
        }
      })
    ]);

    return NextResponse.json({ 
      message: 'Les compteurs ont été remis à zéro avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la remise à zéro des compteurs:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 