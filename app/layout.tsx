import type { Metadata } from "next";
import Link from "next/link";
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
      <body className="bg-slate-950 text-white">
        <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-black tracking-tight">
              GSF Compet
            </Link>

            <div className="hidden items-center gap-5 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-slate-300 transition hover:text-emerald-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <div className="pt-20">{children}</div>
      </body>
    </html>
  );
}