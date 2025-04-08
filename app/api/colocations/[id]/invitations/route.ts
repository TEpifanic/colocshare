import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';
import { sendInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

// Schéma de validation pour l'invitation
const inviteSchema = z.object({
  email: z.string().email("Adresse email invalide")
});

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
        { error: 'Vous devez être membre de la colocation pour inviter d\'autres personnes' },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur a les droits d'invitation (OWNER ou ADMIN)
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les propriétaires et administrateurs peuvent inviter de nouveaux membres' },
        { status: 403 }
      );
    }

    // Validation des données d'entrée
    const body = await req.json();
    const validationResult = inviteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Vérifier si l'utilisateur est déjà membre
    const existingMembership = await prisma.membership.findFirst({
      where: {
        colocationId: params.id,
        user: {
          email
        },
        leftAt: null // Membres actifs uniquement
      }
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Cet utilisateur est déjà membre de la colocation' },
        { status: 400 }
      );
    }

    // Vérifier si une invitation active existe déjà
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        colocationId: params.id,
        email,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Une invitation a déjà été envoyée à cette adresse email' },
        { status: 400 }
      );
    }

    // Créer un token unique pour l'invitation
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // L'invitation expire dans 48 heures

    // Créer l'invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        token: inviteToken,
        status: 'PENDING',
        expiresAt,
        colocation: {
          connect: {
            id: params.id
          }
        },
        createdBy: {
          connect: {
            id: userId
          }
        }
      }
    });

    // Envoyer l'email d'invitation
    const colocation = await prisma.colocation.findUnique({
      where: { id: params.id },
      select: { name: true }
    });

    if (!colocation) {
      throw new Error('Colocation non trouvée');
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${inviteToken}`;
    await sendInvitationEmail(email, inviteUrl, colocation.name);

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'invitation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 