"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const redirectTo = searchParams.get("redirect") || "/membre";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace(redirectTo);
        return;
      }

      setLoading(false);
    }

    checkExistingSession();
  }, [router, redirectTo, supabase]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(null);
    setSubmitting(true);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setMessage("Merci de renseigner ton adresse email et ton mot de passe.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error(error);
      setMessage("Connexion impossible. Vérifie ton email et ton mot de passe.");
      setSubmitting(false);
      return;
    }

    if (!data.session?.user) {
      setMessage("Connexion effectuée, mais aucune session active n'a été trouvée.");
      setSubmitting(false);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_700px_at_10%_-10%,#12274A_0%,#0B1B33_60%)] px-4 text-[#cfc6ab]">
        <div className="rounded-2xl border border-[rgba(241,233,210,0.14)] bg-[#12274A] p-8 text-center">
          <p className="font-bold text-[#DBC399]">
            Vérification de la session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_700px_at_10%_-10%,#12274A_0%,#0B1B33_60%)] px-4 py-10 text-[#cfc6ab]">
      <section className="w-full max-w-xl rounded-2xl border border-[rgba(241,233,210,0.14)] bg-[#12274A] p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-[#C39B55]/60 px-4 py-2 text-sm font-bold text-[#DBC399] transition hover:bg-[#C39B55]/10"
          >
            ← Retour accueil
          </Link>

          <span className="rounded-lg border border-[#C39B55]/60 px-4 py-2 text-sm font-bold text-[#DBC399]">
            Connexion membre
          </span>
        </div>

        <h1 className="text-4xl font-black text-[#DBC399]">
          Se connecter
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#cfc6ab]">
          Connecte-toi à ton compte Guardian's Family pour accéder à ton
          espace membre, tes compétitions et tes matchs.
        </p>

        {message && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-300/30 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-200"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#DBC399]">
              Adresse email
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-[rgba(241,233,210,0.14)] bg-[#0B1B33] px-4 py-3 text-[#cfc6ab] outline-none transition placeholder:text-[#cfc6ab]/50 focus:border-[#C39B55] focus:ring-2 focus:ring-[#C39B55]/25"
              placeholder="ton@email.fr"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[#DBC399]">
                Mot de passe
              </span>

              <Link
                href="/mot-de-passe-oublie"
                className="text-xs font-bold text-[#DBC399] transition hover:text-[#cfc6ab]"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-[rgba(241,233,210,0.14)] bg-[#0B1B33] px-4 py-3 text-[#cfc6ab] outline-none transition placeholder:text-[#cfc6ab]/50 focus:border-[#C39B55] focus:ring-2 focus:ring-[#C39B55]/25"
              placeholder="••••••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#C39B55] px-5 py-3 font-black text-[#0B1B33] shadow-lg shadow-black/20 transition hover:bg-[#DBC399] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-8 border-t border-[rgba(241,233,210,0.14)] pt-6 text-center text-sm text-[#cfc6ab]">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-bold text-[#DBC399] transition hover:text-white"
          >
            Créer un compte
          </Link>
        </div>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_700px_at_10%_-10%,#12274A_0%,#0B1B33_60%)] px-4 text-[#cfc6ab]">
      <div className="rounded-2xl border border-[rgba(241,233,210,0.14)] bg-[#12274A] p-8 text-center">
        <p className="font-bold text-[#DBC399]">
          Chargement de la page connexion...
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
