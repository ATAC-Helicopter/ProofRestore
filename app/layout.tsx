import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofRestore — Know your backup will restore",
  description:
    "Verify backup integrity, simulate recovery, and generate evidence-backed proof before disaster strikes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
