"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string | null;
  email: string;
  role: "member" | "admin";
};

export default function AuthStatus() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("username, email, role")
      .eq("id", user.id)
      .single();

    if (data && !error) {
      setProfile(data as Profile);
      setLoading(false);
      return;
    }

    setProfile({
      username: user.user_metadata?.username || null,
      email: user.email || "Compte connecté",
      role: "member",
    });

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    window.location.href = "/";
  }

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="text-xs text-[#8F7B5C]">Vérification...</div>;
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/login"
          className="text-[#D8C7A0] transition hover:text-[#F2D27A]"
        >
          Connexion
        </Link>

        <Link
          href="/register"
          className="rounded-lg border border-[#D9A441]/30 px-3 py-2 font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
        >
          Inscription
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right text-xs sm:block">
        <p className="font-semibold text-[#F7E9C5]">
          {profile.username || profile.email}
        </p>

        <p className="text-[#8F7B5C]">
          {profile.role === "admin" ? "Admin" : "Membre"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-[#D9A441]/30 px-3 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
      >
        Déconnexion
      </button>
    </div>
  );
}