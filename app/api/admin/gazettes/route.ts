import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageGazette } from "@/lib/roles";

export const runtime = "nodejs";

type GazetteStatus = "draft" | "published" | "archived";
type GazetteAction = "create" | "update" | "delete" | "status";

type GazetteBody = {
  action?: GazetteAction;
  id?: string;
  title?: string;
  description?: string | null;
  periodDate?: string | null;
  status?: GazetteStatus;
  fileUrl?: string | null;
  filePath?: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanStatus(value: unknown): GazetteStatus {
  if (value === "published" || value === "archived" || value === "draft") {
    return value;
  }

  return "draft";
}

function getYearFromPeriodDate(value: string | null) {
  if (!value) return null;

  const year = Number(value.slice(0, 4));

  return Number.isNaN(year) ? null : year;
}

function getMonthNameFromPeriodDate(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
  }).format(date);
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

  if (!canManageGazette(profileResult.data.role)) {
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
    const body = (await request.json()) as GazetteBody;

    const action = body.action;

    if (
      action !== "create" &&
      action !== "update" &&
      action !== "delete" &&
      action !== "status"
    ) {
      return NextResponse.json(
        { error: "Action gazette invalide." },
        { status: 400 }
      );
    }

    const gazetteId = cleanText(body.id);
    const status = cleanStatus(body.status);

    if (action === "delete") {
      if (!gazetteId) {
        return NextResponse.json(
          { error: "ID gazette manquant." },
          { status: 400 }
        );
      }

      const existingResult = await supabase
        .from("gazettes")
        .select("file_path")
        .eq("id", gazetteId)
        .maybeSingle();

      if (existingResult.data?.file_path) {
        await supabase.storage
          .from("gazettes")
          .remove([existingResult.data.file_path]);
      }

      const deleteResult = await supabase
        .from("gazettes")
        .delete()
        .eq("id", gazetteId);

      if (deleteResult.error) {
        return NextResponse.json(
          { error: deleteResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Gazette supprimée ✅",
      });
    }

    if (action === "status") {
      if (!gazetteId) {
        return NextResponse.json(
          { error: "ID gazette manquant." },
          { status: 400 }
        );
      }

      const updateResult = await supabase
        .from("gazettes")
        .update({
          status,
          published_at: status === "published" ? new Date().toISOString() : null,
        })
        .eq("id", gazetteId);

      if (updateResult.error) {
        return NextResponse.json(
          { error: updateResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Statut modifié ✅",
      });
    }

    const title = cleanText(body.title);
    const description = cleanText(body.description);
    const periodDate = cleanText(body.periodDate);
    const fileUrl = cleanText(body.fileUrl);
    const filePath = cleanText(body.filePath);

    if (!title) {
      return NextResponse.json(
        { error: "Titre de gazette obligatoire." },
        { status: 400 }
      );
    }

    if (!periodDate) {
      return NextResponse.json(
        { error: "Date de période obligatoire." },
        { status: 400 }
      );
    }

    if (action === "create") {
      if (!fileUrl || !filePath) {
        return NextResponse.json(
          { error: "PDF obligatoire pour ajouter une gazette." },
          { status: 400 }
        );
      }

      const insertResult = await supabase.from("gazettes").insert({
        title,
        description,
        month: getMonthNameFromPeriodDate(periodDate),
        year: getYearFromPeriodDate(periodDate),
        period_date: periodDate,
        status,
        file_url: fileUrl,
        file_path: filePath,
        published_at: status === "published" ? new Date().toISOString() : null,
      });

      if (insertResult.error) {
        await supabase.storage.from("gazettes").remove([filePath]);

        return NextResponse.json(
          { error: insertResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Gazette ajoutée ✅",
      });
    }

    if (!gazetteId) {
      return NextResponse.json(
        { error: "ID gazette manquant." },
        { status: 400 }
      );
    }

    const existingResult = await supabase
      .from("gazettes")
      .select("file_path, file_url, published_at")
      .eq("id", gazetteId)
      .maybeSingle();

    if (existingResult.error || !existingResult.data) {
      return NextResponse.json(
        { error: "Gazette introuvable." },
        { status: 404 }
      );
    }

    const nextFileUrl = fileUrl || existingResult.data.file_url;
    const nextFilePath = filePath || existingResult.data.file_path;

    const updateResult = await supabase
      .from("gazettes")
      .update({
        title,
        description,
        month: getMonthNameFromPeriodDate(periodDate),
        year: getYearFromPeriodDate(periodDate),
        period_date: periodDate,
        status,
        file_url: nextFileUrl,
        file_path: nextFilePath,
        published_at:
          status === "published"
            ? existingResult.data.published_at || new Date().toISOString()
            : existingResult.data.published_at,
      })
      .eq("id", gazetteId);

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message },
        { status: 500 }
      );
    }

    if (
      filePath &&
      existingResult.data.file_path &&
      filePath !== existingResult.data.file_path
    ) {
      await supabase.storage
        .from("gazettes")
        .remove([existingResult.data.file_path]);
    }

    return NextResponse.json({
      success: true,
      message: "Gazette modifiée ✅",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inconnue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
