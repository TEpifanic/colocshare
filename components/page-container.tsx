"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface PageContainerProps {
  children: ReactNode;
  isLoading?: boolean;
}

export default function PageContainer({ children, isLoading = false }: PageContainerProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevContent, setPrevContent] = useState<ReactNode | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Réinitialiser l'état de transition lors du changement de route
  useEffect(() => {
    setIsTransitioning(false);
    
    // Cette technique permet de conserver l'UI précédente pendant le chargement des données
    // pour éviter le flash de contenu vide
    if (!isLoading) {
      setPrevContent(children);
    }
  }, [pathname, isLoading, children]);

  // Intercepter les événements de navigation
  useEffect(() => {
    const handleStart = () => {
      setIsTransitioning(true);
    };

    const handleComplete = () => {
      setIsTransitioning(false);
    };

    // Précharger les liens visibles sur la page
    const prefetchVisibleLinks = () => {
      const links = document.querySelectorAll('a[href^="/"]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('#') && href !== pathname) {
          router.prefetch(href);
        }
      });
    };

    // Précharger les liens lors du chargement
    prefetchVisibleLinks();

    // Précharger les liens lors du survol
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href && !href.includes('#') && href !== pathname) {
          router.prefetch(href);
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('beforeunload', handleStart);
    document.addEventListener('load', handleComplete);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('beforeunload', handleStart);
      document.removeEventListener('load', handleComplete);
    };
  }, [pathname, router]);

  // Si la page est en chargement interne (données d'API, etc.)
  if (isLoading) {
    // Afficher le contenu précédent pour éviter les flashs de contenu vide
    return (
      <div className="min-h-screen bg-indigo-50">
        {prevContent || children}
        {/* Indicateur de chargement subtil en haut de l'écran */}
        {isLoading && !isTransitioning && (
          <div className="fixed top-0 left-0 w-full z-50 h-1 bg-transparent">
            <div className="h-full bg-indigo-600 animate-progress-bar"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50">
      {children}
      {/* Indicateur de transition entre pages */}
      {isTransitioning && (
        <div className="fixed top-0 left-0 w-full z-50 h-1 bg-transparent">
          <div className="h-full bg-indigo-600 animate-progress-bar"></div>
        </div>
      )}
    </div>
  );
} 