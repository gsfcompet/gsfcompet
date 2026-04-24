export default function AdminPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <h1 className="mb-3 text-4xl font-black">Admin</h1>
      <p className="mb-8 text-slate-400">
        Espace de gestion des compétitions GSF Compet.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Créer une compétition</h2>
          <p className="mt-2 text-slate-400">
            Bientôt : ajouter un championnat, une coupe ou un tournoi.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Ajouter un score</h2>
          <p className="mt-2 text-slate-400">
            Bientôt : saisir les résultats des matchs.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Ajouter une équipe</h2>
          <p className="mt-2 text-slate-400">
            Bientôt : inscrire les joueurs ou équipes de la Guardian&apos;s Family.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Gérer le classement</h2>
          <p className="mt-2 text-slate-400">
            Bientôt : classement automatique selon les scores.
          </p>
        </div>
      </div>
    </main>
  );
}