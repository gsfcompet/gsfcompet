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
      <main className="flex min-h-screen items-center justify-center bg-[#07000d] px-4 text-white">
        <div className="rounded-3xl border border-yellow-500/20 bg-black/30 p-8 text-center">
          <p className="font-bold text-yellow-200">
            Vérification de la session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07000d] px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-yellow-700/40 bg-[#140711] p-6 shadow-2xl shadow-black/40 md:p-8">
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-2xl border border-yellow-500/40 px-4 py-2 text-sm font-black text-yellow-200 transition hover:bg-yellow-500/10"
          >
            ← Retour accueil
          </Link>

          <span className="rounded-2xl border border-yellow-500/40 px-4 py-2 text-sm font-black text-yellow-200">
            Connexion membre
          </span>
        </div>

        <h1 className="text-4xl font-black text-yellow-100">
          Se connecter
        </h1>

        <p className="mt-4 text-sm leading-6 text-yellow-100/80">
          Connecte-toi à ton compte Guardian&apos;s Family pour accéder à ton
          espace membre, tes compétitions et tes matchs.
        </p>

        {message && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-yellow-200">
              Adresse email
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-slate-100 px-4 py-4 text-slate-950 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
              placeholder="ton@email.fr"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="block text-sm font-black text-yellow-200">
                Mot de passe
              </span>

              <Link
                href="/mot-de-passe-oublie"
                className="text-xs font-black text-yellow-200 transition hover:text-yellow-100"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-slate-100 px-4 py-4 text-slate-950 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
              placeholder="••••••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-red-700 px-5 py-4 font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-8 border-t border-yellow-900/40 pt-6 text-center text-sm text-yellow-100/80">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-black text-yellow-200 transition hover:text-yellow-100"
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
    <main className="flex min-h-screen items-center justify-center bg-[#07000d] px-4 text-white">
      <div className="rounded-3xl border border-yellow-500/20 bg-black/30 p-8 text-center">
        <p className="font-bold text-yellow-200">
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
