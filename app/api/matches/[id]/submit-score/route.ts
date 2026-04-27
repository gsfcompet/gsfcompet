import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type Match = {
  id: string;
  competition_id: string;
  home_competition_player_id: string | null;
  away_competition_player_id: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

type CompetitionPlayer = {
  id: string;
  player_id: string;
};

type Player = {
  id: string;
  user_id: string | null;
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

function isValidScore(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0;
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

    const homeScore = Number(body.homeScore);
    const awayScore = Number(body.awayScore);

    if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
      return NextResponse.json(
        { error: "Les scores doivent être des nombres entiers positifs." },
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
        { error: "Tu dois être connecté pour proposer un score." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const matchResult = await admin
      .from("matches")
      .select(
        "id, competition_id, home_competition_player_id, away_competition_player_id, status, home_score, away_score"
      )
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

    if (match.status === "completed") {
      return NextResponse.json(
        { error: "Ce match est déjà terminé." },
        { status: 400 }
      );
    }

    if (
      !match.home_competition_player_id ||
      !match.away_competition_player_id
    ) {
      return NextResponse.json(
        { error: "Ce match n’a pas encore deux participants définis." },
        { status: 400 }
      );
    }

    const playerResult = await admin
      .from("players")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (playerResult.error) {
      return NextResponse.json(
        { error: playerResult.error.message },
        { status: 500 }
      );
    }

    if (!playerResult.data) {
      return NextResponse.json(
        { error: "Aucune fiche joueur trouvée pour ton compte." },
        { status: 403 }
      );
    }

    const player = playerResult.data as Player;

    const participantsResult = await admin
      .from("competition_players")
      .select("id, player_id")
      .in("id", [
        match.home_competition_player_id,
        match.away_competition_player_id,
      ]);

    if (participantsResult.error) {
      return NextResponse.json(
        { error: participantsResult.error.message },
        { status: 500 }
      );
    }

    const participants =
      (participantsResult.data ?? []) as CompetitionPlayer[];

    const isParticipant = participants.some(
      (participant) => participant.player_id === player.id
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Tu ne participes pas à ce match." },
        { status: 403 }
      );
    }

    const updateResult = await admin
      .from("matches")
      .update({
        submitted_home_score: homeScore,
        submitted_away_score: awayScore,
        score_submitted_by: user.id,
        score_submitted_at: new Date().toISOString(),
        score_status: "pending",
      })
      .eq("id", match.id);

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Score proposé. En attente de validation admin.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}