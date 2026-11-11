import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MediCare — Pharmacy Management & POS",
  description:
    "MediCare is a modern pharmacy management, ERP, and point-of-sale platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased text-navy-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
