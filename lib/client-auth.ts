"use client";

import { useRouter } from "next/navigation";

// Temps d'inactivité avant de rafraîchir le token (en millisecondes) - 15 minutes
const REFRESH_ACTIVITY_INTERVAL = 15 * 60 * 1000;

// Stocker le token dans le localStorage et dans un cookie
export function setAuthToken(token: string, userId?: string) {
  // Stocker dans localStorage (pour un accès facile côté client)
  localStorage.setItem("auth_token", token);
  
  // Stocker l'ID utilisateur s'il est fourni
  if (userId) {
    localStorage.setItem("user_id", userId);
  }
  
  // Stocker dans un cookie (pour que le middleware puisse y accéder)
  document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Strict`; // 7 jours
  
  // Stocker le timestamp de la dernière activité
  localStorage.setItem("last_activity", Date.now().toString());
}

// Récupérer le token depuis le localStorage
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

// Vérifier si l'utilisateur est connecté
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// Déconnecter l'utilisateur
export function logout() {
  // Supprimer du localStorage
  localStorage.removeItem("auth_token");
  localStorage.removeItem("last_activity");
  localStorage.removeItem("user_id");
  
  // Supprimer le cookie
  document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
}

// Vérifier et rafraîchir le token si nécessaire
export async function checkAndRefreshToken(): Promise<boolean> {
  try {
    const token = getAuthToken();
    if (!token) return false;
    
    const lastActivity = localStorage.getItem("last_activity");
    const now = Date.now();
    
    // Si la dernière activité est trop ancienne, rafraîchir le token
    if (!lastActivity || (now - parseInt(lastActivity)) > REFRESH_ACTIVITY_INTERVAL) {
      const response = await fetch("/api/auth/refresh-token", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        // Si le token est invalide ou expiré, déconnecter l'utilisateur
        logout();
        return false;
      }
      
      const data = await response.json();
      if (data.token) {
        // Mettre à jour le token et le timestamp d'activité
        setAuthToken(data.token);
        return true;
      }
    } else {
      // Si l'activité est récente, mettre à jour seulement le timestamp
      localStorage.setItem("last_activity", now.toString());
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error);
    return false;
  }
}

// Hook pour la déconnexion et redirection
export function useLogout() {
  const router = useRouter();
  
  return () => {
    logout();
    router.push("/auth/signin");
  };
}

// Fonction pour configurer la vérification périodique de session
export function setupSessionCheck() {
  if (typeof window !== "undefined") {
    // Vérifier la session au chargement de la page
    checkAndRefreshToken();
    
    // Vérifier périodiquement la session
    const intervalId = setInterval(() => {
      checkAndRefreshToken();
    }, 15 * 60 * 1000); // Vérifier toutes les 15 minutes
    
    // Ajouter des écouteurs d'événements pour l'activité
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const updateActivity = () => {
      localStorage.setItem("last_activity", Date.now().toString());
    };
    
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity);
    });
    
    // Nettoyer les écouteurs et intervalles
    return () => {
      clearInterval(intervalId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }
} 