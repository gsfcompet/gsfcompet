"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState(
    "Vérification du lien de réinitialisation..."
  );

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        setReady(true);
        setMessage("Lien valide ✅ Tu peux choisir un nouveau mot de passe.");
      } else {
        setReady(false);
        setMessage(
          "Lien invalide ou expiré. Refais une demande de réinitialisation."
        );
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setMessage("Lien valide ✅ Tu peux choisir un nouveau mot de passe.");
      }
    });

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ready) {
      setMessage(
        "Le lien de réinitialisation n’est pas valide. Refais une demande."
      );
      return;
    }

    if (password.length < 8) {
      setMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setSaving(false);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    await supabase.auth.signOut();

    setSaving(false);
    setPassword("");
    setConfirmPassword("");
    setReady(false);
    setMessage(
      "Mot de passe modifié ✅ Tu peux maintenant te connecter avec ton nouveau mot de passe."
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
          <Link
            href="/login"
            className="mb-6 inline-flex rounded-xl border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
          >
            ← Retour connexion
          </Link>

          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#0B0610] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Nouveau mot de passe
          </p>

          <h1 className="text-3xl font-black">
            Choisir un nouveau mot de passe
          </h1>

          <p className="mt-3 text-sm text-[#D8C7A0]">
            Cette page fonctionne uniquement depuis le lien reçu par email.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#0B0610] p-4 text-sm text-[#F2D27A]">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                Nouveau mot de passe
              </label>

              <input
                type="password"
                value={password}
                disabled={!ready || saving}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Minimum 8 caractères"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                Confirmer le mot de passe
              </label>

              <input
                type="password"
                value={confirmPassword}
                disabled={!ready || saving}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Répète le mot de passe"
              />
            </div>

            <button
              type="submit"
              disabled={!ready || saving}
              className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Modification..." : "Modifier mon mot de passe"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/mot-de-passe-oublie"
              className="text-sm font-semibold text-[#F2D27A] hover:underline"
            >
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
