import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyJwtToken } from '@/lib/jwt';

// Cache des dépenses par colocation
const expensesCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

// Schéma de validation pour la création d'une dépense
const createExpenseSchema = z.object({
  title: z.string().min(2, "Le titre doit contenir au moins 2 caractères").max(100, "Le titre ne peut pas dépasser 100 caractères"),
  amount: z.number().positive("Le montant doit être positif"),
  description: z.string().optional(),
  category: z.enum(["RENT", "UTILITIES", "GROCERIES", "HOUSEHOLD", "ENTERTAINMENT", "OTHER"]).default("OTHER"),
  participants: z.array(z.string()).min(1, "Au moins un participant est requis"),
  shares: z.array(z.object({
    userId: z.string(),
    amount: z.number().positive("Le montant doit être positif")
  })).optional(),
  isEqualSplit: z.boolean().default(true), // Si true, le montant est divisé également entre tous les participants
});

// GET /api/colocations/[id]/expenses - Récupérer toutes les dépenses d'une colocation
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
    const cachedData = expensesCache.get(cacheKey);
    
    if (cachedData && (now - cachedData.timestamp < CACHE_DURATION)) {
      return NextResponse.json(cachedData.data, { headers });
    }

    // Vérifier si l'utilisateur est membre de la colocation
    // Optimisation: requête unique pour vérifier l'appartenance à la colocation
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        colocationId,
        leftAt: null
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas membre de cette colocation' },
        { status: 403, headers }
      );
    }

    // Récupérer toutes les dépenses de la colocation avec leurs détails
    // Optimisation: récupérer tout en une seule grande requête pour éviter les requêtes multiples
    const [expenses, allShares, memberIds] = await Promise.all([
      // 1. Récupérer les dépenses
      prisma.expense.findMany({
        where: {
          colocationId
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          participants: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          shares: {
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
          }
        },
        orderBy: {
          date: 'desc'
        }
      }),
      
      // 2. Récupérer les parts de dépenses
      prisma.expenseShare.findMany({
        where: {
          expense: {
            colocationId,
            isSettled: false
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      
      // 3. Récupérer les IDs des membres
      prisma.membership.findMany({
        where: {
          colocationId,
          leftAt: null
        },
        select: {
          userId: true
        }
      }).then(members => members.map(m => m.userId))
    ]);
    
    // Calculer le bilan pour chaque utilisateur
    // On filtre les parts pour chaque utilisateur
    const balanceByUser = memberIds.reduce((acc, userId) => {
      const userShares = allShares.filter(share => share.userId === userId);
      
      // Si l'utilisateur n'a pas de parts, on peut le sauter
      if (userShares.length === 0) return acc;
      
      const totalToPay = userShares.reduce((sum, share) => sum + share.amount, 0);
      
      acc[userId] = {
        userId,
        userName: userShares[0]?.user.name || 'Utilisateur inconnu',
        userEmail: userShares[0]?.user.email || '',
        totalToPay,
        isPaid: userShares.every(share => share.isPaid)
      };
      
      return acc;
    }, {} as Record<string, { userId: string, userName: string, userEmail: string, totalToPay: number, isPaid: boolean }>);
    
    // Résultat final
    const result = { 
      expenses,
      balanceByUser: Object.values(balanceByUser)
    };

    // Mettre en cache le résultat
    expensesCache.set(cacheKey, {
      data: result,
      timestamp: now
    });

    // Nettoyer le cache périodiquement
    if (expensesCache.size > 100) {
      for (const [key, value] of expensesCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          expensesCache.delete(key);
        }
      }
    }
    
    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/colocations/[id]/expenses - Créer une nouvelle dépense
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

    // Vérifier si l'utilisateur est membre de la colocation
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

    // Validation des données d'entrée
    const body = await req.json();
    const validationResult = createExpenseSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    
    // Vérifier que tous les participants existent et sont membres de la colocation
    const participants = await prisma.membership.findMany({
      where: {
        colocationId: params.id,
        userId: {
          in: data.participants
        },
        leftAt: null
      }
    });

    if (participants.length !== data.participants.length) {
      return NextResponse.json(
        { error: 'Certains participants n\'existent pas ou ne sont pas membres de cette colocation' },
        { status: 400 }
      );
    }

    // Création de la transaction Prisma pour assurer la cohérence des données
    const expense = await prisma.$transaction(async (tx) => {
      // Créer la dépense
      const newExpense = await tx.expense.create({
        data: {
          title: data.title,
          amount: data.amount,
          description: data.description,
          category: data.category,
          creatorId: userId,
          colocationId: params.id,
          participants: {
            connect: data.participants.map(id => ({ id }))
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          participants: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      });

      // Créer les parts pour chaque participant
      if (data.isEqualSplit) {
        // Répartition égale
        const shareAmount = data.amount / data.participants.length;
        
        await Promise.all(data.participants.map(participantId => 
          tx.expenseShare.create({
            data: {
              amount: shareAmount,
              userId: participantId,
              expenseId: newExpense.id,
              isPaid: participantId === userId // Le créateur a déjà payé sa part
            }
          })
        ));
      } else if (data.shares && data.shares.length > 0) {
        // Répartition personnalisée
        const totalShares = data.shares.reduce((sum, share) => sum + share.amount, 0);
        
        if (Math.abs(totalShares - data.amount) > 0.01) {
          throw new Error("La somme des parts ne correspond pas au montant total");
        }
        
        await Promise.all(data.shares.map(share => 
          tx.expenseShare.create({
            data: {
              amount: share.amount,
              userId: share.userId,
              expenseId: newExpense.id,
              isPaid: share.userId === userId // Le créateur a déjà payé sa part
            }
          })
        ));
      }

      return newExpense;
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Erreur serveur' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 