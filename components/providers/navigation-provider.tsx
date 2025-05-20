"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
});

export const useNavigation = () => useContext(NavigationContext);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Réinitialiser l'état de navigation quand le chemin change
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <NavigationContext.Provider value={{ isNavigating }}>
      {children}
    </NavigationContext.Provider>
  );
} 