"use client";

type Match = {
  id: string;
  competition_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_competition_player_id: string | null;
  away_competition_player_id: string | null;
  status: string;
  match_date?: string | null;
  created_at?: string | null;
  home_score: number | null;
  away_score: number | null;
};

type Props = {
  matches: Match[];
  getHomeName: (match: Match) => string;
  getAwayName: (match: Match) => string;
  getCompetitionLabel: (competitionId: string) => string;
};

function formatDate(value?: string | null) {
  if (!value) return "Date à définir";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date à définir";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function MatchCard({
  match,
  kind,
  getHomeName,
  getAwayName,
  getCompetitionLabel,
}: {
  match: Match;
  kind: "result" | "upcoming";
  getHomeName: Props["getHomeName"];
  getAwayName: Props["getAwayName"];
  getCompetitionLabel: Props["getCompetitionLabel"];
}) {
  return (
    <article className="w-[290px] shrink-0 rounded-xl border border-[rgba(241,233,210,0.14)] bg-[#0B1B33] px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#DBC399]">
          {kind === "result" ? "Résultat" : "À venir"}
        </span>
        <span className="truncate text-[10px] text-[#cfc6ab]/60">
          {getCompetitionLabel(match.competition_id)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs font-black text-[#cfc6ab]">
        <span className="min-w-0 truncate">{getHomeName(match)}</span>

        {kind === "result" ? (
          <span className="shrink-0 text-[#DBC399]">
            {match.home_score} – {match.away_score}
          </span>
        ) : (
          <span className="shrink-0 rounded border border-[#C39B55]/35 px-2 py-1 text-[10px] text-[#DBC399]">
            VS
          </span>
        )}

        <span className="min-w-0 truncate text-right">{getAwayName(match)}</span>
      </div>

      <p className="mt-2 text-[10px] text-[#cfc6ab]/60">
        {formatDate(match.match_date || match.created_at)}
      </p>
    </article>
  );
}

function MatchMarquee({
  title,
  description,
  matches,
  kind,
  getHomeName,
  getAwayName,
  getCompetitionLabel,
}: {
  title: string;
  description: string;
  matches: Match[];
  kind: "result" | "upcoming";
  getHomeName: Props["getHomeName"];
  getAwayName: Props["getAwayName"];
  getCompetitionLabel: Props["getCompetitionLabel"];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[rgba(241,233,210,0.14)] bg-[#12274A] py-4">
      <div className="mb-3 px-5">
        <h2 className="text-lg font-black text-[#cfc6ab]">{title}</h2>
        <p className="mt-1 text-xs text-[#cfc6ab]/65">{description}</p>
      </div>

      {matches.length === 0 ? (
        <p className="px-5 text-sm text-[#cfc6ab]/65">
          {kind === "result"
            ? "Aucun résultat récent."
            : "Aucun prochain match programmé."}
        </p>
      ) : (
        <div className="group overflow-hidden">
          <div
            className={`flex w-max group-hover:[animation-play-state:paused] ${
              kind === "result"
                ? "animate-results-marquee"
                : "animate-upcoming-marquee"
            }`}
          >
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 gap-3 pr-3"
              >
                {matches.map((match) => (
                  <MatchCard
                    key={`${copy}-${match.id}`}
                    match={match}
                    kind={kind}
                    getHomeName={getHomeName}
                    getAwayName={getAwayName}
                    getCompetitionLabel={getCompetitionLabel}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes results-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes upcoming-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .animate-results-marquee {
          animation: results-marquee 35s linear infinite;
        }

        .animate-upcoming-marquee {
          animation: upcoming-marquee 35s linear infinite;
        }
      `}</style>
    </section>
  );
}

export default function CompetitionActivity({
  matches,
  getHomeName,
  getAwayName,
  getCompetitionLabel,
}: Props) {
  const completedMatches = matches
    .filter(
      (match) =>
        match.status === "completed" &&
        match.home_score !== null &&
        match.away_score !== null
    )
    .sort(
      (a, b) =>
        new Date(b.match_date || b.created_at || 0).getTime() -
        new Date(a.match_date || a.created_at || 0).getTime()
    )
    .slice(0, 5);

  const upcomingMatches = matches
    .filter((match) => match.status !== "completed")
    .sort(
      (a, b) =>
        new Date(a.match_date || "9999-12-31").getTime() -
        new Date(b.match_date || "9999-12-31").getTime()
    )
    .slice(0, 5);

  return (
    <div className="mt-6 grid gap-5">
      <MatchMarquee
        title="Derniers résultats"
        description="Les matchs terminés récemment."
        matches={completedMatches}
        kind="result"
        getHomeName={getHomeName}
        getAwayName={getAwayName}
        getCompetitionLabel={getCompetitionLabel}
      />

      <MatchMarquee
        title="Prochains matchs"
        description="Les rencontres à venir ou à planifier."
        matches={upcomingMatches}
        kind="upcoming"
        getHomeName={getHomeName}
        getAwayName={getAwayName}
        getCompetitionLabel={getCompetitionLabel}
      />
    </div>
  );
}
