"use client";

// Cache des données
interface CacheData<T> {
  data: T;
  timestamp: number;
}

interface CacheEntry<T> {
  [key: string]: CacheData<T>;
}

// Cache global
const dataCache: {
  users: CacheEntry<any>;
  colocations: CacheEntry<any[]>;
  colocationDetails: CacheEntry<any>;
  expenses: CacheEntry<any>;
} = {
  users: {},
  colocations: {},
  colocationDetails: {},
  expenses: {}
};

// Durée de vie du cache
const CACHE_DURATION = 60 * 1000; // 1 minute

/**
 * Fonction pour récupérer les données utilisateur avec mise en cache
 */
export async function fetchCurrentUser(token: string) {
  if (!token) {
    throw new Error("Aucun token d'authentification");
  }

  const cacheKey = 'me';
  const now = Date.now();
  
  // Vérifier si les données sont en cache et valides
  if (dataCache.users[cacheKey] && (now - dataCache.users[cacheKey].timestamp < CACHE_DURATION)) {
    return dataCache.users[cacheKey].data;
  }

  // Récupérer les données depuis l'API
  const response = await fetch("/api/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    },
    next: { 
      revalidate: 60 // Revalider toutes les 60 secondes 
    }
  });

  if (!response.ok) {
    throw new Error("Échec de récupération des informations utilisateur");
  }

  const userData = await response.json();
  
  // Mettre en cache les données
  dataCache.users[cacheKey] = {
    data: userData,
    timestamp: now
  };

  return userData;
}

/**
 * Fonction pour récupérer les colocations avec mise en cache
 */
export async function fetchColocations(token: string) {
  if (!token) {
    throw new Error("Aucun token d'authentification");
  }

  const cacheKey = 'all';
  const now = Date.now();
  
  // Vérifier si les données sont en cache et valides
  if (dataCache.colocations[cacheKey] && (now - dataCache.colocations[cacheKey].timestamp < CACHE_DURATION)) {
    return dataCache.colocations[cacheKey].data;
  }

  // Récupérer les données depuis l'API
  const response = await fetch("/api/colocations", {
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    },
    next: { 
      revalidate: 60 // Revalider toutes les 60 secondes
    }
  });

  if (!response.ok) {
    throw new Error("Échec de récupération des colocations");
  }

  const data = await response.json();
  const colocations = data.colocations || [];
  
  // Mettre en cache les données
  dataCache.colocations[cacheKey] = {
    data: colocations,
    timestamp: now
  };

  return colocations;
}

/**
 * Fonction pour récupérer les détails d'une colocation avec mise en cache
 */
export async function fetchColocationDetails(token: string, colocationId: string) {
  if (!token) {
    throw new Error("Aucun token d'authentification");
  }

  const cacheKey = colocationId;
  const now = Date.now();
  
  // Vérifier si les données sont en cache et valides
  if (dataCache.colocationDetails[cacheKey] && (now - dataCache.colocationDetails[cacheKey].timestamp < CACHE_DURATION)) {
    return dataCache.colocationDetails[cacheKey].data;
  }

  // Récupérer les données depuis l'API
  const response = await fetch(`/api/colocations/${colocationId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    },
    next: { 
      revalidate: 60 // Revalider toutes les 60 secondes
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expirée");
    } else if (response.status === 403) {
      throw new Error("Accès non autorisé");
    } else if (response.status === 404) {
      throw new Error("Colocation non trouvée");
    }
    throw new Error("Échec de récupération des détails de la colocation");
  }

  const data = await response.json();
  
  // Mettre en cache les données
  dataCache.colocationDetails[cacheKey] = {
    data,
    timestamp: now
  };

  return data;
}

/**
 * Fonction pour récupérer les dépenses d'une colocation avec mise en cache
 */
export async function fetchColocationExpenses(token: string, colocationId: string) {
  if (!token) {
    throw new Error("Aucun token d'authentification");
  }

  const cacheKey = colocationId;
  const now = Date.now();
  
  // Vérifier si les données sont en cache et valides
  if (dataCache.expenses[cacheKey] && (now - dataCache.expenses[cacheKey].timestamp < CACHE_DURATION)) {
    return dataCache.expenses[cacheKey].data;
  }

  // Récupérer les données depuis l'API
  const response = await fetch(`/api/colocations/${colocationId}/expenses`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache'
    },
    next: { 
      revalidate: 60 // Revalider toutes les 60 secondes
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expirée");
    } else if (response.status === 403) {
      throw new Error("Accès non autorisé");
    }
    throw new Error("Échec de récupération des dépenses");
  }

  const data = await response.json();
  
  // Mettre en cache les données
  dataCache.expenses[cacheKey] = {
    data,
    timestamp: now
  };

  return data;
}

/**
 * Fonction pour invalider le cache
 */
export function invalidateCache(type: 'users' | 'colocations' | 'colocationDetails' | 'expenses', key: string = 'all') {
  if (dataCache[type][key]) {
    delete dataCache[type][key];
  }
} 