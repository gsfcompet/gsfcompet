import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MemberRole = "member" | "admin";

type MemberBody = {
  action?: "create" | "update";
  member_id?: string;
  email?: string;
  password?: string;
  username?: string | null;
  role?: MemberRole;
  pays?: string | null;
  numero_maillot?: number | string | null;
  player_name?: string | null;
  ea_name?: string | null;
  platform?: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanRole(value: unknown): MemberRole {
  return value === "admin" ? "admin" : "member";
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0 || number > 99) {
    return 0;
  }

  return number;
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

  if (profileResult.data.role !== "admin") {
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

    const [profilesResult, playersResult, registrationsResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, username, role, pays, numero_maillot, created_at")
          .order("username", { ascending: true, nullsFirst: false }),

        supabase
          .from("players")
          .select("id, user_id, name, ea_name, platform")
          .order("name", { ascending: true }),

        supabase.from("competition_players").select("player_id"),
      ]);

    if (profilesResult.error) {
      return NextResponse.json(
        { error: profilesResult.error.message },
        { status: 500 }
      );
    }

    if (playersResult.error) {
      return NextResponse.json(
        { error: playersResult.error.message },
        { status: 500 }
      );
    }

    if (registrationsResult.error) {
      return NextResponse.json(
        { error: registrationsResult.error.message },
        { status: 500 }
      );
    }

    const profiles = profilesResult.data ?? [];
    const players = playersResult.data ?? [];
    const registrations = registrationsResult.data ?? [];

    const playerByUserId = new Map(
      players
        .filter((player) => player.user_id)
        .map((player) => [player.user_id as string, player])
    );

    const registrationCountByPlayerId = new Map<string, number>();

    registrations.forEach((registration) => {
      const playerId = registration.player_id;

      if (!playerId) return;

      registrationCountByPlayerId.set(
        playerId,
        (registrationCountByPlayerId.get(playerId) ?? 0) + 1
      );
    });

    const members = profiles.map((profile) => {
      const player = playerByUserId.get(profile.id) ?? null;

      return {
        ...profile,
        player,
        registrations_count: player
          ? registrationCountByPlayerId.get(player.id) ?? 0
          : 0,
      };
    });

    return NextResponse.json({
      members,
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
    const body = (await request.json()) as MemberBody;

    const action = body.action;

    if (action !== "create" && action !== "update") {
      return NextResponse.json(
        { error: "Action invalide." },
        { status: 400 }
      );
    }

    const cleanUsername = cleanText(body.username);
    const cleanPays = cleanText(body.pays) || "France";
    const cleanPlayerName = cleanText(body.player_name);
    const cleanEaName = cleanText(body.ea_name);
    const cleanPlatform = cleanText(body.platform);
    const cleanNumeroMaillot = cleanNumber(body.numero_maillot);
    const cleanMemberRole = cleanRole(body.role);

    if (action === "create") {
      const cleanEmail = cleanText(body.email)?.toLowerCase();
      const password = body.password || "";

      if (!cleanEmail) {
        return NextResponse.json(
          { error: "Email obligatoire." },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: "Le mot de passe doit contenir au moins 6 caractères." },
          { status: 400 }
        );
      }

      const createdUserResult = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: cleanUsername || cleanEmail,
        },
      });

      if (createdUserResult.error || !createdUserResult.data.user) {
        return NextResponse.json(
          {
            error:
              createdUserResult.error?.message ||
              "Erreur création utilisateur.",
          },
          { status: 500 }
        );
      }

      const createdUser = createdUserResult.data.user;

      const profileResult = await supabase.from("profiles").upsert(
        {
          id: createdUser.id,
          email: cleanEmail,
          username: cleanUsername || cleanEmail,
          role: cleanMemberRole,
          pays: cleanPays,
          numero_maillot: cleanNumeroMaillot,
        },
        { onConflict: "id" }
      );

      if (profileResult.error) {
        return NextResponse.json(
          { error: profileResult.error.message },
          { status: 500 }
        );
      }

      const playerResult = await supabase.from("players").insert({
        user_id: createdUser.id,
        name: cleanPlayerName || cleanUsername || cleanEmail,
        ea_name: cleanEaName || cleanUsername || cleanEmail,
        platform: cleanPlatform || "PC",
      });

      if (playerResult.error) {
        return NextResponse.json(
          { error: playerResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Membre créé avec succès ✅",
      });
    }

    const memberId = body.member_id;

    if (!memberId) {
      return NextResponse.json(
        { error: "ID membre manquant." },
        { status: 400 }
      );
    }

    const profileUpdateResult = await supabase
      .from("profiles")
      .update({
        username: cleanUsername,
        role: cleanMemberRole,
        pays: cleanPays,
        numero_maillot: cleanNumeroMaillot,
      })
      .eq("id", memberId);

    if (profileUpdateResult.error) {
      return NextResponse.json(
        { error: profileUpdateResult.error.message },
        { status: 500 }
      );
    }

    await supabase.auth.admin.updateUserById(memberId, {
      user_metadata: {
        username: cleanUsername,
      },
    });

    const existingPlayerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", memberId)
      .maybeSingle();

    if (existingPlayerResult.error) {
      return NextResponse.json(
        { error: existingPlayerResult.error.message },
        { status: 500 }
      );
    }

    if (existingPlayerResult.data) {
      const updatePlayerResult = await supabase
        .from("players")
        .update({
          name: cleanPlayerName || cleanUsername || "Joueur",
          ea_name: cleanEaName || cleanUsername || "Joueur",
          platform: cleanPlatform || "PC",
        })
        .eq("id", existingPlayerResult.data.id);

      if (updatePlayerResult.error) {
        return NextResponse.json(
          { error: updatePlayerResult.error.message },
          { status: 500 }
        );
      }
    } else {
      const insertPlayerResult = await supabase.from("players").insert({
        user_id: memberId,
        name: cleanPlayerName || cleanUsername || "Joueur",
        ea_name: cleanEaName || cleanUsername || "Joueur",
        platform: cleanPlatform || "PC",
      });

      if (insertPlayerResult.error) {
        return NextResponse.json(
          { error: insertPlayerResult.error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Membre modifié avec succès ✅",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
