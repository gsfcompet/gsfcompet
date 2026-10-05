"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  canAccessAdminModule,
  normalizeRole,
  type AdminModule,
} from "@/lib/roles";

function getRequiredModule(pathname: string): AdminModule {
  if (pathname.startsWith("/admin/competitions")) return "competitions";
  if (pathname.startsWith("/admin/teams")) return "teams";
  if (pathname.startsWith("/admin/gazette")) return "gazette";
  if (pathname.startsWith("/admin/membres")) return "members";

  return "admin";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setChecking(true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = normalizeRole(profile?.role);
      const module = getRequiredModule(pathname);

      if (!profile || !canAccessAdminModule(role, module)) {
        router.replace("/");
        return;
      }

      if (!cancelled) setChecking(false);
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (checking) {
    return <main className="p-8 text-center">Vérification des accès...</main>;
  }

  return <>{children}</>;
}