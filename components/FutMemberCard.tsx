"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type FutMemberCardProps = {
  pseudo: string;
  role?: string;
  note?: number;
  plateforme?: string;
  pays?: string;
  equipeEAFC?: string;
  avatarUrl?: string | null;

  mj?: number;
  v?: number;
  n?: number;
  p?: number;
  bp?: number;
  bc?: number;
  ga?: number;
  pts?: number;
};

type StatPosition = {
  key: string;
  value: string | number;
  left: string;
  top: string;
  color: string;
};

function getCountryCode(country?: string) {
  if (!country) return "GB";

  const value = country.toLowerCase();

  if (value.includes("france")) return "FR";
  if (value.includes("angleterre")) return "GB";
  if (value.includes("england")) return "GB";
  if (value.includes("royaume")) return "GB";
  if (value.includes("espagne")) return "ES";
  if (value.includes("spain")) return "ES";
  if (value.includes("italie")) return "IT";
  if (value.includes("italy")) return "IT";
  if (value.includes("allemagne")) return "DE";
  if (value.includes("germany")) return "DE";
  if (value.includes("portugal")) return "PT";
  if (value.includes("pays-bas")) return "NL";
  if (value.includes("belgique")) return "BE";
  if (value.includes("maroc")) return "MA";
  if (value.includes("algérie") || value.includes("algerie")) return "DZ";
  if (value.includes("tunisie")) return "TN";

  return "GB";
}

function getRoleLabel(role?: string) {
  if (!role) return "MEMBRE";

  return role.toLowerCase() === "admin" ? "ADMIN" : "MEMBRE";
}

