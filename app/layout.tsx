import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "GSF Compet",
  description: "Compétitions EA FC 26 de la Guardian's Family",
};

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Compétitions", href: "/competitions" },
  { label: "Équipes", href: "/equipes" },
  { label: "Matchs", href: "/matchs" },
  { label: "Classement", href: "/classement" },
  { label: "Admin", href: "/admin" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#0B0610] text-[#F7E9C5]">
        <header className="fixed left-0 top-0 z-50 w-full border-b border-[#D9A441]/20 bg-[#0B0610]/90 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo-gf.png"
                alt="Guardian's Family"
                width={46}
                height={46}
                className="rounded-full border border-[#D9A441]/50 shadow-[0_0_20px_rgba(217,164,65,0.25)]"
                priority
              />

              <div>
                <p className="text-lg font-black tracking-tight text-[#F7E9C5]">
                  GSF Compet
                </p>
                <p className="text-xs text-[#D8C7A0]">
                  Guardian&apos;s Family
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-5 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-[#D8C7A0] transition hover:text-[#F2D27A]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <div className="pt-24">{children}</div>
      </body>
    </html>
  );
}