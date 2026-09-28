"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookCat, type BookCatMood } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PathNotice({
  mood = "idle",
  caption,
  title,
  description,
  tone = "path",
  children,
}: {
  mood?: BookCatMood;
  caption?: string;
  title: string;
  description: string;
  tone?: "path" | "alert";
  children?: ReactNode;
}) {
  return (
    <section
      role={tone === "alert" ? "alert" : "status"}
      className={cn(
        "rounded-3xl border p-6 sm:p-8",
        tone === "alert" ? "border-destructive/40 bg-path-soft" : "border-border bg-path-soft",
      )}
    >
      <div className="flex flex-col items-center text-center">
        <BookCat mood={mood} size={120} caption={caption} />
        <h2 className="mt-3 text-2xl font-semibold text-path-ink">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </section>
  );
}

export function PathRetryButton({ children = "Попробовать снова" }: { children?: string }) {
  const router = useRouter();
  return (
    <Button
      className="h-12 rounded-2xl bg-path px-6 text-base font-semibold text-path-foreground hover:bg-path/90"
      type="button"
      onClick={() => router.refresh()}
    >
      {children}
    </Button>
  );
}
