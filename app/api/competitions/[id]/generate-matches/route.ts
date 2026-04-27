import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string;
};

type Match = {
  id: string;
  competition_id: string;
  home_competition_player_id: string | null;
  away_competition_player_id: string | null;
};

function createPairKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: competitionId } = await context.params;

    if (!competitionId) {
      return NextResponse.json(
        { error: "ID compétition manquant." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const competitionResult = await supabase
      .from("competitions")
      .select("id, name, participant_type")
      .eq("id", competitionId)
      .maybeSingle();

    if (competitionResult.error) {
      return NextResponse.json(
        { error: competitionResult.error.message },
        { status: 500 }
      );
    }

    if (!competitionResult.data) {
      return NextResponse.json(
        { error: "Compétition introuvable." },
        { status: 404 }
      );
    }

    const registrationsResult = await supabase
      .from("competition_players")
      .select("*")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true });

    if (registrationsResult.error) {
      return NextResponse.json(
        { error: registrationsResult.error.message },
        { status: 500 }
      );
    }

    const registrations =
      (registrationsResult.data ?? []) as CompetitionPlayer[];

    if (registrations.length < 2) {
      return NextResponse.json({
        success: true,
        created: 0,
        message: "Pas assez de participants pour créer des matchs.",
      });
    }

    const matchesResult = await supabase
      .from("matches")
      .select(
        "id, competition_id, home_competition_player_id, away_competition_player_id"
      )
      .eq("competition_id", competitionId);

    if (matchesResult.error) {
      return NextResponse.json(
        { error: matchesResult.error.message },
        { status: 500 }
      );
    }

    const existingMatches = (matchesResult.data ?? []) as Match[];

    const existingPairKeys = new Set<string>();

    for (const match of existingMatches) {
      if (
        match.home_competition_player_id &&
        match.away_competition_player_id
      ) {
        existingPairKeys.add(
          createPairKey(
            match.home_competition_player_id,
            match.away_competition_player_id
          )
        );
      }
    }

    const matchesToCreate = [];

    for (let i = 0; i < registrations.length; i++) {
      for (let j = i + 1; j < registrations.length; j++) {
        const homeRegistration = registrations[i];
        const awayRegistration = registrations[j];

        const pairKey = createPairKey(
          homeRegistration.id,
          awayRegistration.id
        );

        if (existingPairKeys.has(pairKey)) continue;

        matchesToCreate.push({
          competition_id: competitionId,
          home_competition_player_id: homeRegistration.id,
          away_competition_player_id: awayRegistration.id,
          home_team_id: null,
          away_team_id: null,
          match_date: null,
          status: "planned",
          home_score: null,
          away_score: null,
          mvp: null,
        });
      }
    }

    if (matchesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        message: "Tous les matchs existent déjà.",
      });
    }

    const insertResult = await supabase.from("matches").insert(matchesToCreate);

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: matchesToCreate.length,
      message: `${matchesToCreate.length} match(s) créé(s).`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}