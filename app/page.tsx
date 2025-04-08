import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50 to-white">
      {/* Header avec navigation */}
      <header className="p-4 sm:p-6 flex justify-between items-center bg-white shadow-sm border-b border-indigo-100">
        <div className="text-2xl font-bold text-indigo-800">Coloc Share</div>
        <nav className="flex items-center space-x-4">
          <Link 
            href="/auth/signin" 
            className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Connexion
          </Link>
          <Link 
            href="/auth/signup" 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Inscription
          </Link>
        </nav>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-indigo-900">
          Gérez votre colocation simplement
        </h1>
        <p className="text-xl max-w-2xl mb-10 text-indigo-700">
          Une plateforme intuitive pour partager les dépenses, organiser les tâches ménagères et communiquer avec vos colocataires.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/auth/signup" 
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-lg font-medium shadow-md transition-colors"
          >
            Commencer gratuitement
          </Link>
          <Link 
            href="#features" 
            className="px-6 py-3 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 text-lg font-medium text-indigo-700 shadow-sm transition-colors"
          >
            En savoir plus
          </Link>
        </div>
      </main>

      {/* Section caractéristiques */}
      <section id="features" className="py-16 px-4 bg-indigo-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-indigo-900">Fonctionnalités principales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md border border-indigo-100">
              <h3 className="text-xl font-semibold mb-3 text-indigo-800">Gestion des dépenses</h3>
              <p className="text-indigo-700">Suivez facilement qui doit quoi à qui et équilibrez les comptes entre colocataires.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-indigo-100">
              <h3 className="text-xl font-semibold mb-3 text-indigo-800">Tâches ménagères</h3>
              <p className="text-indigo-700">Organisez et répartissez les tâches, avec des rappels automatiques.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-indigo-100">
              <h3 className="text-xl font-semibold mb-3 text-indigo-800">Communication</h3>
              <p className="text-indigo-700">Restez en contact avec vos colocataires et partagez des informations importantes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-white border-t border-indigo-100">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-indigo-600">&copy; {new Date().getFullYear()} Coloc Share. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
