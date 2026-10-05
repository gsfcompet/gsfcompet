"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useMemberSession() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [sessionLoading, setLoading] = useState(true);
  const [sessionError, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setError("Erreur lors de la récupération de la session.");
        setLoading(false);
        return;
      }

      const id = data.session?.user?.id;

      if (!id) {
        router.replace("/login?redirect=/membre");
        return;
      }

      setUserId(id);
      setLoading(false);
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  return { userId, sessionLoading, sessionError, supabase };
}