"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Compétitions", href: "/competitions" },
  { label: "Équipes", href: "/equipes" },
  { label: "Gazette", href: "/gazette" },
  { label: "Espace membre", href: "/membre" },
  { label: "Admin", href: "/admin" },
];

export default function Header() {
  const pathname = usePathname();

  const [shrink, setShrink] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShrink(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b border-[#D9A441]/20 backdrop-blur-xl transition-all duration-300 ${
        shrink
          ? "bg-[#0B0610]/92 py-1 shadow-lg shadow-black/40"
          : "bg-[#0B0610]/95 py-3"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 transition-all"
          onClick={() => setOpen(false)}
        >
          <div
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D9A441]/40 bg-[#160A12] shadow-lg shadow-black/30 transition-all duration-300 group-hover:scale-105 ${
              shrink ? "h-9 w-9" : "h-12 w-12"
            }`}
          >
            <span className="absolute inset-0 rounded-full bg-[#D9A441]/20 opacity-60 blur-xl" />

            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D9A441]/40 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-40" />

            <Image
              src="/logo-gf.png"
              alt="Guardian's Family"
              fill
              sizes={shrink ? "36px" : "48px"}
              className="relative z-10 object-cover transition-all duration-300 group-hover:brightness-125"
              priority
            />
          </div>

          <div className="min-w-0 leading-tight">
            <p
              className={`truncate font-black text-[#F7E9C5] transition-all ${
                shrink ? "text-sm" : "text-lg"
              }`}
            >
              Guardian&apos;s Family
            </p>

            <p
              className={`truncate text-[#D8C7A0] transition-all ${
                shrink ? "text-[10px]" : "text-sm"
              }`}
            >
              GSF Compet
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-4">
          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative text-sm font-medium transition-all duration-200 ${
                    active
                      ? "text-[#F2D27A]"
                      : "text-[#D8C7A0] hover:text-[#F2D27A]"
                  }`}
                >
                  {item.label}

                  <span
                    className={`pointer-events-none absolute -bottom-1 left-0 right-0 mx-auto h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent transition-all duration-300 ease-out ${
                      active ? "w-full opacity-100" : "w-0 opacity-0"
                    } group-hover:w-full group-hover:opacity-100`}
                  />

                  <span
                    className={`pointer-events-none absolute -bottom-1 left-0 right-0 mx-auto h-[6px] bg-[#FFD700]/40 blur-md transition-all duration-500 ease-out ${
                      active ? "w-full opacity-100" : "w-0 opacity-0"
                    } group-hover:w-full group-hover:opacity-100`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden sm:block">
            <AuthStatus />
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex flex-col gap-[6px] rounded-lg border border-[#D9A441]/25 bg-[#160A12]/70 p-2 transition hover:border-[#D9A441]/50 lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            <span
              className={`h-[3px] w-7 rounded bg-[#F7E9C5] transition-all duration-300 ${
                open ? "translate-y-[9px] rotate-45" : ""
              }`}
            />

            <span
              className={`h-[3px] w-7 rounded bg-[#F7E9C5] transition-all duration-300 ${
                open ? "opacity-0" : ""
              }`}
            />

            <span
              className={`h-[3px] w-7 rounded bg-[#F7E9C5] transition-all duration-300 ${
                open ? "-translate-y-[9px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 lg:hidden ${
          open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="border-t border-[#D9A441]/10 px-4 py-3">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg border px-4 py-3 text-sm font-black transition-all ${
                    active
                      ? "border-[#D9A441]/40 bg-[#D9A441]/20 text-[#F2D27A]"
                      : "border-[#D9A441]/20 bg-[#160A12]/70 text-[#D8C7A0] hover:border-[#D9A441]/45 hover:text-[#F2D27A]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-2 rounded-lg border border-[#D9A441]/20 bg-[#160A12]/70 px-4 py-3 sm:hidden">
              <AuthStatus />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
