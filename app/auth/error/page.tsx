"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  let errorMessage = "Une erreur est survenue lors de l'authentification.";

  // Personnaliser les messages d'erreur en fonction du code d'erreur
  switch (error) {
    case "Verification":
      errorMessage = "Le lien de vérification est invalide ou a expiré.";
      break;
    case "OAuthAccountNotLinked":
      errorMessage = "Cet email est déjà utilisé avec une autre méthode de connexion.";
      break;
    case "EmailSignin":
      errorMessage = "Échec de l'envoi de l'email de vérification.";
      break;
    default:
      break;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-indigo-800">Erreur d'authentification</h2>
        </div>

        <div className="mt-6 bg-red-100 p-5 rounded-md border border-red-300">
          <p className="text-red-800 font-medium">{errorMessage}</p>
        </div>

        <div className="mt-8 text-center">
          <Link 
            href="/auth/signin" 
            className="inline-flex items-center justify-center px-5 py-2 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            Retour à la page de connexion
          </Link>
        </div>
      </div>
    </div>
  );
} 