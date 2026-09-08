import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-plex-condensed",
});

export const metadata: Metadata = {
  title: "Refunds · 1337",
  description: "The 1337 reimbursement workspace for students and finance teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ overflowX: 'hidden' }}>
      <body 
        className={`${plexSans.variable} ${plexCondensed.variable}`} 
        suppressHydrationWarning
        style={{ 
          margin: 0, 
          padding: 0, 
          overflowX: 'hidden',
          minHeight: '100vh'
        }}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
