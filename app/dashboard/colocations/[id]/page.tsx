"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchColocationDetails, fetchColocationExpenses } from "@/lib/client-data";
import Link from "next/link";

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

interface Expense {
  id: string;
  title: string;
  amount: number;
  description: string | null;
  date: string;
  category: string;
  isSettled: boolean;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  shares: ExpenseShare[];
}

interface ExpenseShare {
  id: string;
  amount: number;
  isPaid: boolean;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface UserBalance {
  userId: string;
  userName: string;
  userEmail: string;
  totalToPay: number;
  isPaid: boolean;
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
  const [showCreateExpenseModal, setShowCreateExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: 0,
    description: "",
    category: "OTHER",
    isEqualSplit: true,
    participants: [] as string[],
    shares: [] as { userId: string, amount: number }[]
  });

  useEffect(() => {
    fetchColocationDetailsData();
  }, [params.id]);

  // Mettre à jour explicitement currentUserRole quand colocation change
  useEffect(() => {
    if (colocation && user) {
      // Trouver le rôle de l'utilisateur courant dans les membres
      const currentUser = colocation.memberships.find(
        (m) => m.user.id === user.id
      );
      
      if (currentUser) {
        setCurrentUserRole(currentUser.role);
      } else {
        setCurrentUserRole(null);
      }
    }
  }, [colocation, user]);

