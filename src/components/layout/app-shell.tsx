"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { DisplayControls } from "@/components/layout/display-controls";
import { ClientNavLink } from "@/components/layout/client-nav-link";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { Emblem } from "@/components/brand/Emblem";
import { HeartsIndicator } from "@/components/ui/HeartsIndicator";
import type { AccountLabel } from "@/lib/auth-types";
import type { HeartStatus } from "@/lib/hearts";
import { navItems } from "@/lib/nav";

const authPaths = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

export function AppShell({
  children,
  account,
  hearts,
}: {
  children: ReactNode;
  account?: AccountLabel | null;
  hearts?: HeartStatus | null;
}) {
  const pathname = usePathname();
  const isPublicShare = pathname.startsWith("/share/");
  if (authPaths.has(pathname) || isPublicShare) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar account={account} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/80 bg-card/50 px-4 py-3 backdrop-blur-sm md:hidden">
          <Link
            href="/"
            data-testid="app-emblem"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Emblem size={40} />
            Учёный кот
          </Link>
          <nav className="min-w-0 flex-1 overflow-x-auto px-3 text-sm">
            {navItems.map((item) => (
              <ClientNavLink
                key={item.href}
                href={item.href}
                className="rounded-full px-2 py-1 text-muted-foreground hover:bg-path-soft hover:text-path-ink"
              >
                {item.label}
              </ClientNavLink>
            ))}
          </nav>
          <DisplayControls compact />
          {hearts ? <HeartsIndicator {...hearts} /> : null}
        </header>
        {hearts ? (
          <div className="hidden items-center justify-end border-b border-border/80 bg-card/40 px-6 py-2 md:flex">
            <HeartsIndicator {...hearts} />
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
      <CommandPalette />
      <RoutePrefetcher />
    </div>
  );
}
