import type { Metadata } from "next";
import "./global.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Guardian's",
  description: "Site officiel de la Guardian's",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#0B1B33] text-[#CFC6AB]">
        <Header />
        {children}
      </body>
    </html>
  );
}