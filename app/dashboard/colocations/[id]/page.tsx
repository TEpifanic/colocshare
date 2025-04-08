"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface Member {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

interface ColocationDetails {
  id: string;
  name: string;
  address?: string;
  description?: string;
  createdAt: string;
  memberships: Member[];
  invitations: Invitation[];
}

export default function ColocationDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [colocation, setColocation] = useState<ColocationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<"OWNER" | "ADMIN" | "MEMBER" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchColocationDetails();
  }, [params.id]);

  // Mettre à jour explicitement currentUserRole quand colocation change
  useEffect(() => {
    if (colocation && user) {
      console.log("useEffect for role update - User:", user);
      
      // Trouver le rôle de l'utilisateur courant dans les membres
      const currentUser = colocation.memberships.find(
        (m) => m.user.id === user.id
      );
      
      if (currentUser) {
        console.log(`useEffect: Setting role to ${currentUser.role}`);
        setCurrentUserRole(currentUser.role);
      } else {
        console.log("useEffect: No matching user found");
        setCurrentUserRole(null);
      }
    }
  }, [colocation, user]);

  const fetchColocationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const response = await fetch(`/api/colocations/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token expiré ou invalide
        localStorage.removeItem("auth_token");
        router.push("/auth/signin?session_expired=true");
        return;
      }

      if (response.status === 403) {
        setError("Vous n'êtes pas autorisé à accéder à cette colocation");
        return;
      }

      if (response.status === 404) {
        setError("Colocation non trouvée");
        return;
      }

      if (!response.ok) {
        throw new Error("Échec de récupération des détails de la colocation");
      }

      const data = await response.json();
      setColocation(data);
      
      // Trouver le rôle de l'utilisateur courant
      const userId = localStorage.getItem("user_id");
      console.log("User ID stored in localStorage:", userId);
      console.log("Memberships:", JSON.stringify(data.memberships, null, 2));
      
      // Comparer les valeurs exactes pour faciliter le débogage
      data.memberships.forEach((m: Member) => {
        console.log(`Comparing member ID: ${m.user.id} with localStorage ID: ${userId}`);
        console.log(`Match?: ${m.user.id === userId}`);
        console.log(`Member role: ${m.role}`);
      });
      
      const currentUser = data.memberships.find(
        (m: Member) => m.user.id === userId
      );
      
      console.log("Current user membership:", currentUser);
      if (currentUser) {
        console.log(`Setting role to: ${currentUser.role}`);
        setCurrentUserRole(currentUser.role);
      } else {
        console.log("No matching user found, role set to null");
        setCurrentUserRole(null);
      }
      console.log("Final detected role:", currentUserRole);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails:", error);
      setError("Impossible de charger les détails de la colocation");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const response = await fetch(`/api/colocations/${params.id}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré ou invalide
          localStorage.removeItem("auth_token");
          router.push("/auth/signin?session_expired=true");
          return;
        }
        
        throw new Error(data.error || "Échec de l'invitation");
      }

      // Rafraîchir les détails
      await fetchColocationDetails();
      
      // Réinitialiser le formulaire et fermer le modal
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (error) {
      console.error("Erreur lors de l'invitation:", error);
      setError(error instanceof Error ? error.message : "Impossible d'envoyer l'invitation");
      alert(error instanceof Error ? error.message : "Impossible d'envoyer l'invitation");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir retirer ce membre ?")) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const response = await fetch(`/api/colocations/${params.id}/members/${memberId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Échec de la suppression du membre");
      }

      // Rafraîchir les détails
      await fetchColocationDetails();
    } catch (error) {
      console.error("Erreur lors de la suppression du membre:", error);
      setError("Impossible de retirer le membre");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const response = await fetch(`/api/colocations/${params.id}/invitations/${invitationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Échec de l'annulation de l'invitation");
      }

      // Rafraîchir les détails
      await fetchColocationDetails();
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'invitation:", error);
      setError("Impossible d'annuler l'invitation");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
        <p className="text-indigo-600 font-medium">Chargement...</p>
      </div>
    );
  }

  if (error || !colocation) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-red-600">{error || "Colocation non trouvée"}</p>
          <button
            onClick={() => router.push("/dashboard/colocations")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retour aux colocations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-xl p-6">
          {/* En-tête */}
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-indigo-800">{colocation.name}</h1>
              {colocation.address && (
                <p className="text-gray-600 mt-1">{colocation.address}</p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const userId = localStorage.getItem("user_id");
                  const authContext = user ? `Context Auth User: ${JSON.stringify(user)}` : "Context Auth User: null";
                  alert(`Debug Info:\n\nLocal Storage User ID: ${userId}\nRole détecté: ${currentUserRole}\n\n${authContext}`);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Debug
              </button>
              <button
                onClick={() => router.push("/dashboard/colocations")}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Retour
              </button>
            </div>
          </div>

          {/* Description */}
          {colocation.description && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-indigo-800 mb-2">Description</h2>
              <p className="text-gray-600">{colocation.description}</p>
            </div>
          )}

          {/* Membres */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-indigo-800">Membres</h2>
              {(currentUserRole === "OWNER" || currentUserRole === "ADMIN") && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Inviter un membre
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {colocation.memberships.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {member.user.avatar ? (
                      <img
                        src={member.user.avatar}
                        alt={member.user.name || ""}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-medium">
                          {(member.user.name || member.user.email)[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                      </p>
                    </div>
                  </div>
                  
                  {(currentUserRole === "OWNER" || 
                    (currentUserRole === "ADMIN" && member.role !== "OWNER")) && 
                    member.user.id !== localStorage.getItem("user_id") && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invitations en attente */}
          {(currentUserRole === "OWNER" || currentUserRole === "ADMIN") && 
           colocation.invitations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-indigo-800 mb-4">Invitations en attente</h2>
              <div className="space-y-3">
                {colocation.invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{invitation.email}</p>
                      <p className="text-sm text-gray-500">
                        Invité le {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Annuler
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-indigo-800 mb-4">Inviter un nouveau membre</h2>
            
            <form onSubmit={handleInviteMember}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Inviter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 