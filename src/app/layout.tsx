import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { checkAndRegenHearts } from "@/lib/hearts-store";
import { accountLabel, getOptionalUser } from "@/lib/current-user";
import type { HeartStatus } from "@/lib/hearts";
import "./globals.css";

const sans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Учёный кот — заметки и учёба",
  description: "Учись легко. Заметки, учебные тесты и понятный прогресс.",
  applicationName: "Учёный кот",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#3d5a80",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser();
  let hearts: HeartStatus | null = null;
  if (user) {
    try {
      hearts = await checkAndRegenHearts(user.id);
    } catch (error) {
      if (error && typeof error === "object" && "digest" in error && String(error.digest).includes("NEXT_REDIRECT")) {
        throw error;
      }
      hearts = null;
    }
  }

  return (
    <html lang="ru">
      <body className={`${sans.variable} ${mono.variable} font-sans`}>
        <AppShell account={user ? accountLabel(user) : null} hearts={hearts}>{children}</AppShell>
      </body>
    </html>
  );
}