  const fetchColocationDetailsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      try {
        // Utiliser la fonction optimisée avec mise en cache
        const data = await fetchColocationDetails(token, params.id);
        setColocation(data);
        
        // Trouver le rôle de l'utilisateur courant
        if (user) {
          const currentUser = data.memberships.find(
            (m: Member) => m.user.id === user.id
          );
          
          if (currentUser) {
            setCurrentUserRole(currentUser.role);
          } else {
            setCurrentUserRole(null);
          }
        }
      } catch (error: any) {
        if (error.message === "Session expirée") {
          localStorage.removeItem("auth_token");
          router.push("/auth/signin?session_expired=true");
          return;
        } else if (error.message === "Accès non autorisé") {
          setError("Vous n'êtes pas autorisé à accéder à cette colocation");
          return;
        } else if (error.message === "Colocation non trouvée") {
          setError("Colocation non trouvée");
          return;
        }
        throw error;
      }
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
      await fetchColocationDetailsData();
      
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
      await fetchColocationDetailsData();
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
      await fetchColocationDetailsData();
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'invitation:", error);
      setError("Impossible d'annuler l'invitation");
    }
  };

  const refreshData = async () => {
    // Fonction pour rafraîchir les données après une modification
    await fetchColocationDetailsData();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Valider le formulaire
      if (newExpense.title.trim() === "" || newExpense.amount <= 0) {
        setError("Veuillez fournir un titre et un montant valide");
        return;
      }

      if (newExpense.participants.length === 0) {
        setError("Veuillez sélectionner au moins un participant");
        return;
      }

      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      // Préparer les données
      const expenseData = {
        ...newExpense,
        // Convertir le montant en nombre
        amount: parseFloat(newExpense.amount.toString())
      };

      // Fermer le modal avant l'appel API pour éviter de bloquer l'interface
      setShowCreateExpenseModal(false);

      const response = await fetch(`/api/colocations/${params.id}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          router.push("/auth/signin?session_expired=true");
          return;
        }
        
        throw new Error(errorData.error || "Échec de création de la dépense");
      }

      // Réinitialiser le formulaire
      setNewExpense({
        title: "",
        amount: 0,
        description: "",
        category: "OTHER",
        isEqualSplit: true,
        participants: colocation?.memberships.map(m => m.user.id) || [],
        shares: []
      });
      
      setError(null);
    } catch (error) {
      console.error("Erreur lors de la création de la dépense:", error);
      setError(error instanceof Error ? error.message : "Impossible de créer la dépense");
    }
  };

  const handleParticipantChange = (userId: string, isChecked: boolean) => {
    if (isChecked) {
      // Ajouter le participant
      setNewExpense({
        ...newExpense,
        participants: [...newExpense.participants, userId],
        shares: !newExpense.isEqualSplit 
          ? [...newExpense.shares, { userId, amount: 0 }]
          : newExpense.shares
      });
    } else {
      // Retirer le participant
      setNewExpense({
        ...newExpense,
        participants: newExpense.participants.filter(id => id !== userId),
        shares: !newExpense.isEqualSplit
          ? newExpense.shares.filter(share => share.userId !== userId)
          : newExpense.shares
      });
    }
  };

  const handleSplitTypeChange = (isEqual: boolean) => {
    setNewExpense({
      ...newExpense,
      isEqualSplit: isEqual,
      shares: !isEqual
        ? newExpense.participants.map(userId => ({
            userId,
            amount: newExpense.amount / newExpense.participants.length
          }))
        : []
    });
  };

  const handleShareChange = (userId: string, amount: number) => {
    setNewExpense({
      ...newExpense,
      shares: newExpense.shares.map(share => 
        share.userId === userId ? { ...share, amount } : share
      )
    });
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      GROCERIES: "Courses",
      RENT: "Loyer",
      UTILITIES: "Factures",
      LEISURE: "Loisirs",
      TRANSPORTATION: "Transport",
      HEALTHCARE: "Santé",
      OTHER: "Autre"
    };
    return categories[category] || category;
  };

  // Composant de skeleton loader pour l'affichage pendant le chargement
  const ColocationDetailsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-pulse">
      <div className="bg-gray-50 p-5 rounded-lg border">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="bg-gray-50 p-5 rounded-lg border">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-indigo-700 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="bg-white p-6 rounded-xl shadow-md max-w-md">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  if (!colocation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-red-600 font-medium">Colocation non trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Indicateur de chargement subtil en haut de page */}
        {loading && (
          <div className="fixed top-0 left-0 w-full h-1 bg-indigo-600 animate-pulse"></div>
        )}

        <div className="bg-white shadow-md rounded-xl p-6 mb-6">
          {/* En-tête toujours affiché */}
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-indigo-600 hover:text-indigo-800 mb-2 inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour au tableau de bord
              </button>
              <h1 className="text-2xl font-bold text-indigo-800">
                {loading ? (
                  <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
                ) : (
                  colocation?.name || "Chargement..."
                )}
              </h1>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateExpenseModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
                disabled={loading}
              >
                Ajouter une dépense
              </button>
              {(currentUserRole === "OWNER" || currentUserRole === "ADMIN") && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
                  disabled={loading}
                >
                  Inviter un membre
                </button>
              )}
            </div>
          </div>

          {/* Notification d'erreur globale */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex justify-between items-center">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Contenu de la page */}
          {loading ? (
            <ColocationDetailsSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100">
                  <h2 className="text-xl font-semibold mb-3 text-indigo-800">Informations</h2>
                  {colocation?.address && (
                    <p className="text-indigo-700 mb-2">
                      <span className="font-medium">Adresse:</span> {colocation.address}
                    </p>
                  )}
                  {colocation?.description && (
                    <p className="text-indigo-700 mb-2">
                      <span className="font-medium">Description:</span> {colocation.description}
                    </p>
                  )}
                  <p className="text-indigo-700">
                    <span className="font-medium">Créée le:</span> {new Date(colocation?.createdAt || "").toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100">
                  <h2 className="text-xl font-semibold mb-3 text-indigo-800">
                    Membres ({colocation?.memberships.length || 0})
                  </h2>
                  <ul className="space-y-3">
                    {colocation?.memberships.map((membership) => (
                      <li key={membership.id} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{membership.user.name || membership.user.email}</span>
                          <span className="text-sm text-indigo-500 ml-2">
                            {membership.role === "OWNER" 
                              ? "Propriétaire" 
                              : membership.role === "ADMIN" 
                                ? "Admin" 
                                : "Membre"}
                          </span>
                        </div>
                        {currentUserRole === "OWNER" && membership.role !== "OWNER" && (
                          <button
                            onClick={() => handleRemoveMember(membership.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Retirer ce membre"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {(currentUserRole === "OWNER" || currentUserRole === "ADMIN") && colocation?.invitations.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-3 text-indigo-800">Invitations en attente</h2>
                  <div className="bg-yellow-50 p-5 rounded-lg border border-yellow-200">
                    <ul className="space-y-3">
                      {colocation.invitations.map((invitation) => (
                        <li key={invitation.id} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{invitation.email}</span>
                            <span className="text-sm text-yellow-600 ml-2">
                              Expire le {new Date(invitation.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Annuler l'invitation"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-indigo-800 mb-4">Inviter un membre</h2>
            
            <form onSubmit={handleInviteMember}>
              <div className="mb-6">
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
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Envoyer l'invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'ajout de dépense */}
      {showCreateExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-indigo-800 mb-4">Ajouter une nouvelle dépense</h2>
            
            <form onSubmit={handleCreateExpense}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titre*
                </label>
                <input
                  type="text"
                  id="title"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Montant*
                </label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0.01"
                  value={newExpense.amount || ""}
                  onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  rows={3}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  id="category"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="RENT">Loyer</option>
                  <option value="UTILITIES">Services</option>
                  <option value="GROCERIES">Courses</option>
                  <option value="HOUSEHOLD">Ménage</option>
                  <option value="ENTERTAINMENT">Loisirs</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              
              <div className="mb-4">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Type de répartition
                </span>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="splitType"
                      checked={newExpense.isEqualSplit}
                      onChange={() => handleSplitTypeChange(true)}
                      className="mr-2"
                    />
                    <span>Répartition égale</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="splitType"
                      checked={!newExpense.isEqualSplit}
                      onChange={() => handleSplitTypeChange(false)}
                      className="mr-2"
                    />
                    <span>Répartition personnalisée</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-4">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Participants*
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
                  {colocation?.memberships.map((member) => (
                    <div key={member.user.id} className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newExpense.participants.includes(member.user.id)}
                          onChange={(e) => handleParticipantChange(member.user.id, e.target.checked)}
                          className="mr-2"
                        />
                        <span>{member.user.name || member.user.email}</span>
                      </label>
                      
                      {!newExpense.isEqualSplit && newExpense.participants.includes(member.user.id) && (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newExpense.shares.find(s => s.userId === member.user.id)?.amount || 0}
                          onChange={(e) => handleShareChange(member.user.id, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {!newExpense.isEqualSplit && newExpense.shares.length > 0 && (
                  <div className="mt-2 text-right text-sm">
                    <span className="text-gray-600">
                      Total: {newExpense.shares.reduce((sum, share) => sum + share.amount, 0).toFixed(2)} €
                    </span>
                    {' / '}
                    <span className={`font-medium ${
                      Math.abs(newExpense.shares.reduce((sum, share) => sum + share.amount, 0) - newExpense.amount) < 0.01
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {newExpense.amount.toFixed(2)} €
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateExpenseModal(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 