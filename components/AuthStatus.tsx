"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { roleLabels, normalizeRole, type AppRole } from "@/lib/roles";

type Profile = {
  username: string | null;
  email: string;
  role: AppRole;
};

export default function AuthStatus() {
  const supabase = useMemo(() => createClient(), []);
  const mountedRef = useRef(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mountedRef.current) return;

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, email, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mountedRef.current) return;

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
    },
    [supabase]
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    window.location.href = "/";
  }

  useEffect(() => {
    mountedRef.current = true;

    loadUser(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        loadUser(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadUser, supabase]);

  if (loading) {
    return <div className="text-xs text-[#CFC6AB]">Vérification...</div>;
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/login"
          className="text-[#CFC6AB] transition hover:text-[#DBC399]"
        >
          Connexion
        </Link>

        <Link
          href="/register"
          className="rounded-lg border border-[#C39B55]/40 bg-[#0B1B33]/60 px-3 py-2 font-semibold text-[#DBC399] transition hover:bg-[#12274A]"
        >
          Inscription
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right text-xs sm:block">
        <p className="font-semibold text-[#CFC6AB]">
          {profile.username || profile.email}
        </p>

        <p className="text-[#C39B55]">
          {roleLabels[normalizeRole(profile.role)]}
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-[#C39B55]/40 bg-[#0B1B33]/60 px-3 py-2 text-sm font-semibold text-[#DBC399] transition hover:bg-[#12274A]"
      >
        Déconnexion
      </button>
    </div>
  );
}