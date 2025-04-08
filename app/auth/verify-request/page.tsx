import Link from "next/link";

export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-indigo-800">Vérifiez votre email</h2>
          <p className="mt-2 text-base text-indigo-600">
            Un lien de connexion a été envoyé à votre adresse email.
          </p>
        </div>

        <div className="mt-6 bg-blue-100 p-5 rounded-md border border-blue-300">
          <p className="text-blue-800 font-medium">
            Veuillez vérifier votre boîte de réception et cliquer sur le lien pour vous connecter.
          </p>
          <p className="mt-2 text-blue-700">
            Si vous ne recevez pas d'email dans les prochaines minutes, vérifiez votre dossier de spam.
          </p>
        </div>

        <div className="mt-6 text-center">
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