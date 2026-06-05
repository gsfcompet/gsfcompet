import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AuthStatus from "@/components/AuthStatus";

export const metadata: Metadata = {
  title: "GSF Compet",
  description: "Site officiel Guardian's Family pour gérer les compétitions EA FC.",
};

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Compétitions", href: "/competitions" },
  { label: "Équipes", href: "/equipes" },
  { label: "Gazette", href: "/gazette" },
  { label: "Espace membre", href: "/membre" },
  { label: "Admin", href: "/admin" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-[#0B0610] text-[#F7E9C5]">
        <header className="sticky top-0 z-50 border-b border-[#D9A441]/20 bg-[#0B0610]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D9A441]/40 bg-[#160A12] shadow-lg shadow-black/30">
                <img
                  src="/logo-gf.png"
                  alt="Guardian's Family"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 leading-tight">
                <p className="truncate text-base font-black text-[#F7E9C5] sm:text-lg">
                  Guardian&apos;s Family
                </p>
                <p className="truncate text-xs text-[#D8C7A0] sm:text-sm">
                  GSF Compet
                </p>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-4">
              <nav className="hidden items-center gap-5 lg:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium text-[#D8C7A0] transition hover:text-[#F2D27A]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <AuthStatus />
            </div>
          </div>

          <nav className="border-t border-[#D9A441]/10 px-4 py-2 lg:hidden">
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full border border-[#D9A441]/20 bg-[#160A12]/70 px-3 py-2 text-xs font-black text-[#D8C7A0] transition hover:border-[#D9A441]/45 hover:text-[#F2D27A]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
