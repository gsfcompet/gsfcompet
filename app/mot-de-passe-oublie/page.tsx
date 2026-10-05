"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);

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

    setSending(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage(
      "Email envoyé ✅ Vérifie ta boîte mail, puis clique sur le lien de réinitialisation."
    );
  }

  return (
    <main className="min-h-screen bg-[#09182D] text-[#DBC399]">
      <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#C39B55]/20 bg-[#0B1B33]/90 p-6 shadow-lg shadow-black/30">
          <Link
            href="/login"
            className="mb-6 inline-flex rounded-xl border border-[#C39B55]/30 px-4 py-2 text-sm font-semibold text-[#DBC399] transition hover:bg-[#071326]"
          >
            ← Retour connexion
          </Link>

          <p className="mb-3 inline-flex rounded-full border border-[#C39B55]/30 bg-[#071326] px-4 py-2 text-sm font-semibold text-[#DBC399]">
            Mot de passe oublié
          </p>

          <h1 className="text-3xl font-black text-[#DBC399]">
            Réinitialiser mon mot de passe
          </h1>

          <p className="mt-3 text-sm text-[#CFC6AB]">
            Renseigne ton adresse email. Tu recevras un lien pour choisir un
            nouveau mot de passe.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-[#C39B55]/30 bg-[#071326] p-4 text-sm text-[#DBC399]">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#DBC399]">
                Adresse email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#C39B55]/20 bg-[#071326] px-4 py-3 text-[#DBC399] outline-none transition placeholder:text-[#CFC6AB]/50 focus:border-[#C39B55]/60"
                placeholder="ton.email@exemple.fr"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="rounded-xl border border-[#C39B55]/40 bg-[#C39B55] px-6 py-3 font-semibold text-[#09182D] shadow-lg shadow-[#C39B55]/15 transition hover:bg-[#DBC399] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Envoi..." : "Recevoir le lien"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}