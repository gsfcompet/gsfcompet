"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setMessage("Merci de renseigner ton adresse email.");
      return;
    }

    setSending(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/reinitialiser-mot-de-passe`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setSending(false);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setSending(false);
    setMessage(
      "Email envoyé ✅ Vérifie ta boîte mail, puis clique sur le lien de réinitialisation."
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
            Mot de passe oublié
          </p>

          <h1 className="text-3xl font-black">
            Réinitialiser mon mot de passe
          </h1>

          <p className="mt-3 text-sm text-[#D8C7A0]">
            Renseigne ton adresse email. Tu recevras un lien pour choisir un
            nouveau mot de passe.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#D9A441]/30 bg-[#0B0610] p-4 text-sm text-[#F2D27A]">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                Adresse email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                placeholder="ton.email@exemple.fr"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Envoi..." : "Recevoir le lien"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
