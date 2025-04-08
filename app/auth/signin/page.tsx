"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/lib/client-auth";
import { useAuth } from "@/contexts/AuthContext";

const emailSchema = z.string().email("L'email fourni n'est pas valide");
const otpSchema = z.string().length(6, "Le code doit comporter 6 chiffres");

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session_expired") === "true";
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [loading, setLoading] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState(sessionExpired);

  useEffect(() => {
    if (sessionExpired) {
      setExpiredMessage(true);
    }
  }, [sessionExpired]);

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement> | { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setExpiredMessage(false);

    try {
      // Validation de l'email
      emailSchema.parse(email);

      // Appel API pour envoyer l'OTP directement
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, type: "LOGIN" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de l'envoi du code");
      } else {
        setStep("OTP");
      }
    } catch (err) {
      console.error("Erreur:", err);
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validation de l'OTP
      otpSchema.parse(otp);

      // Appel API pour vérifier l'OTP
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: otp, type: "LOGIN" }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.redirectTo && data.redirectTo === "/auth/signup") {
          // Rediriger vers l'inscription si l'utilisateur n'existe pas
          router.push(data.redirectTo);
          return;
        }
        setError(data.error || "Code invalide");
      } else {
        // Stocker le token et les infos utilisateur dans le contexte
        if (data.token && data.user) {
          // Utiliser le contexte d'auth pour se connecter
          login(data.token, data.user);
          
          // Garder aussi la méthode originale pour compatibilité
          setAuthToken(data.token, data.user?.id);
          console.log("Utilisateur connecté:", data.user);
        }
        
        // Rediriger vers le tableau de bord
        router.push(data.redirectTo || "/dashboard");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  const EmailStep = (
    <form onSubmit={handleSendOtp} className="mt-8 space-y-6">
      {expiredMessage && (
        <div className="bg-amber-100 border border-amber-300 text-amber-800 p-4 rounded-md">
          <p className="font-medium">Votre session a expiré</p>
          <p className="text-sm">Pour des raisons de sécurité, vous avez été déconnecté suite à une période d'inactivité. Veuillez vous reconnecter.</p>
        </div>
      )}
      
      <div>
        <label htmlFor="email-address" className="block text-sm font-medium text-indigo-800 mb-1">
          Adresse email
        </label>
        <input
          id="email-address"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="appearance-none rounded-md relative block w-full px-3 py-3 border border-indigo-300 placeholder-indigo-400 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
        >
          {loading ? "Chargement..." : "Recevoir un code de connexion"}
        </button>
      </div>
    </form>
  );

  const OtpStep = (
    <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-indigo-800 mb-1">
          Code de connexion
        </label>
        <p className="text-sm text-indigo-600 mb-3">
          Un code à 6 chiffres a été envoyé à <strong>{email}</strong>
        </p>
        <input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          pattern="[0-9]{6}"
          maxLength={6}
          className="appearance-none rounded-md relative block w-full px-3 py-3 border border-indigo-300 placeholder-indigo-400 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-center text-xl tracking-widest"
          placeholder="------"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep("EMAIL")}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
          disabled={loading}
        >
          Modifier l'email
        </button>
        <button
          type="button"
          onClick={() => handleSendOtp({ preventDefault: () => {} } as any)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
          disabled={loading}
        >
          Renvoyer le code
        </button>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
        >
          {loading ? "Chargement..." : "Se connecter"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-indigo-800">
            Connexion
          </h2>
          <p className="mt-2 text-base text-indigo-600">
            {step === "EMAIL" 
              ? "Accédez à votre espace personnel"
              : "Entrez le code reçu par email pour vous connecter"}
          </p>
        </div>

        {step === "EMAIL" ? EmailStep : OtpStep}

        <div className="mt-6 text-center">
          <p className="text-sm text-indigo-700">
            Vous n'avez pas de compte ?{" "}
            <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
              Inscrivez-vous
            </Link>
          </p>

          <Link href="/" className="block mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
} 