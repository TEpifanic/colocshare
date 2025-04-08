"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/lib/client-auth";

interface Colocation {
  id: string;
  name: string;
  address?: string;
  description?: string;
  createdAt: string;
}

export default function ColocationsPage() {
  const router = useRouter();
  const logout = useLogout();
  const [colocations, setColocations] = useState<Colocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColocation, setNewColocation] = useState({
    name: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    fetchColocations();
  }, []);

  const fetchColocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const response = await fetch("/api/colocations", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Échec de récupération des colocations");
      }

      const data = await response.json();
      setColocations(data.colocations || []);
    } catch (error) {
      console.error("Erreur lors de la récupération des colocations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateColocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const response = await fetch("/api/colocations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newColocation)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur API:", errorData);
        
        if (response.status === 401) {
          alert("Votre session a expiré. Veuillez vous reconnecter.");
          logout();
          router.push("/auth/signin?session_expired=true");
          return;
        }
        
        throw new Error(errorData.error || "Échec de création de la colocation");
      }

      // Rafraîchir la liste des colocations
      await fetchColocations();
      
      // Réinitialiser le formulaire et fermer le modal
      setNewColocation({ name: "", address: "", description: "" });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Erreur lors de la création de la colocation:", error);
      alert(`Erreur lors de la création de la colocation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-xl p-6">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-2xl font-bold text-indigo-800">Mes colocations</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Créer une colocation
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <p className="text-indigo-600 font-medium">Chargement...</p>
            </div>
          ) : colocations.length === 0 ? (
            <div className="bg-indigo-100 p-6 rounded-lg border border-indigo-200 text-center">
              <p className="text-indigo-700 mb-4">Vous n'avez pas encore de colocation.</p>
              <p className="text-indigo-600">
                Créez votre première colocation en cliquant sur le bouton ci-dessus !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {colocations.map((colocation) => (
                <div
                  key={colocation.id}
                  className="bg-white border border-indigo-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/colocations/${colocation.id}`)}
                >
                  <h2 className="text-xl font-semibold text-indigo-800 mb-2">{colocation.name}</h2>
                  {colocation.address && (
                    <p className="text-gray-600 mb-2">
                      <span className="font-medium">Adresse:</span> {colocation.address}
                    </p>
                  )}
                  {colocation.description && (
                    <p className="text-gray-600 mb-4">
                      <span className="font-medium">Description:</span> {colocation.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Créée le {new Date(colocation.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de création de colocation */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-indigo-800 mb-4">Créer une nouvelle colocation</h2>
            
            <form onSubmit={handleCreateColocation}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la colocation*
                </label>
                <input
                  type="text"
                  id="name"
                  value={newColocation.name}
                  onChange={(e) => setNewColocation({...newColocation, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  id="address"
                  value={newColocation.address}
                  onChange={(e) => setNewColocation({...newColocation, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newColocation.description}
                  onChange={(e) => setNewColocation({...newColocation, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 