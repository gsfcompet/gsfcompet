import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Utilisateur non connecté." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Configuration serveur Supabase incomplète." },
      { status: 500 }
    );
  }

  const adminSupabase = createSupabaseAdminClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: player } = await adminSupabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (player) {
    const { data: registrations } = await adminSupabase
      .from("competition_players")
      .select("id")
      .eq("player_id", player.id);

    const registrationIds = registrations?.map((item) => item.id) ?? [];

    if (registrationIds.length > 0) {
      await adminSupabase
        .from("matches")
        .delete()
        .in("home_competition_player_id", registrationIds);

      await adminSupabase
        .from("matches")
        .delete()
        .in("away_competition_player_id", registrationIds);

      await adminSupabase
        .from("competition_players")
        .delete()
        .in("id", registrationIds);
    }

    await adminSupabase.from("players").delete().eq("id", player.id);
  }

  await adminSupabase.from("profiles").delete().eq("id", user.id);

  const { error: deleteUserError } =
    await adminSupabase.auth.admin.deleteUser(user.id, false);

  if (deleteUserError) {
    return NextResponse.json(
      { error: deleteUserError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}