"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DisplayControls } from "@/components/layout/display-controls";
import { ClientNavLink } from "@/components/layout/client-nav-link";
import { Emblem } from "@/components/brand/Emblem";
import type { AccountLabel } from "@/lib/auth-types";

export function AppSidebar({ account }: { account?: AccountLabel | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <Link
        href="/"
        data-testid="app-emblem"
        className="flex items-center gap-3 px-4 py-4 transition-opacity hover:opacity-90"
      >
        <Emblem size={64} />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Учёный кот</p>
          <p className="text-xs text-muted-foreground">Учись легко</p>
        </div>
      </Link>
      <Separator className="bg-sidebar-border/80" />
      <nav className="flex flex-1 flex-col gap-1.5 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <ClientNavLink
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-path text-path-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-path-soft hover:text-path-ink",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </ClientNavLink>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <DisplayControls />
      </div>
      {account ? (
        <div className="px-3 pb-1">
          <Link
            href="/profile"
            className="block rounded-2xl px-3 py-2 hover:bg-path-soft hover:text-path-ink"
          >
            <p className="truncate text-sm font-medium">{account.name}</p>
            <p className="truncate text-xs text-muted-foreground">{account.email}</p>
          </Link>
        </div>
      ) : null}
      <div className="p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between rounded-2xl border-sidebar-border bg-card/60 text-muted-foreground hover:bg-path-soft hover:text-path-ink"
          onClick={() => window.dispatchEvent(new Event("explorator:open-command"))}
        >
          <span className="flex items-center gap-2">
            <Search className="size-4" />
            Поиск
          </span>
          <kbd className="rounded-lg border border-sidebar-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            Ctrl K
          </kbd>
        </Button>
      </div>
    </aside>
  );
}
