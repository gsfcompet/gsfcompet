import { CompetitionPlayer, EaTeam, Player, Profile } from "../types";

export function buildSafeProfile(
  profile: Profile | null,
  player: Player | null,
  regs: CompetitionPlayer[],
  eaTeams: EaTeam[],
  stats: any
) {
  const reg = regs[0] ?? null;
  const team = reg?.ea_team_id ? eaTeams.find((t) => t.id === reg.ea_team_id) : null;

  return {
    pseudo: profile?.pseudo || profile?.username || player?.ea_name || player?.name || "Membre",
    role: profile?.role || "member",
    jerseyNumber: profile?.numero_maillot ?? 0,
    plateforme: player?.platform || profile?.plateforme || "PC",
    pays: team?.country || profile?.pays || "FR",
    equipeEAFC: reg?.ea_team_name || team?.name || profile?.equipe_ea || "Sans équipe",
    avatarUrl: profile?.avatarUrl || profile?.avatar_url || null,
    ...stats,
  };
}
