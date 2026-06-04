import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CompetitionAction = "create" | "update" | "delete";

type CompetitionBody = {
  action?: CompetitionAction;
  competition_id?: string;
  name?: string;
  type?: string;
  season?: string | null;
  status?: string;
  participant_type?: "teams" | "players";
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
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

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = auth.supabase;
    const body = (await request.json()) as CompetitionBody;

    const action = body.action;

    if (action !== "create" && action !== "update" && action !== "delete") {
      return NextResponse.json(
        { error: "Action compétition invalide." },
        { status: 400 }
      );
    }

    if (action === "delete") {
      if (!body.competition_id) {
        return NextResponse.json(
          { error: "ID compétition manquant." },
          { status: 400 }
        );
      }

      const deleteResult = await supabase
        .from("competitions")
        .delete()
        .eq("id", body.competition_id);

      if (deleteResult.error) {
        return NextResponse.json(
          { error: deleteResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Compétition supprimée ✅",
      });
    }

    const name = cleanText(body.name);
    const type = cleanText(body.type) || "league";
    const season = cleanText(body.season);
    const status = cleanText(body.status) || "planned";
    const participantType =
      body.participant_type === "teams" ? "teams" : "players";

    if (!name) {
      return NextResponse.json(
        { error: "Nom de compétition obligatoire." },
        { status: 400 }
      );
    }

    const payload = {
      name,
      type,
      season,
      status,
      participant_type: participantType,
    };

    if (action === "create") {
      const insertResult = await supabase.from("competitions").insert(payload);

      if (insertResult.error) {
        return NextResponse.json(
          { error: insertResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Compétition créée ✅",
      });
    }

    if (!body.competition_id) {
      return NextResponse.json(
        { error: "ID compétition manquant." },
        { status: 400 }
      );
    }

    const updateResult = await supabase
      .from("competitions")
      .update(payload)
      .eq("id", body.competition_id);

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Compétition modifiée ✅",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