function formatGA(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export default function FutMemberCard({
  pseudo,
  role = "Membre",
  note = 99,
  plateforme = "PC",
  pays = "France",
  equipeEAFC = "Sans équipe",
  avatarUrl = null,
  mj = 0,
  v = 0,
  n = 0,
  p = 0,
  bp = 0,
  bc = 0,
  ga = 0,
  pts = 0,
}: FutMemberCardProps) {
  const countryCode = getCountryCode(pays);
  const roleLabel = getRoleLabel(role);

  const statPositions: StatPosition[] = [
    {
      key: "mj",
      value: mj,
      left: "18.4%",
      top: "69.65%",
      color: "#F7D56D",
    },
    {
      key: "v",
      value: v,
      left: "39.15%",
      top: "69.65%",
      color: "#22c55e",
    },
    {
      key: "n",
      value: n,
      left: "60.35%",
      top: "69.65%",
      color: "#f59e0b",
    },
    {
      key: "p",
      value: p,
      left: "81.25%",
      top: "69.65%",
      color: "#fb7185",
    },
    {
      key: "bp",
      value: bp,
      left: "18.4%",
      top: "79.45%",
      color: "#22c55e",
    },
    {
      key: "bc",
      value: bc,
      left: "39.15%",
      top: "79.45%",
      color: "#fb7185",
    },
    {
      key: "ga",
      value: formatGA(ga),
      left: "60.35%",
      top: "79.45%",
      color: "#F7D56D",
    },
    {
      key: "pts",
      value: pts,
      left: "81.25%",
      top: "79.45%",
      color: "#F7D56D",
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[430px]">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[30px]">
        <Image
          src="/Carte_UT_GSF_v2.png"
          alt="Carte membre Guardian's Family"
          fill
          priority
          className="object-contain"
          sizes="(max-width: 768px) 90vw, 430px"
        />

        <div className="absolute inset-0 z-10">
          {/* NOTE */}
          <Box left="8.9%" top="4.9%" width="18.8%" height="10.2%">
            <span className="text-[clamp(2.15rem,6vw,3.5rem)] font-black leading-none text-[#F7D56D] drop-shadow-[0_0_10px_rgba(247,213,109,0.35)]">
              {note}
            </span>
          </Box>

          {/* ROLE */}
          <Box left="8.7%" top="16.1%" width="19.3%" height="3.35%">
            <span className="text-[clamp(0.5rem,1.18vw,0.68rem)] font-black uppercase tracking-[0.24em] text-[#F7D56D] drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
              {roleLabel}
            </span>
          </Box>

          {/* PETIT CARRÉ GAUCHE */}
          <Box left="9%" top="20%" width="9.8%" height="5.8%">
            <span className="text-[clamp(0.78rem,1.55vw,0.95rem)] font-black text-[#F7D56D]">
              {countryCode}
            </span>
          </Box>

          {/* BARRE HAUT DROITE */}
          <Box left="73.1%" top="4.55%" width="19.6%" height="3.15%">
            <span className="text-[clamp(0.58rem,1.2vw,0.74rem)] font-black tracking-[0.16em] text-[#F7D56D]">
              {countryCode}
            </span>
          </Box>

          {/* CERCLE HAUT DROITE */}
          <Box left="72.15%" top="7.5%" width="21.4%" height="11.8%">
            <span className="text-[clamp(1.25rem,2.9vw,1.7rem)] font-black uppercase text-[#F7D56D]">
              {plateforme.toUpperCase()}
            </span>
          </Box>

          {/* AVATAR CENTRAL */}
          <div
            className="absolute z-20 flex aspect-square items-center justify-center overflow-hidden rounded-full"
            style={{
              left: "50%",
              top: "29.9%",
              width: "32.2%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={pseudo}
                fill
                className="object-cover"
                sizes="180px"
              />
            ) : (
              <span className="text-[clamp(2.4rem,6.6vw,3.8rem)] font-black uppercase text-[#F7D56D] drop-shadow-[0_0_14px_rgba(247,213,109,0.25)]">
                {pseudo.charAt(0)}
              </span>
            )}
          </div>

          {/* PSEUDO */}
          <Box left="22.2%" top="43.65%" width="55.8%" height="5.2%">
            <span className="max-w-full truncate text-center text-[clamp(0.95rem,2.45vw,1.38rem)] font-black uppercase tracking-[0.08em] text-[#F7D56D] drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
              {pseudo}
            </span>
          </Box>

          {/* PAYS */}
          <Box left="28.9%" top="51.55%" width="42.2%" height="3.05%">
            <span className="max-w-full truncate text-center text-[clamp(0.64rem,1.35vw,0.8rem)] font-bold text-[#F7D56D] drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
              {pays}
            </span>
          </Box>

          {/* ÉQUIPE EA FC */}
          <Box left="33.8%" top="56.55%" width="32.4%" height="2.95%">
            <span className="max-w-full truncate text-center text-[clamp(0.58rem,1.18vw,0.72rem)] font-semibold text-[#F7D56D] drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
              {equipeEAFC}
            </span>
          </Box>

          {/* STATS réglées individuellement */}
          {statPositions.map((stat) => (
            <StatValue
              key={stat.key}
              value={stat.value}
              left={stat.left}
              top={stat.top}
              color={stat.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Box({
  left,
  top,
  width,
  height,
  children,
}: {
  left: string;
  top: string;
  width: string;
  height: string;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute z-20 flex items-center justify-center overflow-hidden px-2 text-center"
      style={{ left, top, width, height }}
    >
      {children}
    </div>
  );
}

function StatValue({
  value,
  left,
  top,
  color,
}: {
  value: string | number;
  left: string;
  top: string;
  color: string;
}) {
  return (
    <div
      className="absolute z-20 flex items-center justify-center text-center"
      style={{
        left,
        top,
        width: "8.8%",
        height: "4.4%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <span
        className="text-center text-[clamp(0.78rem,1.75vw,0.98rem)] font-extrabold leading-none"
        style={{
          color,
          textShadow: "0 0 10px rgba(0,0,0,0.88)",
        }}
      >
        {value}
      </span>
    </div>
  );
}