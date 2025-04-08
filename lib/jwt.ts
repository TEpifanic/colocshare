import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const TOKEN_EXPIRY = "7d"; // Durée de vie maximale du token: 7 jours
const INACTIVITY_EXPIRY = 24 * 60 * 60; // Durée d'inactivité tolérée: 24 heures (en secondes)

// Générer un token JWT avec timestamp d'activité
export async function signJwtToken(userId: string) {
  const lastActivity = Math.floor(Date.now() / 1000); // Timestamp actuel en secondes
  
  const token = await new SignJWT({ 
    sub: userId,
    lastActivity: lastActivity
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

// Vérifier un token JWT et l'inactivité
export async function verifyJwtToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const lastActivity = payload.lastActivity as number;
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Vérifier si le délai d'inactivité est dépassé
    if (lastActivity && (currentTime - lastActivity) > INACTIVITY_EXPIRY) {
      return { isValid: false, userId: null, isExpiredByInactivity: true };
    }
    
    return { isValid: true, userId: payload.sub as string };
  } catch (error) {
    return { isValid: false, userId: null };
  }
}

// Rafraîchir le timestamp d'activité dans le token
export async function refreshActivityToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.sub as string;
    
    // Générer un nouveau token avec un timestamp d'activité frais
    return await signJwtToken(userId);
  } catch (error) {
    return null;
  }
} 