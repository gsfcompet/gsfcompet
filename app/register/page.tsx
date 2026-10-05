"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !email.trim() || !password) {
      setMessage("Merci de remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage(
      "Compte créé ✅ Si Supabase demande une confirmation email, vérifie ta boîte mail."
    );

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-[#09182D] text-[#DBC399]">
      <section className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#C39B55]/20 bg-[#0B1B33]/90 p-6 shadow-lg shadow-black/30">
          <p className="mb-3 inline-flex rounded-full border border-[#C39B55]/30 bg-[#071326] px-4 py-2 text-sm font-semibold text-[#DBC399]">
            Inscription
          </p>

          <h1 className="text-3xl font-black text-[#DBC399]">
            Créer un compte
          </h1>

          <p className="mt-2 text-[#CFC6AB]">
            Crée ton compte membre Guardian's Family.
          </p>

          <form onSubmit={handleRegister} className="mt-8 grid gap-5">
            {message && (
              <div className="rounded-xl border border-[#C39B55]/30 bg-[#071326] px-4 py-3 text-sm text-[#DBC399]">
                {message}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#DBC399]">
                Pseudo
              </label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-[#C39B55]/20 bg-[#071326] px-4 py-3 text-[#DBC399] outline-none transition placeholder:text-[#CFC6AB]/50 focus:border-[#C39B55]/60"
                placeholder="Ex : Greg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#DBC399]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#C39B55]/20 bg-[#071326] px-4 py-3 text-[#DBC399] outline-none transition placeholder:text-[#CFC6AB]/50 focus:border-[#C39B55]/60"
                placeholder="ton@email.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#DBC399]">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#C39B55]/20 bg-[#071326] px-4 py-3 text-[#DBC399] outline-none transition placeholder:text-[#CFC6AB]/50 focus:border-[#C39B55]/60"
                placeholder="6 caractères minimum"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl border border-[#C39B55]/40 bg-[#C39B55] px-6 py-3 font-semibold text-[#09182D] shadow-lg shadow-[#C39B55]/15 transition hover:bg-[#DBC399] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#CFC6AB]">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#DBC399] hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}