"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DisplayControls } from "@/components/layout/display-controls";
import { ClientNavLink } from "@/components/layout/client-nav-link";
import type { AccountLabel } from "@/lib/auth-types";

export function AppSidebar({ account }: { account?: AccountLabel | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Compass className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight">Explorator</p>
          <p className="text-xs text-muted-foreground">Учебная платформа</p>
        </div>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <ClientNavLink
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
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
          <Link href="/profile" className="block rounded-md px-3 py-2 hover:bg-accent">
            <p className="truncate text-sm font-medium">{account.name}</p>
            <p className="truncate text-xs text-muted-foreground">{account.email}</p>
          </Link>
        </div>
      ) : null}
      <div className="p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between text-muted-foreground"
          onClick={() => window.dispatchEvent(new Event("explorator:open-command"))}
        >
          <span className="flex items-center gap-2">
            <Search className="size-4" />
            Поиск
          </span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </Button>
      </div>
    </aside>
  );
}
