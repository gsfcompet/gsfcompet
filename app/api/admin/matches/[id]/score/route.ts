import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageScores } from "@/lib/roles";

type RequestBody = {
  action?: "save" | "reset";
  home_score?: number;
  away_score?: number;
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

  if (!canManageScores(profileResult.data.role)) {
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

function isValidScore(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0;
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

    if (body.action !== "save" && body.action !== "reset") {
      return NextResponse.json(
        { error: "Action invalide." },
        { status: 400 }
      );
    }

    const supabase = auth.supabase;

    if (body.action === "reset") {
      const resetResult = await supabase
        .from("matches")
        .update({
          home_score: null,
          away_score: null,
          status: "planned",
          submitted_home_score: null,
          submitted_away_score: null,
          score_submitted_by: null,
          score_submitted_at: null,
          score_status: null,
          score_admin_note: null,
        })
        .eq("id", matchId);

      if (resetResult.error) {
        return NextResponse.json(
          { error: resetResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Score réinitialisé ✅",
      });
    }

    const homeScore = Number(body.home_score);
    const awayScore = Number(body.away_score);

    if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
      return NextResponse.json(
        { error: "Les scores doivent être des nombres entiers positifs." },
        { status: 400 }
      );
    }

    const saveResult = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "completed",
        submitted_home_score: null,
        submitted_away_score: null,
        score_submitted_by: null,
        score_submitted_at: null,
        score_status: "validated",
        score_admin_note: null,
      })
      .eq("id", matchId);

    if (saveResult.error) {
      return NextResponse.json(
        { error: saveResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Score enregistré ✅",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
