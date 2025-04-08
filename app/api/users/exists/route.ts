import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Schéma de validation pour la vérification d'email
const checkEmailSchema = z.object({
  email: z.string().email("Email invalide"),
});

export async function POST(req: NextRequest) {
  try {
    // Validation des données d'entrée
    const body = await req.json();
    const validationResult = checkEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // Renvoyer si l'utilisateur existe ou non
    return NextResponse.json(
      { exists: !!existingUser },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la vérification de l'email:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
} 