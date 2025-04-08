import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
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

    // Récupérer l'invitation
    const invitation = await prisma.invitation.findUnique({
      where: {
        token: params.token
      },
      include: {
        colocation: true
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation n'a pas expiré
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Cette invitation a expiré' },
        { status: 400 }
      );
    }

    // Vérifier que l'email de l'invitation correspond à l'utilisateur connecté
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user || user.email !== invitation.email) {
      return NextResponse.json(
        { error: 'Cette invitation ne vous est pas destinée' },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur n'est pas déjà membre de la colocation
    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: userId,
        colocationId: invitation.colocationId,
        leftAt: null
      }
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Vous êtes déjà membre de cette colocation' },
        { status: 400 }
      );
    }

    // Créer l'adhésion à la colocation
    const membership = await prisma.membership.create({
      data: {
        userId: userId,
        colocationId: invitation.colocationId,
        role: 'MEMBER',
        joinedAt: new Date()
      },
      include: {
        colocation: true
      }
    });

    // Supprimer l'invitation
    await prisma.invitation.delete({
      where: {
        id: invitation.id
      }
    });

    return NextResponse.json({
      message: 'Vous avez rejoint la colocation avec succès',
      colocation: membership.colocation
    });
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de l\'invitation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 