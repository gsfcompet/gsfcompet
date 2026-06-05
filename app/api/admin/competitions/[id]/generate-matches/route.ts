import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageCompetitions } from "@/lib/roles";

type Competition = {
  id: string;
  name: string;
  participant_type: "players" | "teams";
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
};

type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_id: string;
};

type MatchRow = {
  id: string;
  competition_id: string;

  home_competition_player_id: string | null;
  away_competition_player_id: string | null;

  home_team_id: string | null;
  away_team_id: string | null;
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

  if (!canManageCompetitions(profileResult.data.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "Accès réservé aux administrateurs.",
      supabase: null,
    };
  }

  return {
    ok: true as const,
    supabase,
  };
}

function buildRoundTripPairs<T extends { id: string }>(participants: T[]) {
  const pairs: { home: T; away: T }[] = [];

  for (let i = 0; i < participants.length; i += 1) {
    for (let j = i + 1; j < participants.length; j += 1) {
      pairs.push({
        home: participants[i],
        away: participants[j],
      });

      pairs.push({
        home: participants[j],
        away: participants[i],
      });
    }
  }

  return pairs;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;
    const params = await context.params;
    const competitionId = params.id;

    if (!competitionId) {
      return NextResponse.json(
        { error: "ID compétition manquant." },
        { status: 400 }
      );
    }

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

    const competition = competitionResult.data as Competition;

    const existingMatchesResult = await supabase
      .from("matches")
      .select(
        "id, competition_id, home_competition_player_id, away_competition_player_id, home_team_id, away_team_id"
      )
      .eq("competition_id", competitionId);

    if (existingMatchesResult.error) {
      return NextResponse.json(
        { error: existingMatchesResult.error.message },
        { status: 500 }
      );
    }

    const existingMatches = (existingMatchesResult.data ?? []) as MatchRow[];

    if (competition.participant_type === "teams") {
      const competitionTeamsResult = await supabase
        .from("competition_teams")
        .select("id, competition_id, team_id")
        .eq("competition_id", competitionId)
        .order("created_at", { ascending: true });

      if (competitionTeamsResult.error) {
        return NextResponse.json(
          { error: competitionTeamsResult.error.message },
          { status: 500 }
        );
      }

      const competitionTeams =
        (competitionTeamsResult.data ?? []) as CompetitionTeam[];

      const uniqueTeams = Array.from(
        new Map(
          competitionTeams.map((competitionTeam) => [
            competitionTeam.team_id,
            competitionTeam,
          ])
        ).values()
      );

      if (uniqueTeams.length < 2) {
        return NextResponse.json(
          {
            error:
              "Il faut au moins 2 teams inscrites à cette compétition pour générer les matchs.",
          },
          { status: 400 }
        );
      }

      const existingTeamMatchKeys = new Set(
        existingMatches
          .filter((match) => match.home_team_id && match.away_team_id)
          .map((match) => `${match.home_team_id}:${match.away_team_id}`)
      );

      const pairs = buildRoundTripPairs(uniqueTeams);

      const rowsToInsert = pairs
        .filter((pair) => {
          const key = `${pair.home.team_id}:${pair.away.team_id}`;
          return !existingTeamMatchKeys.has(key);
        })
        .map((pair) => ({
          competition_id: competitionId,

          home_team_id: pair.home.team_id,
          away_team_id: pair.away.team_id,

          home_competition_player_id: null,
          away_competition_player_id: null,

          home_score: null,
          away_score: null,
          match_date: null,
          status: "planned",
        }));

      if (rowsToInsert.length === 0) {
        return NextResponse.json({
          success: true,
          created: 0,
          message: "Tous les matchs entre teams existent déjà ✅",
        });
      }

      const insertResult = await supabase.from("matches").insert(rowsToInsert);

      if (insertResult.error) {
        return NextResponse.json(
          { error: insertResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        created: rowsToInsert.length,
        message: `${rowsToInsert.length} match(s) teams généré(s) ✅`,
      });
    }

    const competitionPlayersResult = await supabase
      .from("competition_players")
      .select("id, competition_id, player_id")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true });

    if (competitionPlayersResult.error) {
      return NextResponse.json(
        { error: competitionPlayersResult.error.message },
        { status: 500 }
      );
    }

    const competitionPlayers =
      (competitionPlayersResult.data ?? []) as CompetitionPlayer[];

    const uniquePlayers = Array.from(
      new Map(
        competitionPlayers.map((competitionPlayer) => [
          competitionPlayer.player_id,
          competitionPlayer,
        ])
      ).values()
    );

    if (uniquePlayers.length < 2) {
      return NextResponse.json(
        {
          error:
            "Il faut au moins 2 joueurs inscrits à cette compétition pour générer les matchs.",
        },
        { status: 400 }
      );
    }

    const existingPlayerMatchKeys = new Set(
      existingMatches
        .filter(
          (match) =>
            match.home_competition_player_id &&
            match.away_competition_player_id
        )
        .map(
          (match) =>
            `${match.home_competition_player_id}:${match.away_competition_player_id}`
        )
    );

    const pairs = buildRoundTripPairs(uniquePlayers);

    const rowsToInsert = pairs
      .filter((pair) => {
        const key = `${pair.home.id}:${pair.away.id}`;
        return !existingPlayerMatchKeys.has(key);
      })
      .map((pair) => ({
        competition_id: competitionId,

        home_competition_player_id: pair.home.id,
        away_competition_player_id: pair.away.id,

        home_team_id: null,
        away_team_id: null,

        home_score: null,
        away_score: null,
        match_date: null,
        status: "planned",
      }));

    if (rowsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        message: "Tous les matchs entre joueurs existent déjà ✅",
      });
    }

    const insertResult = await supabase.from("matches").insert(rowsToInsert);

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: rowsToInsert.length,
      message: `${rowsToInsert.length} match(s) joueurs généré(s) ✅`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
