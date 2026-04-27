import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type Profile = {
  id: string;
  role: "member" | "admin";
};

type Match = {
  id: string;
  submitted_home_score: number | null;
  submitted_away_score: number | null;
};

function createUserClient(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant.");
  }

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY manquant.");
  }

  const authorization = request.headers.get("authorization") ?? "";

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await context.params;

    if (!matchId) {
      return NextResponse.json(
        { error: "ID match manquant." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action = body.action as "validate" | "reject" | undefined;

    if (action !== "validate" && action !== "reject") {
      return NextResponse.json(
        { error: "Action invalide. Utilise validate ou reject." },
        { status: 400 }
      );
    }

    const userClient = createUserClient(request);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Tu dois être connecté." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const profileResult = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      return NextResponse.json(
        { error: profileResult.error.message },
        { status: 500 }
      );
    }

    const profile = profileResult.data as Profile | null;

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Action réservée aux admins." },
        { status: 403 }
      );
    }

    const matchResult = await admin
      .from("matches")
      .select("id, submitted_home_score, submitted_away_score")
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

    const match = matchResult.data as Match;

    if (action === "reject") {
      const rejectResult = await admin
        .from("matches")
        .update({
          score_status: "rejected",
        })
        .eq("id", match.id);

      if (rejectResult.error) {
        return NextResponse.json(
          { error: rejectResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Score proposé refusé.",
      });
    }

    if (
      match.submitted_home_score === null ||
      match.submitted_away_score === null
    ) {
      return NextResponse.json(
        { error: "Aucun score proposé à valider." },
        { status: 400 }
      );
    }

    const validateResult = await admin
      .from("matches")
      .update({
        home_score: match.submitted_home_score,
        away_score: match.submitted_away_score,
        status: "completed",
        score_status: "validated",
      })
      .eq("id", match.id);

    if (validateResult.error) {
      return NextResponse.json(
        { error: validateResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Score validé et match terminé.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}