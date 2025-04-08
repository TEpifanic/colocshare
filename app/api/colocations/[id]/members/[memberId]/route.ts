import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string, memberId: string } }
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

    // Vérifier que l'utilisateur actuel est admin ou propriétaire
    const currentUserMembership = await prisma.membership.findFirst({
      where: {
        userId: userId,
        colocationId: params.id,
        leftAt: null,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    });

    if (!currentUserMembership) {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent gérer les membres' },
        { status: 403 }
      );
    }

    // Récupérer l'adhésion à supprimer
    const membershipToRemove = await prisma.membership.findUnique({
      where: {
        id: params.memberId
      },
      include: {
        user: true
      }
    });

    if (!membershipToRemove) {
      return NextResponse.json(
        { error: 'Membre non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le membre appartient à la colocation
    if (membershipToRemove.colocationId !== params.id) {
      return NextResponse.json(
        { error: 'Ce membre n\'appartient pas à cette colocation' },
        { status: 400 }
      );
    }

    // Vérifier les permissions
    if (currentUserMembership.role === 'ADMIN' && membershipToRemove.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Un administrateur ne peut pas retirer le propriétaire' },
        { status: 403 }
      );
    }

    // Ne pas permettre au propriétaire de se retirer lui-même (il doit transférer la propriété d'abord)
    if (currentUserMembership.role === 'OWNER' && membershipToRemove.userId === userId && 
        membershipToRemove.role === 'OWNER') {
      // Vérifier s'il est le seul propriétaire
      const ownersCount = await prisma.membership.count({
        where: {
          colocationId: params.id,
          role: 'OWNER',
          leftAt: null
        }
      });
      
      if (ownersCount <= 1) {
        return NextResponse.json(
          { error: 'Vous devez transférer la propriété avant de quitter la colocation' },
          { status: 400 }
        );
      }
    }

    // Marquer l'adhésion comme inactive plutôt que de la supprimer
    await prisma.membership.update({
      where: {
        id: params.memberId
      },
      data: {
        leftAt: new Date()
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Erreur lors de la suppression du membre:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 