import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageTeams } from "@/lib/roles";

type RequestBody = {
  profile_id?: string;
  player_name?: string;
  ea_name?: string | null;
  platform?: string | null;
  ea_team_id?: string;
  registration_id?: string;
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
      userId: null,
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
      userId: null,
    };
  }

  const userId = userResult.data.user.id;

  const profileResult = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return {
      ok: false as const,
      status: 403,
      error: "Profil admin introuvable.",
      supabase: null,
      userId: null,
    };
  }

  if (!canManageTeams(profileResult.data.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "Accès réservé aux administrateurs.",
      supabase: null,
      userId: null,
    };
  }

  return {
    ok: true as const,
    supabase,
    userId,
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

    const { id: competitionId } = await context.params;
    const body = (await request.json()) as RequestBody;

    const profileId = body.profile_id;
    const playerName = body.player_name?.trim();
    const eaName = body.ea_name?.trim() || null;
    const platform = body.platform || null;
    const eaTeamId = body.ea_team_id;
    const editingRegistrationId = body.registration_id || null;

    if (!competitionId) {
      return NextResponse.json(
        { error: "ID compétition manquant." },
        { status: 400 }
      );
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "Membre manquant." },
        { status: 400 }
      );
    }

    if (!playerName) {
      return NextResponse.json(
        { error: "Nom joueur manquant." },
        { status: 400 }
      );
    }

    if (!eaTeamId) {
      return NextResponse.json(
        { error: "Équipe EA FC manquante." },
        { status: 400 }
      );
    }

    const supabase = auth.supabase;

    const competitionResult = await supabase
      .from("competitions")
      .select("id")
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

    const profileResult = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", profileId)
      .maybeSingle();

    if (profileResult.error) {
      return NextResponse.json(
        { error: profileResult.error.message },
        { status: 500 }
      );
    }

    if (!profileResult.data) {
      return NextResponse.json(
        { error: "Profil membre introuvable." },
        { status: 404 }
      );
    }

    const eaTeamResult = await supabase
      .from("ea_teams")
      .select("id, name")
      .eq("id", eaTeamId)
      .maybeSingle();

    if (eaTeamResult.error) {
      return NextResponse.json(
        { error: eaTeamResult.error.message },
        { status: 500 }
      );
    }

    if (!eaTeamResult.data) {
      return NextResponse.json(
        { error: "Équipe EA FC introuvable." },
        { status: 404 }
      );
    }

    const existingPlayerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", profileId)
      .maybeSingle();

    if (existingPlayerResult.error) {
      return NextResponse.json(
        { error: existingPlayerResult.error.message },
        { status: 500 }
      );
    }

    let playerId: string;

    if (existingPlayerResult.data) {
      const updatePlayerResult = await supabase
        .from("players")
        .update({
          name: playerName,
          ea_name: eaName,
          platform,
        })
        .eq("id", existingPlayerResult.data.id)
        .select("id")
        .single();

      if (updatePlayerResult.error) {
        return NextResponse.json(
          { error: updatePlayerResult.error.message },
          { status: 500 }
        );
      }

      playerId = updatePlayerResult.data.id;
    } else {
      const insertPlayerResult = await supabase
        .from("players")
        .insert({
          user_id: profileId,
          name: playerName,
          ea_name: eaName,
          platform,
        })
        .select("id")
        .single();

      if (insertPlayerResult.error) {
        return NextResponse.json(
          { error: insertPlayerResult.error.message },
          { status: 500 }
        );
      }

      playerId = insertPlayerResult.data.id;
    }

    const existingRegistrationResult = await supabase
      .from("competition_players")
      .select("*")
      .eq("competition_id", competitionId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (existingRegistrationResult.error) {
      return NextResponse.json(
        { error: existingRegistrationResult.error.message },
        { status: 500 }
      );
    }

    const registrationId =
      existingRegistrationResult.data?.id || editingRegistrationId;

    if (registrationId) {
      const updateRegistrationResult = await supabase
        .from("competition_players")
        .update({
          player_id: playerId,
          ea_team_id: eaTeamResult.data.id,
          ea_team_name: eaTeamResult.data.name,
        })
        .eq("id", registrationId)
        .eq("competition_id", competitionId)
        .select("*")
        .single();

      if (updateRegistrationResult.error) {
        return NextResponse.json(
          { error: updateRegistrationResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: "updated",
        message: "Participant modifié ✅",
      });
    }

    const insertRegistrationResult = await supabase
      .from("competition_players")
      .insert({
        competition_id: competitionId,
        player_id: playerId,
        ea_team_id: eaTeamResult.data.id,
        ea_team_name: eaTeamResult.data.name,
      })
      .select("*")
      .single();

    if (insertRegistrationResult.error) {
      return NextResponse.json(
        { error: insertRegistrationResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "created",
      message: "Participant ajouté à la compétition ✅",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: competitionId } = await context.params;
    const body = (await request.json()) as RequestBody;
    const registrationId = body.registration_id;

    if (!competitionId) {
      return NextResponse.json(
        { error: "ID compétition manquant." },
        { status: 400 }
      );
    }

    if (!registrationId) {
      return NextResponse.json(
        { error: "ID participant manquant." },
        { status: 400 }
      );
    }

    const supabase = auth.supabase;

    const deleteMatchesResult = await supabase
      .from("matches")
      .delete()
      .eq("competition_id", competitionId)
      .or(
        `home_competition_player_id.eq.${registrationId},away_competition_player_id.eq.${registrationId}`
      );

    if (deleteMatchesResult.error) {
      return NextResponse.json(
        { error: deleteMatchesResult.error.message },
        { status: 500 }
      );
    }

    const deleteRegistrationResult = await supabase
      .from("competition_players")
      .delete()
      .eq("id", registrationId)
      .eq("competition_id", competitionId);

    if (deleteRegistrationResult.error) {
      return NextResponse.json(
        { error: deleteRegistrationResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Participant retiré de la compétition ✅",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
