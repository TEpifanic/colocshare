import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOTP } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { signJwtToken } from "@/lib/jwt";

// Schéma de validation pour la vérification d'OTP
const verifyOtpSchema = z.object({
  email: z.string().email("Email invalide"),
  code: z.string().length(6, "Le code doit comporter 6 chiffres"),
  type: z.enum(["LOGIN", "SIGNUP", "RESET_PASSWORD"]).default("LOGIN"),
});

export async function POST(req: NextRequest) {
  try {
    // Validation des données d'entrée
    const body = await req.json();
    const validationResult = verifyOtpSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { email, code, type } = validationResult.data;

    // Vérifier l'OTP
    const isValid = await verifyOTP(email, code, type);

    if (!isValid) {
      return NextResponse.json(
        { error: "Code invalide ou expiré" },
        { status: 400 }
      );
    }

    // Actions différentes selon le type d'OTP
    if (type === "SIGNUP") {
      // Pour l'inscription, créer un nouvel utilisateur s'il n'existe pas
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Cet email est déjà enregistré", redirectTo: "/auth/signin" },
          { status: 400 }
        );
      }

      // Créer le nouvel utilisateur
      const newUser = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
        }
      });

      // Générer un token JWT pour l'authentification
      const token = await signJwtToken(newUser.id);

      return NextResponse.json({
        success: true,
        message: "Inscription réussie",
        user: { id: newUser.id, email: newUser.email },
        token,
        redirectTo: "/dashboard"
      });
    } else if (type === "LOGIN") {
      // Pour la connexion, vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return NextResponse.json({ 
          error: "Utilisateur non trouvé", 
          redirectTo: "/auth/signup" 
        }, { status: 404 });
      }

      // Mettre à jour la date de vérification de l'email
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      });

      // Générer un token JWT pour l'authentification
      const token = await signJwtToken(user.id);

      return NextResponse.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        },
        redirectTo: "/dashboard"
      });
    }

    // Cas pour RESET_PASSWORD (à implémenter si nécessaire)
    return NextResponse.json({
      success: true,
      message: "Vérification réussie"
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du code OTP:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
} 