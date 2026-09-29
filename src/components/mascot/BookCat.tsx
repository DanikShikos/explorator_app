"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BookCatMood = "idle" | "correct" | "wrong" | "outOfHearts" | "cheer";

const moodMotion: Record<BookCatMood, { y: number[]; rotate: number[]; scale: number[] }> = {
  idle: { y: [0, -3, 0], rotate: [0, 2, 0], scale: [1, 1.02, 1] },
  correct: { y: [0, -10, 0], rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] },
  wrong: { y: [0, 2, 0], rotate: [0, -12, 12, -6, 0], scale: [1, 0.94, 1] },
  outOfHearts: { y: [0, 4, 0], rotate: [0, -4, 0], scale: [1, 0.92, 1] },
  cheer: { y: [0, -12, 0], rotate: [0, 6, -6, 0], scale: [1, 1.15, 1] },
};

const frames: Record<BookCatMood, string> = {
  idle: "/mascot/idle.png",
  correct: "/mascot/correct.png",
  cheer: "/mascot/cheer.png",
  wrong: "/mascot/wrong.png",
  outOfHearts: "/mascot/out-of-hearts.png",
};

export function BookCat({
  mood = "idle",
  className,
  size = 96,
  caption,
}: {
  mood?: BookCatMood;
  className?: string;
  size?: number;
  caption?: string;
}) {
  return (
    <div
      data-testid="book-cat"
      data-mood={mood}
      className={cn("inline-flex flex-col items-center gap-1", className)}
    >
      <motion.img
        src={frames[mood]}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="object-contain"
        style={{ width: size, height: size }}
        animate={moodMotion[mood]}
        transition={{
          duration: mood === "idle" ? 2.4 : 0.55,
          repeat: mood === "idle" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
      {caption ? <p className="max-w-[10rem] text-center text-xs font-medium text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
