type ScoreStatus = "pending" | "validated" | "refused" | null | undefined;

type ScoreStatusBadgeProps = {
  status: ScoreStatus;
};

export default function ScoreStatusBadge({ status }: ScoreStatusBadgeProps) {
  if (status === "pending") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[#C39B55]/40 bg-[#C39B55]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#DBC399] shadow-lg shadow-black/20">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#DBC399] shadow-[0_0_10px_rgba(219,195,153,0.8)]" />
        Score en attente
      </div>
    );
  }

  if (status === "validated") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[#2EC4B6]/40 bg-[#2EC4B6]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#2EC4B6] shadow-lg shadow-black/20">
        <span className="h-2 w-2 rounded-full bg-[#2EC4B6] shadow-[0_0_10px_rgba(46,196,182,0.8)]" />
        Score validé
      </div>
    );
  }

  if (status === "refused") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[#C45A62]/40 bg-[#371015]/40 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#E58A8F] shadow-lg shadow-black/20">
        <span className="h-2 w-2 rounded-full bg-[#E58A8F] shadow-[0_0_10px_rgba(229,138,143,0.8)]" />
        Score refusé
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#7189AA]/40 bg-[#7189AA]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#A7B5C9]">
      <span className="h-2 w-2 rounded-full bg-[#A7B5C9]" />
      Aucun score
    </div>
  );
}