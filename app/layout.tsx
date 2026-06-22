import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "GSF Compet",
  description:
    "Site officiel Guardian's Family pour gérer les compétitions EA FC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-[#0B0610] text-[#F7E9C5]">
        <Header />
        {children}
      </body>
    </html>
  );
}
