import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canManageCompetitions } from "@/lib/roles";

const allowedStatuses = ["draft", "planned", "active", "completed", "archived"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Configuration Supabase serveur incomplète." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { error: "Session admin introuvable." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const nextStatus = body?.status;

  if (!nextStatus || !allowedStatuses.includes(nextStatus)) {
    return NextResponse.json(
      { error: "Statut invalide." },
      { status: 400 }
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Session invalide." },
      { status: 401 }
    );
  }

  const profileResult = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error || !canManageCompetitions(profileResult.data?.role)) {
    return NextResponse.json(
      { error: "Action réservée aux admins." },
      { status: 403 }
    );
  }

  const updateResult = await adminClient
    .from("competitions")
    .update({ status: nextStatus })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();

  if (updateResult.error) {
    return NextResponse.json(
      { error: updateResult.error.message },
      { status: 500 }
    );
  }

  if (!updateResult.data) {
    return NextResponse.json(
      { error: "Compétition introuvable ou non modifiée." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message:
      nextStatus === "archived"
        ? "Compétition archivée ✅"
        : "Statut compétition modifié ✅",
    competition: updateResult.data,
  });
}
