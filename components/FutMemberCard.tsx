"use client";

import { normalizeRole, roleLabels } from "@/lib/roles";
import { useState, type ReactNode } from "react";

type AnyRecord = Record<string, unknown>;

type FutMemberCardProps = {
  profile?: AnyRecord | null;
  member?: AnyRecord | null;
  player?: AnyRecord | null;
  stats?: AnyRecord | null;
  className?: string;
  [key: string]: unknown;
};

type StatItem = {
  label: string;
  value: number;
  tone: "gold" | "green" | "orange" | "red";
};

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as AnyRecord;
}

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

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getPathValue(source: unknown, path: string): unknown {
  let current: unknown = source;

  for (const part of path.split(".")) {
    if (current == null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(part);

      if (Number.isInteger(index)) {
        current = current[index];
        continue;
      }

      current = current[0];
    }

    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as AnyRecord)[part];
  }

  return current;
}

function firstArrayItem(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.find((item) => item && typeof item === "object") ?? value[0];
}

function collectSources(record: AnyRecord, keys: string[]): unknown[] {
  return keys.map((key) => firstArrayItem(record[key])).filter(Boolean);
}

function pickDeepString(
  sources: unknown[],
  paths: string[],
  ...fallbacks: unknown[]
): string {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPathValue(source, path);
      const picked = pickString(value);

      if (picked) {
        return picked;
      }
    }
  }

  return pickString(...fallbacks);
}

function normalizeCountryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "-");
}

