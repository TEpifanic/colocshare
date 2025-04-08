"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

// Types pour les données utilisateur
interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
}

// Interface pour le contexte d'authentification
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Valeur par défaut du contexte
const defaultContext: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
};

// Créer le contexte
const AuthContext = createContext<AuthContextType>(defaultContext);

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => useContext(AuthContext);

// Provider du contexte
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fonction pour stocker le token dans le localStorage et cookie
  const setAuthToken = (token: string) => {
    // Stocker dans localStorage (pour un accès facile côté client)
    localStorage.setItem("auth_token", token);
    
    // Stocker dans un cookie (pour que le middleware puisse y accéder)
    document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Strict`; // 7 jours
    
    // Stocker le timestamp de la dernière activité
    localStorage.setItem("last_activity", Date.now().toString());
  };

  // Fonction pour récupérer les infos de l'utilisateur connecté
  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Échec de récupération des informations utilisateur");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Erreur lors de la récupération des informations utilisateur:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de connexion
  const login = (token: string, userData: User) => {
    setAuthToken(token);
    setUser(userData);
  };

  // Fonction de déconnexion
  const logout = () => {
    // Supprimer du localStorage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("last_activity");
    localStorage.removeItem("user_id"); // Pour compatibilité avec le code existant

    // Supprimer le cookie
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
    
    // Réinitialiser l'état
    setUser(null);
    
    // Rediriger vers la page de connexion
    router.push("/auth/signin");
  };

  // Vérifier l'authentification au chargement initial
  useEffect(() => {
    refreshUser();
  }, []);

  // Valeur du contexte
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 