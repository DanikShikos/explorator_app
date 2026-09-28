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
  const eyesOpen = mood !== "outOfHearts";
  const smile = mood === "correct" || mood === "cheer";
  const frown = mood === "wrong" || mood === "outOfHearts";
  const blush = mood === "correct" || mood === "cheer";

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        animate={moodMotion[mood]}
        transition={{
          duration: mood === "idle" ? 2.4 : 0.55,
          repeat: mood === "idle" ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        <ellipse cx="60" cy="108" rx="28" ry="6" fill="#D4C4A8" opacity="0.45" />
        {/* book */}
        <rect x="18" y="62" width="44" height="34" rx="4" fill="#F4E4C1" stroke="#C4A574" strokeWidth="2" />
        <path d="M40 62v34" stroke="#C4A574" strokeWidth="2" />
        <path d="M24 72h12M24 80h12M46 72h12M46 80h10" stroke="#B8956A" strokeWidth="1.5" strokeLinecap="round" />
        {/* body */}
        <ellipse cx="72" cy="70" rx="28" ry="26" fill="#F2C9A0" />
        {/* ears */}
        <path d="M48 48l-8-18 16 10z" fill="#F2C9A0" stroke="#E0A878" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M90 48l8-18-16 10z" fill="#F2C9A0" stroke="#E0A878" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M50 44l-4-10 8 6z" fill="#F5A889" />
        <path d="M88 44l4-10-8 6z" fill="#F5A889" />
        {/* face */}
        <circle cx="72" cy="58" r="22" fill="#F7D4B0" />
        {blush ? (
          <>
            <ellipse cx="58" cy="64" rx="4" ry="2.5" fill="#F5A889" opacity="0.7" />
            <ellipse cx="86" cy="64" rx="4" ry="2.5" fill="#F5A889" opacity="0.7" />
          </>
        ) : null}
        {eyesOpen ? (
          <>
            <ellipse cx="64" cy="56" rx="3.2" ry={mood === "wrong" ? 2 : 3.5} fill="#3D2C1E" />
            <ellipse cx="80" cy="56" rx="3.2" ry={mood === "wrong" ? 2 : 3.5} fill="#3D2C1E" />
            <circle cx="65" cy="55" r="1" fill="white" />
            <circle cx="81" cy="55" r="1" fill="white" />
          </>
        ) : (
          <>
            <path d="M60 56h8" stroke="#3D2C1E" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M76 56h8" stroke="#3D2C1E" strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
        {/* nose */}
        <path d="M72 61l-3 3h6z" fill="#E8896A" />
        {/* mouth */}
        {smile ? (
          <path d="M66 68c2.5 4 9.5 4 12 0" stroke="#3D2C1E" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : frown ? (
          <path d="M66 72c2.5-3.5 9.5-3.5 12 0" stroke="#3D2C1E" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M69 68c1.5 2 4.5 2 6 0" stroke="#3D2C1E" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        )}
        {/* paws on book */}
        <ellipse cx="36" cy="88" rx="7" ry="5" fill="#F2C9A0" />
        <ellipse cx="52" cy="90" rx="7" ry="5" fill="#F2C9A0" />
        {/* tail */}
        <path
          d="M98 78c10 2 14 14 8 22"
          stroke="#E0A878"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </motion.svg>
      {caption ? <p className="max-w-[10rem] text-center text-xs font-medium text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
