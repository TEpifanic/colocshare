"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NavigationIndicator() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [prevPathname, setPrevPathname] = useState('');

  useEffect(() => {
    // Si le chemin a changé, c'est que la navigation est terminée
    if (prevPathname !== '' && prevPathname !== pathname) {
      setIsNavigating(false);
    }
    
    // Stocker le chemin actuel pour la comparaison future
    setPrevPathname(pathname);
  }, [pathname, prevPathname]);

  // Intercepter les événements de navigation
  useEffect(() => {
    const handleStartNav = () => setIsNavigating(true);
    const handleEndNav = () => setIsNavigating(false);

    // S'abonner aux événements du routeur (à adapter selon Next.js)
    window.addEventListener('beforeunload', handleStartNav);
    window.addEventListener('load', handleEndNav);

    // Intercepter les clics sur les liens
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.getAttribute('href')?.startsWith('/')) {
        setIsNavigating(true);
      }
    };

    document.addEventListener('click', handleLinkClick);

    return () => {
      window.removeEventListener('beforeunload', handleStartNav);
      window.removeEventListener('load', handleEndNav);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  // Si pas de navigation en cours, ne rien afficher
  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 h-1 bg-transparent">
      <div className="h-full bg-indigo-600 animate-progress-bar"></div>
    </div>
  );
} 