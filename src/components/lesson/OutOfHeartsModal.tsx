"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookCat } from "@/components/mascot/BookCat";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatRemaining } from "@/lib/hearts";

export function OutOfHeartsModal({
  open,
  nextHeartAt,
  returnHref,
}: {
  open: boolean;
  nextHeartAt: string | null;
  returnHref: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const countdown = formatRemaining(nextHeartAt, now) ?? "4:00:00";
  const practiceHref = `/practice?return=${encodeURIComponent(returnHref)}`;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md text-center" data-testid="lesson-out-of-hearts">
        <DialogHeader className="items-center">
          <BookCat mood="outOfHearts" size={100} />
          <DialogTitle className="text-2xl">Жизни кончились — отдыхаем</DialogTitle>
          <DialogDescription>
            Котик тоже устал. Сердце нельзя купить за очки: его возвращает короткая практика или таймер.
          </DialogDescription>
        </DialogHeader>
        <Button asChild className="h-11 w-full rounded-2xl bg-path text-path-foreground hover:bg-path/90">
          <Link href={practiceHref} data-testid="practice-button">
            Пройти практику (+1 сердце)
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Следующее сердце через {countdown}</p>
        <Button variant="ghost" asChild className="rounded-2xl">
          <Link href={returnHref}>Вернуться позже</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
