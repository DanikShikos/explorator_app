"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { formatRemaining, type HeartStatus } from "@/lib/hearts";

export function HeartsIndicator({ hearts, maxHearts, nextHeartAt }: HeartStatus) {
  const router = useRouter();
  const pathname = usePathname();
  const practiceHref = pathname.startsWith("/books/")
    ? `/practice?return=${encodeURIComponent(pathname)}`
    : "/practice";
  const refreshed = useRef(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const countdown = formatRemaining(nextHeartAt, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === "0:00:00" && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [countdown, router]);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-semibold"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Жизни: ${hearts} из ${maxHearts}`}
      >
        <Heart className="size-4 fill-rose-500 text-rose-500" />
        {hearts}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border bg-popover p-4 text-sm shadow-lg">
          <p className="font-medium">Жизни {hearts}/{maxHearts}</p>
          <p className="mt-1 text-muted-foreground">
            {hearts >= maxHearts
              ? "Все сердца на месте. Ошибка в уроке снимет одно."
              : `Следующее сердце через ${countdown}. Практика или 4 часа — без покупки за очки.`}
          </p>
          <Link
            href={practiceHref}
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-2xl bg-path px-3 font-medium text-path-foreground hover:bg-path/90"
            onClick={() => setOpen(false)}
          >
            Заработать сердце в практике
          </Link>
        </div>
      ) : null}
    </div>
  );
}
