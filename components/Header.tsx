"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthStatus from "@/components/AuthStatus";

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Compétitions", href: "/competitions" },
  { label: "Équipes", href: "/équipes" },
  { label: "Gazette", href: "/gazette" },
  { label: "Espace membre", href: "/membre" },
  { label: "Admin", href: "/admin" },
];

export default function Header() {
  const pathname = usePathname();
  const [shrink, setShrink] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShrink(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-[#D9A441]/20 backdrop-blur-xl transition-all duration-300 ${
        shrink ? "bg-[#0B0610]/90 py-1 shadow-lg shadow-black/40" : "bg-[#0B0610]/95 py-3"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        
        {/* LOGO + TITRE */}
        <Link href="/" className="flex min-w-0 items-center gap-3 group transition-all">
          <div
            className={`
              relative flex items-center justify-center overflow-hidden rounded-full
              border border-[#D9A441]/40 bg-[#160A12] shadow-lg shadow-black/30
              transition-all duration-300
              ${shrink ? "h-9 w-9" : "h-12 w-12"}
              group-hover:scale-110
            `}
          >
            {/* HALO ANIMÉ */}
            <span
              className="
                absolute inset-0 rounded-full
                bg-[#D9A441]/20 blur-xl opacity-60
                animate-pulse
              "
            />

            {/* GLOW CERCLE */}
            <span
              className="
                absolute inset-0 rounded-full
                bg-gradient-to-br from-[#D9A441]/40 to-transparent
                opacity-0 group-hover:opacity-40
                transition-all duration-500
              "
            />

            {/* LOGO */}
            <img
              src="/logo-gf.png"
              alt="Guardian's Family"
              className="
                relative z-10 h-full w-full object-cover
                transition-all duration-300
                group-hover:brightness-125
              "
            />
          </div>

          <div className="min-w-0 leading-tight">
            <p className={`truncate font-black text-[#F7E9C5] transition-all ${shrink ? "text-sm" : "text-lg"}`}>
              Guardian&apos;s Family
            </p>
            <p className={`truncate text-[#D8C7A0] transition-all ${shrink ? "text-[10px]" : "text-sm"}`}>
              GSF Compet
            </p>
          </div>
        </Link>

        {/* NAV DESKTOP */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative text-sm font-medium transition-all duration-200
                  ${active ? "text-[#F2D27A]" : "text-[#D8C7A0] hover:text-[#F2D27A]"}
                  group
                `}
              >
                {item.label}

                {/* UNDERLINE LASER CENTRÉ */}
                <span
                  className={`
                    pointer-events-none absolute left-0 right-0 mx-auto -bottom-1 h-[2px]
                    bg-gradient-to-r from-transparent via-[#FFD700] to-transparent
                    transition-all duration-300 ease-out
                    ${active ? "w-full opacity-100" : "w-0 opacity-0"}
                    group-hover:w-full group-hover:opacity-100
                  `}
                  style={{ transformOrigin: "center" }}
                />

                {/* GLOW LASER CENTRÉ */}
                <span
                  className={`
                    pointer-events-none absolute left-0 right-0 mx-auto -bottom-1 h-[6px]
                    blur-md bg-[#FFD700]/40
                    transition-all duration-500 ease-out
                    ${active ? "w-full opacity-100" : "w-0 opacity-0"}
                    group-hover:w-full group-hover:opacity-100
                  `}
                  style={{ transformOrigin: "center" }}
                />

                {/* SCANLINE ANIMÉ */}
                <span
                  className={`
                    pointer-events-none absolute left-0 right-0 mx-auto -bottom-[3px]
                    h-[10px] w-full opacity-0 group-hover:opacity-40
                    ${active ? "opacity-40" : ""}
                    bg-[linear-gradient(180deg,rgba(255,215,0,0.25)_0%,rgba(255,215,0,0.05)_60%,transparent_100%)]
                    animate-scanline
                  `}
                />
              </Link>
            );
          })}
          <AuthStatus />
        </nav>

        {/* HAMBURGER MOBILE */}
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-col gap-[6px] lg:hidden group"
        >
          <span
            className={`h-[3px] w-7 bg-[#F7E9C5] rounded transition-all duration-300 ${
              open ? "rotate-45 translate-y-[9px]" : ""
            }`}
          />
          <span
            className={`h-[3px] w-7 bg-[#F7E9C5] rounded transition-all duration-300 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[3px] w-7 bg-[#F7E9C5] rounded transition-all duration-300 ${
              open ? "-rotate-45 -translate-y-[9px]" : ""
            }`}
          />
        </button>
      </div>

      {/* MENU MOBILE ANIMÉ */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="border-t border-[#D9A441]/10 px-4 py-3">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-black transition-all ${
                    active
                      ? "bg-[#D9A441]/20 text-[#F2D27A] border border-[#D9A441]/40"
                      : "bg-[#160A12]/70 text-[#D8C7A0] border border-[#D9A441]/20 hover:border-[#D9A441]/45 hover:text-[#F2D27A]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-2">
              <AuthStatus />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
