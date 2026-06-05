import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageTeams } from "@/lib/roles";

type TeamAction =
  | "create_team"
  | "update_team"
  | "delete_team"
  | "add_member"
  | "remove_member"
  | "update_member_role"
  | "register_competition"
  | "unregister_competition";

type TeamRole = "manager" | "captain" | "player";

type RequestBody = {
  action?: TeamAction;
  team_id?: string;
  name?: string | null;
  manager?: string | null;
  player_id?: string;
  role?: TeamRole;
  competition_id?: string;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanRole(value: unknown): TeamRole {
  if (value === "manager") return "manager";
  if (value === "captain") return "captain";

  return "player";
}

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

  if (!canManageTeams(profileResult.data.role)) {
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

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;

    const [
      teamsResult,
      playersResult,
      teamMembersResult,
      competitionTeamsResult,
      competitionsResult,
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true }),

      supabase
        .from("players")
        .select("id, user_id, name, ea_name, platform")
        .order("name", { ascending: true }),

      supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: true }),

      supabase
        .from("competition_teams")
        .select("*")
        .order("created_at", { ascending: true }),

      supabase
        .from("competitions")
        .select("id, name, season, status, participant_type")
        .eq("participant_type", "teams")
        .order("created_at", { ascending: false }),
    ]);

    if (teamsResult.error) {
      return NextResponse.json(
        { error: teamsResult.error.message },
        { status: 500 }
      );
    }

    if (playersResult.error) {
      return NextResponse.json(
        { error: playersResult.error.message },
        { status: 500 }
      );
    }

    if (teamMembersResult.error) {
      return NextResponse.json(
        { error: teamMembersResult.error.message },
        { status: 500 }
      );
    }

    if (competitionTeamsResult.error) {
      return NextResponse.json(
        { error: competitionTeamsResult.error.message },
        { status: 500 }
      );
    }

    if (competitionsResult.error) {
      return NextResponse.json(
        { error: competitionsResult.error.message },
        { status: 500 }
      );
    }

    const players = playersResult.data ?? [];

    const profileIds = Array.from(
      new Set(
        players
          .map((player) => player.user_id)
          .filter(Boolean) as string[]
      )
    );

    let profiles: {
      id: string;
      email: string | null;
      username: string | null;
      pays: string | null;
    }[] = [];

    if (profileIds.length > 0) {
      const profilesResult = await supabase
        .from("profiles")
        .select("id, email, username, pays")
        .in("id", profileIds);

      if (!profilesResult.error) {
        profiles = profilesResult.data ?? [];
      }
    }

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const members = players.map((player) => {
      const profile = player.user_id ? profileById.get(player.user_id) : null;

      return {
        player_id: player.id,
        profile_id: player.user_id,
        name: player.name,
        ea_name: player.ea_name,
        platform: player.platform,
        username: profile?.username ?? null,
        email: profile?.email ?? null,
        pays: profile?.pays ?? null,
      };
    });

    return NextResponse.json({
      teams: teamsResult.data ?? [],
      members,
      team_members: teamMembersResult.data ?? [],
      competition_teams: competitionTeamsResult.data ?? [],
      competitions: competitionsResult.data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;
    const body = (await request.json()) as RequestBody;

    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { error: "Action manquante." },
        { status: 400 }
      );
    }

    const teamId = body.team_id;
    const playerId = body.player_id;
    const competitionId = body.competition_id;

    if (action === "create_team") {
      const name = cleanText(body.name);
      const manager = cleanText(body.manager);

      if (!name) {
        return NextResponse.json(
          { error: "Nom de team obligatoire." },
          { status: 400 }
        );
      }

      const insertResult = await supabase.from("teams").insert({
        name,
        manager,
      });

      if (insertResult.error) {
        return NextResponse.json(
          { error: insertResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Team esport créée ✅",
      });
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "ID team manquant." },
        { status: 400 }
      );
    }

    if (action === "update_team") {
      const name = cleanText(body.name);
      const manager = cleanText(body.manager);

      if (!name) {
        return NextResponse.json(
          { error: "Nom de team obligatoire." },
          { status: 400 }
        );
      }

      const updateResult = await supabase
        .from("teams")
        .update({
          name,
          manager,
        })
        .eq("id", teamId);

      if (updateResult.error) {
        return NextResponse.json(
          { error: updateResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Team esport modifiée ✅",
      });
    }

    if (action === "delete_team") {
      const deleteMatchesResult = await supabase
        .from("matches")
        .delete()
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

      if (deleteMatchesResult.error) {
        return NextResponse.json(
          { error: deleteMatchesResult.error.message },
          { status: 500 }
        );
      }

      const deleteCompetitionTeamsResult = await supabase
        .from("competition_teams")
        .delete()
        .eq("team_id", teamId);

      if (deleteCompetitionTeamsResult.error) {
        return NextResponse.json(
          { error: deleteCompetitionTeamsResult.error.message },
          { status: 500 }
        );
      }

      const deleteMembersResult = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId);

      if (deleteMembersResult.error) {
        return NextResponse.json(
          { error: deleteMembersResult.error.message },
          { status: 500 }
        );
      }

      const deleteTeamResult = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (deleteTeamResult.error) {
        return NextResponse.json(
          { error: deleteTeamResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Team esport supprimée ✅",
      });
    }

    if (action === "add_member") {
      if (!playerId) {
        return NextResponse.json(
          { error: "Membre à rattacher manquant." },
          { status: 400 }
        );
      }

      const role = cleanRole(body.role);

      const upsertResult = await supabase.from("team_members").upsert(
        {
          team_id: teamId,
          player_id: playerId,
          role,
        },
        {
          onConflict: "team_id,player_id",
        }
      );

      if (upsertResult.error) {
        return NextResponse.json(
          { error: upsertResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Membre rattaché à la team ✅",
      });
    }

    if (action === "remove_member") {
      if (!playerId) {
        return NextResponse.json(
          { error: "Membre à retirer manquant." },
          { status: 400 }
        );
      }

      const deleteResult = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("player_id", playerId);

      if (deleteResult.error) {
        return NextResponse.json(
          { error: deleteResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Membre retiré de la team ✅",
      });
    }

    if (action === "update_member_role") {
      if (!playerId) {
        return NextResponse.json(
          { error: "Membre à modifier manquant." },
          { status: 400 }
        );
      }

      const role = cleanRole(body.role);

      const updateResult = await supabase
        .from("team_members")
        .update({ role })
        .eq("team_id", teamId)
        .eq("player_id", playerId);

      if (updateResult.error) {
        return NextResponse.json(
          { error: updateResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Rôle du membre modifié ✅",
      });
    }

    if (action === "register_competition") {
      if (!competitionId) {
        return NextResponse.json(
          { error: "Compétition manquante." },
          { status: 400 }
        );
      }

      const upsertResult = await supabase.from("competition_teams").upsert(
        {
          competition_id: competitionId,
          team_id: teamId,
        },
        {
          onConflict: "competition_id,team_id",
        }
      );

      if (upsertResult.error) {
        return NextResponse.json(
          { error: upsertResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Team inscrite à la compétition ✅",
      });
    }

    if (action === "unregister_competition") {
      if (!competitionId) {
        return NextResponse.json(
          { error: "Compétition manquante." },
          { status: 400 }
        );
      }

      const deleteMatchesResult = await supabase
        .from("matches")
        .delete()
        .eq("competition_id", competitionId)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

      if (deleteMatchesResult.error) {
        return NextResponse.json(
          { error: deleteMatchesResult.error.message },
          { status: 500 }
        );
      }

      const deleteResult = await supabase
        .from("competition_teams")
        .delete()
        .eq("competition_id", competitionId)
        .eq("team_id", teamId);

      if (deleteResult.error) {
        return NextResponse.json(
          { error: deleteResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Team retirée de la compétition ✅",
      });
    }

    return NextResponse.json(
      { error: "Action inconnue." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
