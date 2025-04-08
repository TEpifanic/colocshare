import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string, invitationId: string } }
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

    // Vérifier que l'utilisateur est admin ou propriétaire de la colocation
    const membership = await prisma.membership.findFirst({
      where: {
        userId: userId,
        colocationId: params.id,
        leftAt: null,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent gérer les invitations' },
        { status: 403 }
      );
    }

    // Vérifier que l'invitation existe et appartient à la colocation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: params.invitationId,
        colocationId: params.id
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer l'invitation
    await prisma.invitation.delete({
      where: {
        id: params.invitationId
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'invitation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 