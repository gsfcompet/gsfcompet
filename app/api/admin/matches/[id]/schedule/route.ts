import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RequestBody = {
  match_date?: string | null;
};

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace("Bearer ", "").trim();

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: "Token admin manquant.",
      supabase: null,
    };
  }

  const supabase = createAdminClient();

  const userResult = await supabase.auth.getUser(token);

  if (userResult.error || !userResult.data.user) {
    return {
      ok: false as const,
      status: 401,
      error: "Session admin invalide.",
      supabase: null,
    };
  }

  const profileResult = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userResult.data.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return {
      ok: false as const,
      status: 403,
      error: "Profil admin introuvable.",
      supabase: null,
    };
  }

  if (profileResult.data.role !== "admin") {
    return {
      ok: false as const,
      status: 403,
      error: "Action réservée aux administrateurs.",
      supabase: null,
    };
  }

  return {
    ok: true as const,
    supabase,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: matchId } = await context.params;
    const body = (await request.json()) as RequestBody;

    if (!matchId) {
      return NextResponse.json(
        { error: "ID match manquant." },
        { status: 400 }
      );
    }

    const supabase = auth.supabase;

    const matchResult = await supabase
      .from("matches")
      .select("id, status")
      .eq("id", matchId)
      .maybeSingle();

    if (matchResult.error) {
      return NextResponse.json(
        { error: matchResult.error.message },
        { status: 500 }
      );
    }

    if (!matchResult.data) {
      return NextResponse.json(
        { error: "Match introuvable." },
        { status: 404 }
      );
    }

    let nextDate: string | null = null;

    if (body.match_date) {
      const parsedDate = new Date(body.match_date);

      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Date / heure invalide." },
          { status: 400 }
        );
      }

      nextDate = parsedDate.toISOString();
    }

    const currentStatus = matchResult.data.status;
    const nextStatus =
      currentStatus === "completed"
        ? "completed"
        : nextDate
        ? "scheduled"
        : "planned";

    const updateResult = await supabase
      .from("matches")
      .update({
        match_date: nextDate,
        status: nextStatus,
      })
      .eq("id", matchId);

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: nextDate
        ? "Date / heure du match enregistrée ✅"
        : "Date / heure du match supprimée ✅",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
