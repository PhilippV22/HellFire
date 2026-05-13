import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HellFire",
  description: "Local civilian OSINT and crisis situation dashboard.",
  icons: {
    icon: "/brand/hellfire/app-icons/globe-dark.png",
    apple: "/brand/hellfire/app-icons/globe-red.png"
  }
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
