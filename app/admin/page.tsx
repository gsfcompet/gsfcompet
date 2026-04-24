const adminCards = [
  {
    title: "Créer une compétition",
    description: "Ajouter un championnat, une coupe ou un tournoi.",
  },
  {
    title: "Ajouter un score",
    description: "Saisir les résultats des matchs.",
  },
  {
    title: "Ajouter une équipe",
    description: "Inscrire les joueurs ou équipes de la Guardian's Family.",
  },
  {
    title: "Gérer le classement",
    description: "Classement automatique selon les scores.",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Gestion privée
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Admin</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Espace de gestion des compétitions GSF Compet.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {adminCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/20"
            >
              <h2 className="text-2xl font-black text-[#F7E9C5]">
                {card.title}
              </h2>

              <p className="mt-2 text-[#D8C7A0]">{card.description}</p>

              <button className="mt-6 rounded-xl bg-[#A61E22] px-5 py-3 font-semibold text-white transition hover:bg-[#8E171C]">
                Bientôt disponible
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}