function getCountryCode(value: string): string {
  const cleaned = value.trim();

  if (!cleaned) {
    return "FR";
  }

  const key = normalizeCountryKey(cleaned);

  const map: Record<string, string> = {
    france: "FR",
    francais: "FR",
    french: "FR",
    angleterre: "GB",
    england: "GB",
    "grande-bretagne": "GB",
    greatbritain: "GB",
    "royaume-uni": "GB",
    royaumeuni: "GB",
    uk: "GB",
    espagne: "ES",
    spain: "ES",
    italie: "IT",
    italy: "IT",
    allemagne: "DE",
    germany: "DE",
    portugal: "PT",
    belgique: "BE",
    belgium: "BE",
    maroc: "MA",
    morocco: "MA",
    algerie: "DZ",
    algeria: "DZ",
    tunisie: "TN",
    tunisia: "TN",
    "pays-bas": "NL",
    netherlands: "NL",
  };

  if (map[key]) {
    return map[key];
  }

  if (cleaned.length <= 3) {
    return cleaned.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function getStatTone(label: string): StatItem["tone"] {
  if (label === "G") {
    return "green";
  }

  if (label === "P") {
    return "red";
  }

  if (label === "MJ") {
    return "orange";
  }

  return "gold";
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function CardText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`absolute z-20 flex items-center justify-center text-center font-black uppercase leading-none text-[#F7E9C5] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatValue({ item }: { item: StatItem }) {
  const toneClass =
    item.tone === "green"
      ? "text-[#4ADE80] drop-shadow-[0_0_8px_rgba(74,222,128,0.58)]"
      : item.tone === "red"
        ? "text-[#FB7185] drop-shadow-[0_0_8px_rgba(251,113,133,0.58)]"
        : item.tone === "orange"
          ? "text-[#F59E0B] drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]"
          : "text-[#F7D56D] drop-shadow-[0_0_8px_rgba(247,213,109,0.55)]";

  return (
    <span
      className={`block text-center text-[0.92rem] font-black leading-none ${toneClass}`}
    >
      {item.value}
    </span>
  );
}

function FlagImage({ countryCode }: { countryCode: string }) {
  const [hasError, setHasError] = useState(false);
  const code = countryCode.toLowerCase();

  if (hasError || !code) {
    return (
      <span className="text-[0.72rem] font-black tracking-[0.12em] text-[#F7D56D]">
        {countryCode}
      </span>
    );
  }

  return (
    <img
      src={`/flags/${code}.png`}
      alt={countryCode}
      className="h-[18px] w-[28px] rounded-[2px] border border-[#D9A441]/50 object-cover shadow-[0_0_7px_rgba(0,0,0,0.9)]"
      draggable={false}
      onError={() => setHasError(true)}
    />
  );
}

function getMemberCountryValue({
  direct,
  profileData,
  memberData,
  playerData,
}: {
  direct: AnyRecord;
  profileData: AnyRecord;
  memberData: AnyRecord;
  playerData: AnyRecord;
}) {
  return pickString(
    direct.pays_membre,
    direct.paysMembre,
    direct.member_country,
    direct.memberCountry,
    direct.member_country_code,
    direct.memberCountryCode,
    direct.country_member,
    direct.countryMember,
    direct.nationality,
    direct.nationality_code,
    direct.nationalityCode,

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

    memberData.pays_membre,
    memberData.paysMembre,
    memberData.member_country,
    memberData.memberCountry,
    memberData.member_country_code,
    memberData.memberCountryCode,
    memberData.country_member,
    memberData.countryMember,
    memberData.nationality,
    memberData.nationality_code,
    memberData.nationalityCode,
    memberData.pays,

    playerData.pays_membre,
    playerData.paysMembre,
    playerData.member_country,
    playerData.memberCountry,
    playerData.member_country_code,
    playerData.memberCountryCode,
    playerData.country_member,
    playerData.countryMember,
    playerData.nationality,
    playerData.nationality_code,
    playerData.nationalityCode,
    playerData.pays,

    "FR"
  );
}

export default function FutMemberCard({
  profile,
  member,
  player,
  stats,
  className = "",
  ...directProps
}: FutMemberCardProps) {
  const direct = asRecord(directProps);
  const profileData = asRecord(profile);
  const memberData = asRecord(member);
  const playerData = asRecord(player);

  const data = {
    ...directProps,
    ...memberData,
    ...playerData,
    ...profileData,
  };

  const statsData = {
    ...data,
    ...asRecord(stats),
  };

  const candidateSources = [
    ...collectSources(direct, [
      "registration",
      "registrations",
      "inscription",
      "inscriptions",
      "memberCompetition",
      "memberCompetitions",
      "member_competition",
      "member_competitions",
      "competitionPlayer",
      "competitionPlayers",
      "competition_player",
      "competition_players",
      "competition",
      "competitions",
      "team",
      "teams",
      "eaTeam",
      "eaTeams",
      "ea_team",
      "ea_teams",
      "club",
      "clubs",
    ]),
    firstArrayItem(direct.registrations),
    firstArrayItem(direct.inscriptions),
    firstArrayItem(direct.memberCompetitions),
    firstArrayItem(direct.member_competitions),
    firstArrayItem(direct.competitionPlayers),
    firstArrayItem(direct.competition_players),
    playerData,
    memberData,
    direct,
    profileData,
  ].filter(Boolean);

  const username = pickString(
    data.username,
    data.pseudo,
    data.nickname,
    data.display_name,
    data.displayName,
    data.name,
    "MEMBRE GSF"
  );

  const role = normalizeRole(pickString(data.role, "member"));
  const roleLabel = roleLabels[role].toUpperCase();

  const number = pickString(
    data.numero_maillot,
    data.numeroMaillot,
    data.shirtNumber,
    data.shirt_number,
    data.jerseyNumber,
    data.jersey_number,
    data.number,
    data.note,
    "27"
  );

  const platform = pickString(
    data.platform,
    data.plateforme,
    data.console,
    "PC"
  ).toUpperCase();

  const memberCountryCode = getCountryCode(
    getMemberCountryValue({
      direct,
      profileData,
      memberData,
      playerData,
    })
  );

  const championshipName = pickDeepString(
    candidateSources,
    [
      "championship_name",
      "championshipName",
      "championship",
      "league_name",
      "leagueName",
      "league",
      "ea_team.league",
      "eaTeam.league",
      "ea_team.league_name",
      "eaTeam.leagueName",
      "team.league",
      "team.league_name",
      "club.league",
      "club.league_name",
      "competition.league",
      "competition.league_name",
      "competition.name",
      "competition.title",
      "competition_name",
      "competitionName",
    ],
    pickString(
      data.championship_name,
      data.championshipName,
      data.championnat,
      data.leagueName,
      data.league,
      data.ea_team_country,
      data.eaTeamCountry,
      data.team_country,
      data.teamCountry,
      data.country_name,
      data.countryName,
      "Non défini"
    )
  );

  const eaTeamName = pickDeepString(
    candidateSources,
    [
      "ea_team_name",
      "eaTeamName",
      "team_name",
      "teamName",
      "club_name",
      "clubName",
      "selected_team",
      "selectedTeam",
      "equipe",
      "equipeEa",
      "equipe_ea",
      "ea_team",
      "eaTeam",
      "club",
      "team.name",
      "team.label",
      "ea_team.name",
      "eaTeam.name",
      "club.name",
      "competition_player.ea_team_name",
      "competitionPlayer.eaTeamName",
      "competition_players.0.ea_team_name",
      "competitionPlayers.0.eaTeamName",
      "player.ea_team_name",
      "player.eaTeamName",
    ],
    pickString(
      data.equipe_ea,
      data.ea_team_name,
      data.eaTeamName,
      "Équipe non définie"
    )
  );

  const avatarUrl = pickString(
    data.avatar_url,
    data.avatarUrl,
    data.image_url,
    data.imageUrl,
    data.photo_url,
    data.photoUrl,
    data.picture,
    "/logo-gf.png"
  );

  const statItems: StatItem[] = [
    {
      label: "MJ",
      value: pickNumber(
        statsData.mj,
        statsData.matches_played,
        statsData.matchesPlayed,
        statsData.played
      ),
      tone: getStatTone("MJ"),
    },
    {
      label: "G",
      value: pickNumber(
        statsData.g,
        statsData.v,
        statsData.wins,
        statsData.win
      ),
      tone: getStatTone("G"),
    },
    {
      label: "N",
      value: pickNumber(statsData.n, statsData.draws, statsData.draw),
      tone: getStatTone("N"),
    },
    {
      label: "P",
      value: pickNumber(statsData.p, statsData.losses, statsData.loss),
      tone: getStatTone("P"),
    },
    {
      label: "GA",
      value: pickNumber(
        statsData.ga,
        statsData.goal_average,
        statsData.goalAverage,
        statsData.goal_difference,
        statsData.goalDifference
      ),
      tone: getStatTone("GA"),
    },
    {
      label: "PTS",
      value: pickNumber(statsData.pts, statsData.points),
      tone: getStatTone("PTS"),
    },
  ];

  return (
    <article className={`relative mx-auto w-full max-w-[430px] ${className}`}>
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <img
          src="/carte-gsf-premium.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full select-none object-contain"
          draggable={false}
        />

        {/* Avatar membre */}
        <div className="absolute left-[50%] top-[47%] z-10 h-[27%] w-[40%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-[#D9A441]/35 bg-black/35 shadow-[0_0_28px_rgba(217,164,65,0.28)]">
          <img
            src={avatarUrl}
            alt={username}
            className="h-full w-full object-cover"
            draggable={false}
          />

          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.28))]" />
        </div>

        {/* N° maillot */}
        <CardText className="left-[8.3%] top-[12%] w-[21%] justify-start text-[3.4rem] tracking-[-0.06em] text-[#F7D56D]">
          {number}
        </CardText>

        {/* Rôle */}
        <CardText className="left-[63%] top-[13.5%] w-[17.5%] justify-start text-[0.68rem] tracking-[0.12em] text-[#F7E9C5]">
          <span className="truncate">{truncateText(roleLabel, 8)}</span>
        </CardText>

        {/* Plateforme */}
        <CardText className="left-[63.5%] top-[22.5%] w-[13%] justify-start text-[0.72rem] tracking-[0.12em] text-[#F7D56D]">
          <span className="truncate">{truncateText(platform, 5)}</span>
        </CardText>

        {/* Nationalité du membre */}
        <div className="absolute left-[62.45%] top-[28.65%] z-20 flex h-[4.8%] w-[12%] items-center justify-start">
          <FlagImage countryCode={memberCountryCode} />
        </div>

        {/* Pseudo */}
        <CardText className="left-[16.5%] top-[59%] w-[67%] text-[1.2rem] tracking-[0.17em] text-[#F7E9C5]">
          <span className="truncate">{truncateText(username, 14)}</span>
        </CardText>

        {/* Championnat */}
        <CardText className="left-[36%] top-[65%] w-[45%] justify-start text-[0.8rem] tracking-[0.08em] text-[#F7E9C5]">
          <span className="w-full truncate text-left">
            {truncateText(championshipName, 18)}
          </span>
        </CardText>

        {/* Équipe */}
        <CardText className="left-[36%] top-[71%] w-[47%] justify-start text-[0.84rem] tracking-[0.08em] text-[#F7E9C5]">
          <span className="w-full truncate text-left">
            {truncateText(eaTeamName, 18)}
          </span>
        </CardText>

        {/* Stats */}
        <div className="absolute left-[7%] top-[84%] z-20 grid w-[85%] grid-cols-6 gap-1">
          {statItems.map((item) => (
            <StatValue key={item.label} item={item} />
          ))}
        </div>
      </div>
    </article>
  );
}
