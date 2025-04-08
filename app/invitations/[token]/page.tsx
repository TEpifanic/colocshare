"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInvitationPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    handleAcceptInvitation();
  }, [params.token]);

  const handleAcceptInvitation = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        // Rediriger vers la connexion en sauvegardant le token d'invitation
        localStorage.setItem("pending_invitation", params.token);
        router.push("/auth/signin");
        return;
      }

      const response = await fetch(`/api/invitations/${params.token}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      setSuccess(true);
      // Rediriger vers la colocation après 3 secondes
      setTimeout(() => {
        router.push(`/dashboard/colocations/${data.colocation.id}`);
      }, 3000);
    } catch (error) {
      console.error("Erreur lors de l'acceptation de l'invitation:", error);
      setError(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <p className="text-indigo-600 font-medium">Traitement de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard/colocations")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retour aux colocations
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Invitation acceptée !</h1>
          <p className="text-gray-600 mb-6">
            Vous avez rejoint la colocation avec succès. Vous allez être redirigé...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return null;
} 