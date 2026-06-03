type ScoreStatus = "pending" | "validated" | "refused" | null | undefined;

type ScoreStatusBadgeProps = {
  status: ScoreStatus;
};

export default function ScoreStatusBadge({ status }: ScoreStatusBadgeProps) {
  if (status === "pending") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-yellow-300 shadow-lg shadow-yellow-950/20">
        <span className="h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.9)] animate-pulse" />
        Score en attente
      </div>
    );
  }

  if (status === "validated") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-green-400/40 bg-green-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-green-300 shadow-lg shadow-green-950/20">
        <span className="h-2 w-2 rounded-full bg-green-300 shadow-[0_0_10px_rgba(74,222,128,0.9)]" />
        Score validé
      </div>
    );
  }

  if (status === "refused") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-300 shadow-lg shadow-red-950/20">
        <span className="h-2 w-2 rounded-full bg-red-300 shadow-[0_0_10px_rgba(248,113,113,0.9)]" />
        Score refusé
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-300">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      Aucun score
    </div>
  );
}
