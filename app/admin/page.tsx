"use client";

import { useState } from "react";

const competitions = [
  "Guardian's League",
  "Coupe Guardian's Family",
  "Super Cup FC26",
];

const teams = [
  "Guardian's Family",
  "Elite Squad",
  "North Kings",
  "Black Lions",
  "Street Ballers",
  "Final Boss FC",
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("competition");

  return (
    <main className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 inline-flex rounded-full border border-[#D9A441]/30 bg-[#160A12] px-4 py-2 text-sm font-semibold text-[#F2D27A]">
            Gestion privée
          </p>

          <h1 className="text-4xl font-black md:text-5xl">Admin</h1>

          <p className="mt-3 max-w-2xl text-[#D8C7A0]">
            Gérez les compétitions, équipes, matchs et scores de GSF Compet.
          </p>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-4">
          <button
            onClick={() => setActiveTab("competition")}
            className={`rounded-xl border px-4 py-3 font-semibold transition ${
              activeTab === "competition"
                ? "border-[#D9A441]/40 bg-[#A61E22] text-white"
                : "border-[#D9A441]/20 bg-[#160A12] text-[#D8C7A0] hover:text-[#F2D27A]"
            }`}
          >
            Compétition
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`rounded-xl border px-4 py-3 font-semibold transition ${
              activeTab === "team"
                ? "border-[#D9A441]/40 bg-[#A61E22] text-white"
                : "border-[#D9A441]/20 bg-[#160A12] text-[#D8C7A0] hover:text-[#F2D27A]"
            }`}
          >
            Équipe
          </button>

          <button
            onClick={() => setActiveTab("match")}
            className={`rounded-xl border px-4 py-3 font-semibold transition ${
              activeTab === "match"
                ? "border-[#D9A441]/40 bg-[#A61E22] text-white"
                : "border-[#D9A441]/20 bg-[#160A12] text-[#D8C7A0] hover:text-[#F2D27A]"
            }`}
          >
            Match
          </button>

          <button
            onClick={() => setActiveTab("score")}
            className={`rounded-xl border px-4 py-3 font-semibold transition ${
              activeTab === "score"
                ? "border-[#D9A441]/40 bg-[#A61E22] text-white"
                : "border-[#D9A441]/20 bg-[#160A12] text-[#D8C7A0] hover:text-[#F2D27A]"
            }`}
          >
            Score
          </button>
        </div>

        {activeTab === "competition" && <CompetitionForm />}
        {activeTab === "team" && <TeamForm />}
        {activeTab === "match" && <MatchForm />}
        {activeTab === "score" && <ScoreForm />}
      </section>
    </main>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-[#F2D27A]">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition placeholder:text-[#8F7B5C] focus:border-[#D9A441]/60"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-[#D9A441]/20 bg-[#0B0610] px-4 py-3 text-[#F7E9C5] outline-none transition focus:border-[#D9A441]/60"
    />
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="mt-6 rounded-xl bg-[#A61E22] px-6 py-3 font-semibold text-white shadow-lg shadow-[#A61E22]/20 transition hover:bg-[#8E171C]"
    >
      {children}
    </button>
  );
}

function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#D9A441]/20 bg-[#160A12]/90 p-6 shadow-lg shadow-black/30">
      <h2 className="text-2xl font-black text-[#F7E9C5]">{title}</h2>
      <p className="mt-2 text-[#D8C7A0]">{description}</p>

      <div className="mt-8 grid gap-5">{children}</div>
    </div>
  );
}

function CompetitionForm() {
  return (
    <FormCard
      title="Créer une compétition"
      description="Ajoute un championnat, une coupe ou un tournoi EA FC 26."
    >
      <div>
        <FieldLabel>Nom de la compétition</FieldLabel>
        <Input placeholder="Ex : Guardian's League" />
      </div>

      <div>
        <FieldLabel>Type</FieldLabel>
        <Select defaultValue="">
          <option value="" disabled>
            Choisir un type
          </option>
          <option>Championnat</option>
          <option>Coupe</option>
          <option>Tournoi rapide</option>
          <option>Super Cup</option>
        </Select>
      </div>

      <div>
        <FieldLabel>Saison</FieldLabel>
        <Input placeholder="Ex : Saison 1" />
      </div>

      <SubmitButton>Créer la compétition</SubmitButton>
    </FormCard>
  );
}

function TeamForm() {
  return (
    <FormCard
      title="Ajouter une équipe"
      description="Inscris une équipe ou un membre dans la compétition."
    >
      <div>
        <FieldLabel>Nom de l’équipe</FieldLabel>
        <Input placeholder="Ex : Guardian's Family" />
      </div>

      <div>
        <FieldLabel>Manager</FieldLabel>
        <Input placeholder="Ex : Mika, Yanis, Rayan..." />
      </div>

      <div>
        <FieldLabel>Compétition</FieldLabel>
        <Select defaultValue="">
          <option value="" disabled>
            Choisir une compétition
          </option>
          {competitions.map((competition) => (
            <option key={competition}>{competition}</option>
          ))}
        </Select>
      </div>

      <SubmitButton>Ajouter l’équipe</SubmitButton>
    </FormCard>
  );
}

function MatchForm() {
  return (
    <FormCard
      title="Créer un match"
      description="Programme une rencontre entre deux équipes."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Équipe domicile</FieldLabel>
          <Select defaultValue="">
            <option value="" disabled>
              Choisir une équipe
            </option>
            {teams.map((team) => (
              <option key={team}>{team}</option>
            ))}
          </Select>
        </div>

        <div>
          <FieldLabel>Équipe extérieur</FieldLabel>
          <Select defaultValue="">
            <option value="" disabled>
              Choisir une équipe
            </option>
            {teams.map((team) => (
              <option key={team}>{team}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <FieldLabel>Compétition</FieldLabel>
        <Select defaultValue="">
          <option value="" disabled>
            Choisir une compétition
          </option>
          {competitions.map((competition) => (
            <option key={competition}>{competition}</option>
          ))}
        </Select>
      </div>

      <div>
        <FieldLabel>Date du match</FieldLabel>
        <Input type="datetime-local" />
      </div>

      <SubmitButton>Créer le match</SubmitButton>
    </FormCard>
  );
}

function ScoreForm() {
  return (
    <FormCard
      title="Ajouter un score"
      description="Saisis le résultat d’un match terminé."
    >
      <div>
        <FieldLabel>Match</FieldLabel>
        <Select defaultValue="">
          <option value="" disabled>
            Choisir un match
          </option>
          <option>Guardian&apos;s Family vs Elite Squad</option>
          <option>North Kings vs Black Lions</option>
          <option>Street Ballers vs Final Boss FC</option>
        </Select>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <FieldLabel>Score domicile</FieldLabel>
          <Input type="number" min="0" placeholder="0" />
        </div>

        <div>
          <FieldLabel>Score extérieur</FieldLabel>
          <Input type="number" min="0" placeholder="0" />
        </div>
      </div>

      <div>
        <FieldLabel>Homme du match</FieldLabel>
        <Input placeholder="Ex : joueur MVP" />
      </div>

      <SubmitButton>Valider le score</SubmitButton>
    </FormCard>
  );
}