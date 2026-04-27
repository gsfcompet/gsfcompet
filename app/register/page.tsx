"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username || !email || !password) {
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
      email,
      password,
      options: {
        data: {
          username,
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
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#0B0610] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Inscription
          </p>

          <h1 className="text-3xl font-black">Créer un compte</h1>

          <p className="mt-2 text-[#D8C7A0]">
            Crée ton compte membre Guardian&apos;s Family.
          </p>

          <form onSubmit={handleRegister} className="mt-8 grid gap-5">
            {message && (
              <div className="rounded-xl border border-[#D9A441]/30 bg-[#0B0610] px-4 py-3 text-sm text-[#F2D27A]">
                {message}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                Pseudo
              </label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                placeholder="Ex : Greg"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                placeholder="ton@email.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
                placeholder="6 caractères minimum"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#D8C7A0]">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-semibold text-[#F2D27A]">
              Se connecter
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}