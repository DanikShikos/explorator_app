import type { ReactNode } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { DisplayControls } from "@/components/layout/display-controls";
import { ClientNavLink } from "@/components/layout/client-nav-link";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { navItems } from "@/lib/nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Compass className="size-5" />
            Explorator
          </Link>
          <nav className="min-w-0 flex-1 overflow-x-auto px-3 text-sm">
            {navItems.map((item) => (
              <ClientNavLink key={item.href} href={item.href} className="text-muted-foreground">
                {item.label}
              </ClientNavLink>
            ))}
          </nav>
          <DisplayControls compact />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
      <CommandPalette />
      <RoutePrefetcher />
    </div>
  );
}
