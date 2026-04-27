"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FutMemberCard from "@/components/FutMemberCard";

type Profile = {
  id: string;
  email: string;
  username: string | null;
  role: "member" | "admin";
};

type Player = {
  id: string;
  user_id: string | null;
  name: string;
  ea_name: string | null;
  platform: string | null;
};

type Competition = {
  id: string;
  name: string;
  type: string;
  season: string | null;
  status: string;
  participant_type: "teams" | "players";
};

type CompetitionPlayer = {
  id: string;
  competition_id: string;
  player_id: string;
  ea_team_id: string | null;
  ea_team_name: string;
};

type EaTeam = {
  id: string;
  country: string;
  league: string;
  name: string;
};

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_competition_player_id: string | null;
  away_competition_player_id: string | null;
  match_date: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  mvp: string | null;
};

export default function MemberPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [registrations, setRegistrations] = useState<CompetitionPlayer[]>([]);
  const [eaTeams, setEaTeams] = useState<EaTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadMemberData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileResult.error || !profileResult.data) {
      setMessage("Profil introuvable. Reconnecte-toi ou contacte un admin.");
      setLoading(false);
      return;
    }

    const playerResult = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const competitionsResult = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    const registrationsResult = await supabase
      .from("competition_players")
      .select("*");

    const eaTeamsResult = await supabase
      .from("ea_teams")
      .select("*")
      .order("country", { ascending: true })
      .order("league", { ascending: true })
      .order("name", { ascending: true });

    const matchesResult = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (playerResult.error) {
      setMessage(`Erreur joueur : ${playerResult.error.message}`);
      setLoading(false);
      return;
    }

    if (competitionsResult.error) {
      setMessage(`Erreur compétitions : ${competitionsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (registrationsResult.error) {
      setMessage(`Erreur inscriptions : ${registrationsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (eaTeamsResult.error) {
      setMessage(`Erreur équipes EA FC : ${eaTeamsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (matchesResult.error) {
      setMessage(`Erreur matchs : ${matchesResult.error.message}`);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data as Profile);
    setPlayer(playerResult.data as Player | null);
    setCompetitions((competitionsResult.data ?? []) as Competition[]);
    setRegistrations((registrationsResult.data ?? []) as CompetitionPlayer[]);
    setEaTeams((eaTeamsResult.data ?? []) as EaTeam[]);
    setMatches((matchesResult.data ?? []) as Match[]);
    setLoading(false);
  }

  useEffect(() => {
    loadMemberData();
  }, []);

  const myRegistrations = useMemo(() => {
    if (!player) return [];

    return registrations.filter(
      (registration) => registration.player_id === player.id
    );
  }, [registrations, player]);

  const myRegistrationIds = useMemo(() => {
    return myRegistrations.map((registration) => registration.id);
  }, [myRegistrations]);

  const myMatches = useMemo(() => {
    return matches.filter((match) => {
      const homeRegistrationId = match.home_competition_player_id;
      const awayRegistrationId = match.away_competition_player_id;

      const isHome =
        homeRegistrationId !== null &&
        myRegistrationIds.includes(homeRegistrationId);

      const isAway =
        awayRegistrationId !== null &&
        myRegistrationIds.includes(awayRegistrationId);

      return isHome || isAway;
    });
  }, [matches, myRegistrationIds]);

  const upcomingMatches = useMemo(() => {
    return myMatches.filter((match) => match.status !== "completed");
  }, [myMatches]);

  const completedMatches = useMemo(() => {
    return myMatches.filter(
      (match) =>
        match.status === "completed" &&
        match.home_score !== null &&
        match.away_score !== null
    );
  }, [myMatches]);

  const memberStats = useMemo(() => {
    let mj = 0;
    let v = 0;
    let n = 0;
    let p = 0;
    let bp = 0;
    let bc = 0;
    let ga = 0;
    let pts = 0;

    for (const match of completedMatches) {
      const isHome =
        match.home_competition_player_id !== null &&
        myRegistrationIds.includes(match.home_competition_player_id);

      const isAway =
        match.away_competition_player_id !== null &&
        myRegistrationIds.includes(match.away_competition_player_id);

      if (!isHome && !isAway) continue;
      if (match.home_score === null || match.away_score === null) continue;

      const myGoals = isHome ? match.home_score : match.away_score;
      const opponentGoals = isHome ? match.away_score : match.home_score;

      mj += 1;
      bp += myGoals;
      bc += opponentGoals;
      ga += myGoals - opponentGoals;

      if (myGoals > opponentGoals) {
        v += 1;
        pts += 3;
      } else if (myGoals === opponentGoals) {
        n += 1;
        pts += 1;
      } else {
        p += 1;
      }
    }

    return {
      mj,
      v,
      n,
      p,
      bp,
      bc,
      ga,
      pts,
    };
  }, [completedMatches, myRegistrationIds]);

  const mainRegistration = myRegistrations[0] ?? null;

  const mainEaTeam = mainRegistration?.ea_team_id
    ? eaTeams.find((team) => team.id === mainRegistration.ea_team_id)
    : null;

  function getCompetition(competitionId: string) {
    return competitions.find((competition) => competition.id === competitionId);
  }

  function getCompetitionLabel(competitionId: string) {
    const competition = getCompetition(competitionId);

    if (!competition) return "Compétition inconnue";

    return competition.season
      ? `${competition.name} · ${competition.season}`
      : competition.name;
  }

  function getRegistration(registrationId: string | null) {
    if (!registrationId) return null;

    return (
      registrations.find((registration) => registration.id === registrationId) ??
      null
    );
  }

  function getParticipantLabel(registrationId: string | null) {
    const registration = getRegistration(registrationId);

    if (!registration) return "Participant inconnu";

    const isMe = player && registration.player_id === player.id;

    if (isMe) {
      return `${player.name} · ${registration.ea_team_name}`;
    }

    return `Adversaire · ${registration.ea_team_name}`;
  }

  function formatDate(value: string | null) {
    if (!value) return "À planifier";

    const date = new Date(value);

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function getResultLabel(match: Match) {
    if (
      !match.home_competition_player_id ||
      !match.away_competition_player_id ||
      match.home_score === null ||
      match.away_score === null
    ) {
      return "Résultat indisponible";
    }

    const isHome = myRegistrationIds.includes(match.home_competition_player_id);

    const myScore = isHome ? match.home_score : match.away_score;
    const opponentScore = isHome ? match.away_score : match.home_score;

    if (myScore > opponentScore) return "Victoire";
    if (myScore < opponentScore) return "Défaite";
    return "Match nul";
  }

  function getResultClass(match: Match) {
    const result = getResultLabel(match);

    if (result === "Victoire") return "text-green-300";
    if (result === "Défaite") return "text-red-300";
    if (result === "Match nul") return "text-orange-300";

    return "text-[#D8C7A0]";
  }

  function getCardNote() {
    if (profile?.role === "admin") return 99;

    const base = 80 + memberStats.pts;

    if (base > 99) return 99;
    if (base < 80) return 80;

    return base;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-[#D8C7A0]">Chargement du panel membre...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <section className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 text-center shadow-lg shadow-black/30">
            <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#0B0610] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
              Panel membre
            </p>

            <h1 className="text-3xl font-black">Connexion requise</h1>

            <p className="mt-3 text-[#D8C7A0]">
              Connecte-toi pour accéder à ton espace membre.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white transition hover:bg-[#8E171C]"
              >
                Se connecter
              </Link>

              <Link
                href="/register"
                className="rounded-xl border border-[#D9A441]/30 px-6 py-3 font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const displayName = player?.name || profile.username || profile.email;
  const cardTeamName = mainRegistration?.ea_team_name || "Sans équipe";
  const cardCountry = mainEaTeam?.country || "Angleterre";
  const cardPlatform = player?.platform || "PC";

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Panel membre
          </p>

          <h1 className="text-4xl font-black md:text-5xl">
            Bienvenue {displayName}
          </h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Retrouve tes inscriptions, tes équipes EA FC, tes prochains matchs
            et tes résultats.
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-red-400/30 bg-[#160A12] p-4 text-sm text-red-300">
              {message}
            </div>
          )}
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Rôle"
            value={profile.role === "admin" ? "Admin" : "Membre"}
          />
          <StatCard label="Inscriptions" value={myRegistrations.length} />
          <StatCard label="Matchs à venir" value={upcomingMatches.length} />
          <StatCard label="Points" value={memberStats.pts} />
        </div>

        <section className="rounded-3xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
          <div className="grid gap-8 lg:grid-cols-[430px_1fr]">
            <div className="flex justify-center">
              <div className="w-full max-w-[430px]">
                <FutMemberCard
                  pseudo={displayName}
                  role={profile.role}
                  note={getCardNote()}
                  plateforme={cardPlatform}
                  pays={cardCountry}
                  equipeEAFC={cardTeamName}
                  avatarUrl={null}
                  mj={memberStats.mj}
                  v={memberStats.v}
                  n={memberStats.n}
                  p={memberStats.p}
                  bp={memberStats.bp}
                  bc={memberStats.bc}
                  ga={memberStats.ga}
                  pts={memberStats.pts}
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <p className="mb-3 inline-flex w-fit rounded-full border border-[#D9A441]/30 bg-[#0B0610] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
                Carte membre
              </p>

              <h2 className="text-3xl font-black text-[#F7E9C5]">
                Profil Guardian&apos;s Family
              </h2>

              <p className="mt-3 max-w-2xl text-[#D8C7A0]">
                Ta carte regroupe ton identité membre, ton équipe EA FC
                principale et tes statistiques issues des matchs terminés.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoBox label="Pseudo membre" value={displayName} />
                <InfoBox
                  label="Pseudo EA"
                  value={player?.ea_name || "Non défini"}
                />
                <InfoBox label="Plateforme" value={cardPlatform} />
                <InfoBox label="Pays" value={cardCountry} />
                <InfoBox label="Équipe EA FC" value={cardTeamName} />
                <InfoBox
                  label="Rôle"
                  value={profile.role === "admin" ? "Admin" : "Membre"}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/membre/profil"
                  className="inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#0B0610]"
                >
                  Modifier mon profil
                </Link>

                <Link
                  href="/competitions"
                  className="inline-flex rounded-xl bg-[#A61E22] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
                >
                  Voir les compétitions
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Ma fiche joueur
              </h2>

              {player ? (
                <div className="mt-5 space-y-3 text-[#D8C7A0]">
                  <p>
                    Nom joueur :{" "}
                    <span className="font-semibold text-[#F2D27A]">
                      {player.name}
                    </span>
                  </p>

                  <p>
                    Pseudo EA :{" "}
                    <span className="font-semibold text-[#F2D27A]">
                      {player.ea_name || "Non défini"}
                    </span>
                  </p>

                  <p>
                    Plateforme :{" "}
                    <span className="font-semibold text-[#F2D27A]">
                      {player.platform || "Non définie"}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                  Tu n’as pas encore de fiche joueur. Inscris-toi à une
                  compétition pour la créer automatiquement.
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/membre/profil"
                  className="inline-flex rounded-xl border border-[#D9A441]/30 px-5 py-2.5 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                >
                  Modifier mon profil
                </Link>

                <Link
                  href="/competitions"
                  className="inline-flex rounded-xl bg-[#A61E22] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
                >
                  Voir les compétitions
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Mes inscriptions
              </h2>

              <div className="mt-5 space-y-3">
                {myRegistrations.length === 0 && (
                  <p className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                    Aucune inscription pour le moment.
                  </p>
                )}

                {myRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8F7B5C]">
                      {getCompetitionLabel(registration.competition_id)}
                    </p>

                    <h3 className="mt-2 text-xl font-black text-[#F2D27A]">
                      {registration.ea_team_name}
                    </h3>

                    <Link
                      href={`/competitions/${registration.competition_id}/inscription`}
                      className="mt-4 inline-flex rounded-lg border border-[#D9A441]/30 px-4 py-2 text-sm font-semibold text-[#F2D27A] transition hover:bg-[#160A12]"
                    >
                      Modifier l’inscription
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Mes matchs à venir
              </h2>

              <div className="mt-5 space-y-3">
                {upcomingMatches.length === 0 && (
                  <p className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                    Aucun match à venir pour le moment.
                  </p>
                )}

                {upcomingMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    competitionLabel={getCompetitionLabel(match.competition_id)}
                    homeLabel={getParticipantLabel(
                      match.home_competition_player_id
                    )}
                    awayLabel={getParticipantLabel(
                      match.away_competition_player_id
                    )}
                    dateLabel={formatDate(match.match_date)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                Mes résultats
              </h2>

              <div className="mt-5 space-y-3">
                {completedMatches.length === 0 && (
                  <p className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4 text-sm text-[#D8C7A0]">
                    Aucun résultat pour le moment.
                  </p>
                )}

                {completedMatches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8F7B5C]">
                      {getCompetitionLabel(match.competition_id)}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#F7E9C5]">
                          {getParticipantLabel(
                            match.home_competition_player_id
                          )}
                        </p>

                        <p className="font-semibold text-[#F7E9C5]">
                          {getParticipantLabel(
                            match.away_competition_player_id
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#D9A441]/25 bg-[#160A12] px-4 py-3 text-center">
                        <p className="text-2xl font-black text-[#F2D27A]">
                          {match.home_score} - {match.away_score}
                        </p>

                        <p
                          className={`mt-1 text-xs font-semibold ${getResultClass(
                            match
                          )}`}
                        >
                          {getResultLabel(match)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-[#8F7B5C]">
                      {formatDate(match.match_date)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-5 shadow-lg shadow-black/30">
      <p className="text-sm text-[#8F7B5C]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#F2D27A]">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#0B0610]/70 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[#8F7B5C]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-[#F2D27A]">
        {value}
      </p>
    </div>
  );
}

function MatchCard({
  competitionLabel,
  homeLabel,
  awayLabel,
  dateLabel,
}: {
  competitionLabel: string;
  homeLabel: string;
  awayLabel: string;
  dateLabel: string;
}) {
  return (
    <div className="rounded-xl border border-[#D9A441]/15 bg-[#0B0610]/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8F7B5C]">
        {competitionLabel}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <p className="font-semibold text-[#F7E9C5]">{homeLabel}</p>

        <span className="rounded-lg border border-[#D9A441]/25 bg-[#160A12] px-3 py-1 text-center text-sm font-black text-[#F2D27A]">
          VS
        </span>

        <p className="font-semibold text-[#F7E9C5] md:text-right">
          {awayLabel}
        </p>
      </div>

      <p className="mt-3 text-sm text-[#8F7B5C]">{dateLabel}</p>
    </div>
  );
}