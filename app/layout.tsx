import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HellFire Civil Situation Monitor",
  description: "MVP for civilian crisis situation awareness with mock data."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
