import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Дом",
  description: "Приватный хаб для нашей семьи",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F0E8" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1714" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={geist.variable} suppressHydrationWarning>
      <body className="h-full">
        {children}
      </body>
    </html>
  );
}
