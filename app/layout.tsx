import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: {
    default: "ProofRestore — Know your backup will restore",
    template: "%s · ProofRestore",
  },
  description:
    "Verify backup integrity, simulate recovery, and generate evidence-backed proof before disaster strikes.",
  alternates: { canonical: "/" },
  applicationName: "ProofRestore",
  keywords: [
    "backup verification",
    "disaster recovery",
    "recoverability",
    "restore simulation",
  ],
  openGraph: {
    url: "/",
    title: "ProofRestore — Know your backup will restore",
    description:
      "Evidence-backed backup verification and safe restore simulation.",
    type: "website",
    siteName: "ProofRestore",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofRestore — Know your backup will restore",
    description:
      "Evidence-backed backup verification and safe restore simulation.",
  },
  robots: { index: true, follow: true },
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
