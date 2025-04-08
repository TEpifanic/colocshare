import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

// Schéma de validation pour la création d'une colocation
const createColocationSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(50, "Le nom ne peut pas dépasser 50 caractères"),
  address: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
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

    // Récupérer toutes les colocations de l'utilisateur
    const colocations = await prisma.colocation.findMany({
      where: {
        memberships: {
          some: {
            userId: userId,
            leftAt: null // Seulement les membres actifs
          }
        }
      },
      include: {
        memberships: {
          where: {
            leftAt: null
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ colocations });
  } catch (error) {
    console.error('Erreur lors de la récupération des colocations:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    // Validation des données d'entrée
    const body = await req.json();
    const validationResult = createColocationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Création de la colocation avec le créateur comme propriétaire
    const data = validationResult.data;
    const colocation = await prisma.colocation.create({
      data: {
        ...data,
        memberships: {
          create: {
            userId: userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        memberships: {
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
        }
      }
    });

    return NextResponse.json(colocation, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la colocation:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 