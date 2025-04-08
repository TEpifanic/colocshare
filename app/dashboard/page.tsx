"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogout, setupSessionCheck } from "@/lib/client-auth";

export default function Dashboard() {
  const router = useRouter();
  const logout = useLogout();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configurer la vérification de session
    const cleanup = setupSessionCheck();
    
    // Fonction pour récupérer les infos de l'utilisateur
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          router.push("/auth/signin");
          return;
        }

        // Ici, vous pourriez faire un appel API pour récupérer les infos utilisateur
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
        // Si erreur, on redirige vers la connexion
        router.push("/auth/signin");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
    
    // Nettoyer la vérification de session lorsque le composant est démonté
    return () => {
      if (cleanup) cleanup();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-indigo-700 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-xl p-6">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-2xl font-bold text-indigo-800">Tableau de bord</h1>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm transition-colors"
            >
              Se déconnecter
            </button>
          </div>

          <div className="bg-indigo-100 p-5 rounded-lg border border-indigo-200 mb-8">
            <h2 className="text-xl font-semibold mb-2 text-indigo-800">Bienvenue sur Coloc Share!</h2>
            <p className="text-indigo-700">
              Vous êtes connecté en tant que <strong>{user?.email}</strong>
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="bg-white shadow-md rounded-lg p-6 border border-indigo-100 hover:border-indigo-300 transition-colors">
              <h3 className="text-lg font-semibold mb-2 text-indigo-800">Mes colocations</h3>
              <p className="text-indigo-600 mb-4">Gérez vos colocations, invitez des membres et organisez votre vie commune.</p>
              <button
                onClick={() => router.push('/dashboard/colocations')}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
              >
                Accéder aux colocations
              </button>
            </div>
            
            <div className="bg-white shadow-md rounded-lg p-6 border border-indigo-100">
              <h3 className="text-lg font-semibold mb-2 text-indigo-800">Mes dépenses</h3>
              <p className="text-indigo-600 mb-4">Fonctionnalité à venir : Suivez et partagez vos dépenses avec vos colocataires.</p>
              <button
                disabled
                className="w-full py-2 px-4 bg-gray-400 text-white rounded-md cursor-not-allowed"
              >
                Bientôt disponible
              </button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4 text-indigo-800">Autres fonctionnalités à venir</h3>
            <ul className="space-y-3 text-indigo-700">
              <li className="flex items-center">
                <span className="mr-2 text-indigo-500">•</span>
                <span>Planning des tâches ménagères</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-indigo-500">•</span>
                <span>Liste de courses partagée</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-indigo-500">•</span>
                <span>Discussions entre colocataires</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-indigo-500">•</span>
                <span>Calendrier partagé</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 