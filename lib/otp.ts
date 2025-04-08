import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "./email";

// Type d'OTP (doit correspondre à l'enum dans le schéma Prisma)
type OtpType = 'LOGIN' | 'SIGNUP' | 'RESET_PASSWORD';

// Durée de validité des codes OTP en minutes
const OTP_EXPIRY_MINUTES = 10;

// Générer un code OTP numérique à 6 chiffres
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Créer un nouvel OTP et l'envoyer par email
export async function createAndSendOTP(email: string, type: OtpType = 'LOGIN'): Promise<void> {
  // Supprimer les anciens OTP pour cet email et ce type
  await prisma.otpToken.deleteMany({
    where: {
      email,
      type,
    },
  });

  // Générer un nouveau code
  const code = generateOTP();
  
  // Calculer la date d'expiration
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + OTP_EXPIRY_MINUTES);

  // Sauvegarder le code en base de données
  await prisma.otpToken.create({
    data: {
      email,
      code,
      type,
      expires,
    },
  });

  // Envoyer le code par email
  await sendVerificationEmail(email, code);
}

// Vérifier si un code OTP est valide
export async function verifyOTP(email: string, code: string, type: OtpType = 'LOGIN'): Promise<boolean> {
  // Chercher le code OTP correspondant
  const otpToken = await prisma.otpToken.findFirst({
    where: {
      email,
      code,
      type,
      expires: {
        gte: new Date(),
      },
    },
  });

  if (!otpToken) {
    return false;
  }

  // Supprimer le code après utilisation
  await prisma.otpToken.delete({
    where: {
      id: otpToken.id,
    },
  });

  return true;
}

// Supprimer les OTP expirés
export async function cleanupExpiredOTPs(): Promise<void> {
  await prisma.otpToken.deleteMany({
    where: {
      expires: {
        lt: new Date(),
      },
    },
  });
} 