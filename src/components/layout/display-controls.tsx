"use client";

import { Monitor, Moon, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Тёмная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor },
] as const;

type Theme = (typeof themes)[number]["value"];
type Scale = "small" | "medium" | "large";

function applyPreferences(theme: Theme, scale: Scale) {
  const root = document.documentElement;
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
  root.dataset.uiScale = scale;
}

export function DisplayControls({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [scale, setScale] = useState<Scale>("medium");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("explorator-theme") as Theme | null) ?? "system";
    const savedScale = (localStorage.getItem("explorator-scale") as Scale | null) ?? "medium";
    setTheme(savedTheme);
    setScale(savedScale);
    applyPreferences(savedTheme, savedScale);
  }, []);

  function changeTheme(value: Theme) {
    setTheme(value);
    localStorage.setItem("explorator-theme", value);
    applyPreferences(value, scale);
  }

  function changeScale(value: Scale) {
    setScale(value);
    localStorage.setItem("explorator-scale", value);
    applyPreferences(theme, value);
  }

  return (
    <div className={cn("space-y-3", compact && "flex items-center gap-2 space-y-0")}>
      <div className={cn("flex items-center gap-1", !compact && "justify-between")}>
        {!compact ? <span className="text-xs text-muted-foreground">Оформление</span> : null}
        <div className="flex rounded-md border bg-background p-0.5">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={theme === value}
              onClick={() => changeTheme(value)}
              className={cn("flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground", theme === value && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div className={cn("flex items-center gap-1", !compact && "justify-between")}>
        {!compact ? <span className="text-xs text-muted-foreground">Размер текста</span> : null}
        <div className="flex rounded-md border bg-background p-0.5">
          <button type="button" title="Уменьшить интерфейс" aria-label="Уменьшить интерфейс" onClick={() => changeScale("small")} className={cn("flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent", scale === "small" && "bg-primary text-primary-foreground hover:bg-primary")}>
            <ZoomOut className="size-3.5" />
          </button>
          <button type="button" title="Обычный размер" aria-label="Обычный размер" onClick={() => changeScale("medium")} className={cn("flex size-7 items-center justify-center rounded-sm text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent", scale === "medium" && "bg-primary text-primary-foreground hover:bg-primary")}>
            A
          </button>
          <button type="button" title="Увеличить интерфейс" aria-label="Увеличить интерфейс" onClick={() => changeScale("large")} className={cn("flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent", scale === "large" && "bg-primary text-primary-foreground hover:bg-primary")}>
            <ZoomIn className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
