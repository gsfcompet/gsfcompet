"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useMemberSession() {
  const router = useRouter();
  const supabase = createClient();

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

      if (!data.session?.user?.id) {
        router.replace("/login?redirect=/membre");
        return;
      }

      setUserId(data.session.user.id);
      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  return { userId, sessionLoading, sessionError, supabase };
}
