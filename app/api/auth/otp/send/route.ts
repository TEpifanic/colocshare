import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Schéma de validation pour l'envoi d'OTP
const sendOtpSchema = z.object({
  email: z.string().email("Email invalide"),
  type: z.enum(["LOGIN", "SIGNUP", "RESET_PASSWORD"]).default("LOGIN"),
});

export async function POST(req: NextRequest) {
  try {
    // Validation des données d'entrée
    const body = await req.json();
    const validationResult = sendOtpSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { email, type } = validationResult.data;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    // Pour la connexion, l'utilisateur doit exister
    if (type === "LOGIN" && !existingUser) {
      return NextResponse.json(
        { error: "Aucun compte trouvé avec cet email" },
        { status: 400 }
      );
    }

    // Pour l'inscription, l'utilisateur ne doit pas exister
    if (type === "SIGNUP" && existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Si nous arrivons ici, nous pouvons envoyer l'OTP
    try {
      console.log(`Envoi OTP à ${email} pour ${type}...`);
      
      // Génération du code OTP et enregistrement dans la BDD
      try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 10); // 10 minutes de validité
        
        console.log(`Code généré: ${code}, expire à ${expires}`);
        
        // Supprimer les anciens OTP pour cet email et ce type
        await prisma.otpToken.deleteMany({
          where: {
            email,
            type,
          },
        });
        
        // Sauvegarder le nouveau code OTP
        const savedOtp = await prisma.otpToken.create({
          data: {
            email,
            code,
            type,
            expires,
          },
        });
        
        console.log(`OTP enregistré en BDD avec ID: ${savedOtp.id}`);
        
        // Import dynamique de sendgrid pour éviter les erreurs
        const sgMail = await import('@sendgrid/mail');
        
        // Initialiser SendGrid avec l'API key
        if (process.env.SENDGRID_API_KEY) {
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
          console.log('SendGrid API key configurée');
        } else {
          console.error('SendGrid API key manquante');
          throw new Error('Configuration SendGrid manquante');
        }
        
        // Vérifier l'adresse d'expéditeur
        const fromEmail = process.env.SENDGRID_FROM_EMAIL;
        if (!fromEmail) {
          console.error('Adresse d\'expéditeur manquante');
          throw new Error('Configuration de l\'expéditeur manquante');
        }
        
        // Préparer l'email
        const msg = {
          to: email,
          from: fromEmail,
          subject: 'Votre code de vérification - ColocShare',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #4F46E5;">Votre code de vérification</h1>
              <p>Voici votre code de vérification pour ColocShare :</p>
              <div style="background-color: #F3F4F6; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.5em; color: #4F46E5;">${code}</span>
              </div>
              <p>Ce code est valable pendant 10 minutes.</p>
              <p style="color: #666;">Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.</p>
            </div>
          `,
        };
        
        console.log(`Tentative d'envoi d'email à ${email}`);
        
        // Envoyer l'email
        await sgMail.default.send(msg);
        console.log('Email envoyé avec succès');
        
        return NextResponse.json(
          { success: true, message: "Code de vérification envoyé" },
          { status: 200 }
        );
      } catch (dbError: any) {
        console.error("Erreur lors de la gestion OTP:", dbError);
        return NextResponse.json(
          { error: "Erreur serveur lors de la création du code", details: dbError?.message || String(dbError) },
          { status: 500 }
        );
      }
    } catch (emailError: any) {
      console.error("Erreur lors de l'envoi de l'email:", emailError);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email", details: emailError?.message || String(emailError) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Erreur globale:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error?.message || String(error) },
      { status: 500 }
    );
  }
} 