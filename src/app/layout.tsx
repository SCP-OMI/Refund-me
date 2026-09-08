import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

/* Anything the system generated — an amount, a reference, a date, a count —
   is set in mono, so figures line up down a column. */
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ overflowX: 'hidden' }}
    >
      <body
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
