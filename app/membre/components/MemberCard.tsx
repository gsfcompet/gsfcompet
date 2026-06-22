"use client";

import FutMemberCard from "@/components/FutMemberCard";
import type {
  CompetitionPlayer,
  EaTeam,
  Player,
  Profile,
} from "../types";

type AnyRecord = Record<string, unknown>;

type MemberStats = Record<string, number | string | null | undefined>;

type MemberCardProps = {
  profile: (Profile & AnyRecord) | null;
  player?: Player | null;
  stats?: MemberStats | null;
  registrations?: CompetitionPlayer[];
  eaTeams?: EaTeam[];
};

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function getActiveRegistration(
  registrations: CompetitionPlayer[] = []
): CompetitionPlayer | null {
  return (
    registrations.find((registration) => registration.ea_team_id) ??
    registrations.find((registration) => registration.ea_team_name) ??
    registrations[0] ??
    null
  );
}

function getActiveEaTeam(
  eaTeams: EaTeam[] = [],
  activeRegistration: CompetitionPlayer | null
): EaTeam | null {
  if (!activeRegistration) {
    return null;
  }

  return (
    eaTeams.find((team) => team.id === activeRegistration.ea_team_id) ??
    eaTeams.find((team) => team.name === activeRegistration.ea_team_name) ??
    null
  );
}

export function MemberCard({
  profile,
  player,
  stats,
  registrations = [],
  eaTeams = [],
}: MemberCardProps) {
  const profileData = (profile ?? {}) as AnyRecord;
  const playerData = (player ?? {}) as AnyRecord;

  const activeRegistration = getActiveRegistration(registrations);
  const activeEaTeam = getActiveEaTeam(eaTeams, activeRegistration);

  const activeRegistrationData = (activeRegistration ?? {}) as AnyRecord;
  const activeEaTeamData = (activeEaTeam ?? {}) as AnyRecord;

  /**
   * IMPORTANT :
   * Cette valeur doit venir du membre, jamais du club.
   * Donc on ne met PAS activeEaTeam.country ici.
   */
  const memberNationality = pickString(
    profileData.pays_membre,
    profileData.paysMembre,
    profileData.member_country,
    profileData.memberCountry,
    profileData.member_country_code,
    profileData.memberCountryCode,
    profileData.country_member,
    profileData.countryMember,
    profileData.nationality,
    profileData.nationality_code,
    profileData.nationalityCode,
    profileData.pays,
    "France"
  );

  const platform = pickString(
    playerData.platform,
    profileData.plateforme,
    profileData.platform,
    "PC"
  );

  const eaTeamName = pickString(
    activeRegistrationData.ea_team_name,
    activeRegistrationData.eaTeamName,
    activeRegistrationData.team_name,
    activeRegistrationData.teamName,
    activeEaTeamData.name,
    activeEaTeamData.team_name,
    activeEaTeamData.teamName,
    profileData.equipe_ea,
    profileData.ea_team,
    profileData.eaTeamName,
    "Équipe non définie"
  );

  const championshipName = pickString(
    activeEaTeamData.league_name,
    activeEaTeamData.leagueName,
    activeEaTeamData.league,
    activeRegistrationData.league_name,
    activeRegistrationData.leagueName,
    activeRegistrationData.league,
    profileData.championnat,
    profileData.leagueName,
    profileData.league,
    activeEaTeamData.country,
    "Non défini"
  );

  const eaTeamCountry = pickString(
    activeEaTeamData.country,
    activeEaTeamData.country_name,
    activeEaTeamData.countryName
  );

  return (
    <div className="w-full self-start rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-4 shadow-2xl shadow-black/50">
      <FutMemberCard
        profile={profile}
        player={player}
        stats={stats}
        registrations={registrations}
        eaTeams={eaTeams}
        memberCompetition={activeRegistration}
        eaTeam={activeEaTeam}
        platform={platform}
        plateforme={platform}
        pays_membre={memberNationality}
        paysMembre={memberNationality}
        memberCountry={memberNationality}
        countryMember={memberNationality}
        nationality={memberNationality}
        championnat={championshipName}
        championship={championshipName}
        championshipName={championshipName}
        league={championshipName}
        leagueName={championshipName}
        ea_team_name={eaTeamName}
        eaTeamName={eaTeamName}
        team_name={eaTeamName}
        teamName={eaTeamName}
        club={eaTeamName}
        equipe_ea={eaTeamName}
        ea_team_country={eaTeamCountry}
        eaTeamCountry={eaTeamCountry}
        team_country={eaTeamCountry}
        teamCountry={eaTeamCountry}
      />
    </div>
  );
}
