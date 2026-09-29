"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";

export type BookCatMood = "idle" | "correct" | "wrong" | "outOfHearts" | "cheer";

const MOOD_ALT: Record<BookCatMood, string> = {
  idle: "Учёный кот",
  correct: "Учёный кот — верно",
  cheer: "Учёный кот — ура",
  wrong: "Учёный кот — ошибка",
  outOfHearts: "Учёный кот — нет жизней",
};

/** Colors aligned with public/brand/emblem.png + gown/book accents */
const C = {
  ink: "#1A120E",
  orange: "#F28C28",
  stripe: "#C85A0C",
  cream: "#FFF2DC",
  creamWarm: "#FFE6BC",
  blue: "#1C58B4",
  blueDeep: "#154690",
  brown: "#2A1C14",
  brownLite: "#4A3428",
  red: "#C41E1E",
  gold: "#E8B838",
  pink: "#FF8A90",
  blush: "#FFA8B0",
  blushMark: "#F07880",
  white: "#FFFFFF",
  eye: "#1A120E",
} as const;

type EyeMode = "open" | "happy" | "sadClosed" | "out";

function eyeModeFor(mood: BookCatMood): EyeMode {
  if (mood === "correct" || mood === "cheer") return "happy";
  if (mood === "wrong") return "sadClosed";
  if (mood === "outOfHearts") return "out";
  return "open";
}

/** Emblem face on a body-scale head (not half-canvas) */
const EYE_L = { cx: 84, cy: 78 } as const;
const EYE_R = { cx: 116, cy: 78 } as const;
const LENS_R = 13;
const IRIS_R = 10;
const LID_PAD = 1.5;

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
  const uid = useId().replace(/:/g, "");
  const root = useAnimationControls();
  const torso = useAnimationControls();
  const head = useAnimationControls();
  const lids = useAnimationControls();
  const tail = useAnimationControls();
  const brows = useAnimationControls();

  const eyes = eyeModeFor(mood);
  const open = eyes === "open";
  const happy = eyes === "happy";
  const closedDown = eyes === "sadClosed" || eyes === "out";
  const frown = mood === "wrong" || mood === "outOfHearts";
  const bigSmile = mood === "correct" || mood === "cheer";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      root.stop();
      torso.stop();
      head.stop();
      lids.stop();
      tail.stop();
      brows.stop();

      await Promise.all([
        root.set({ x: 0, y: 0, rotate: 0 }),
        torso.set({ y: 0, scaleY: 1 }),
        head.set({ y: 0, rotate: 0 }),
        lids.set({ scaleY: 0.05 }),
        tail.set({ rotate: 0 }),
        brows.set({ y: 0 }),
      ]);
      if (cancelled) return;

      if (mood === "idle") {
        void torso.start({
          y: [0, -2, 0],
          scaleY: [1, 1.015, 1],
          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        });
        void head.start({
          y: [0, -2.5, 0],
          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        });
        void tail.start({
          rotate: [-5, 6, -5],
          transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
        });
        // Short infrequent blink: lids scale from TOP of each eye downward
        void lids.start({
          scaleY: [0.05, 0.05, 0.05, 1, 0.05, 0.05, 0.05, 0.05],
          transition: {
            duration: 5,
            times: [0, 0.5, 0.62, 0.7, 0.78, 0.86, 0.93, 1],
            repeat: Infinity,
            ease: "easeInOut",
          },
        });
        return;
      }

      if (mood === "correct") {
        void lids.set({ scaleY: 0.05 });
        void tail.start({
          rotate: [0, 12, -3, 0],
          transition: { duration: 0.65, ease: "easeOut" },
        });
        await root.start({
          y: [0, -12, 0],
          transition: { duration: 0.5, ease: "easeOut" },
        });
        return;
      }

      if (mood === "cheer") {
        void lids.set({ scaleY: 0.05 });
        void tail.start({
          rotate: [0, 20, -18, 14, 0],
          transition: { duration: 0.9, ease: "easeInOut" },
        });
        await root.start({
          y: [0, -24, -2, -16, 0],
          transition: { duration: 0.8, ease: "easeOut" },
        });
        return;
      }

      if (mood === "wrong") {
        void lids.set({ scaleY: 0.05 });
        void brows.start({ y: 2, transition: { duration: 0.2 } });
        await root.start({
          x: [0, -6, 6, -4, 4, 0],
          transition: { duration: 0.48, ease: "easeInOut" },
        });
        return;
      }

      // outOfHearts — closed eyes, slow slump
      void lids.set({ scaleY: 0.05 });
      void brows.start({ y: 3, transition: { duration: 0.35 } });
      void torso.start({
        y: [0, 4, 0],
        scaleY: [1, 0.96, 1],
        transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
      });
      void head.start({
        y: [2, 5, 2],
        rotate: [0, -2.5, 0],
        transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
      });
      void tail.start({
        rotate: [-3, 4, -3],
        transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
      });
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [mood, root, torso, head, lids, tail, brows]);

  const leftLens = `book-cat-ll-${uid}`;
  const rightLens = `book-cat-rl-${uid}`;

  const lidSize = (LENS_R + LID_PAD) * 2;
  const lidYL = EYE_L.cy - LENS_R - LID_PAD;
  const lidYR = EYE_R.cy - LENS_R - LID_PAD;
  const lidXL = EYE_L.cx - LENS_R - LID_PAD;
  const lidXR = EYE_R.cx - LENS_R - LID_PAD;

  return (
    <div
      data-testid="book-cat"
      data-mood={mood}
      role="img"
      aria-label={MOOD_ALT[mood]}
      className={cn("inline-flex flex-col items-center gap-1", className)}
    >
      <motion.svg
        animate={root}
        width={size}
        height={size}
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none overflow-visible"
        style={{ width: size, height: size }}
      >
        <defs>
          <clipPath id={leftLens}>
            <circle cx={EYE_L.cx} cy={EYE_L.cy} r={LENS_R} />
          </clipPath>
          <clipPath id={rightLens}>
            <circle cx={EYE_R.cx} cy={EYE_R.cy} r={LENS_R} />
          </clipPath>
        </defs>

        {/* Tail — thick striped J, pivot at base */}
        <motion.g animate={tail} style={{ transformOrigin: "124px 172px" }}>
          <path
            d="M112 172
               C145 160 172 132 168 100
               C166 82 154 72 146 78
               C138 84 146 104 142 122
               C138 142 122 160 112 172 Z"
            fill={C.orange}
            stroke={C.ink}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path d="M148 108 C152 96 156 88 158 82" stroke={C.cream} strokeWidth="10" strokeLinecap="round" />
          <path d="M142 128 C148 116 152 106 154 98" stroke={C.creamWarm} strokeWidth="9" strokeLinecap="round" />
          <path d="M130 148 C138 136 144 126 148 116" stroke={C.cream} strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="152" cy="76" rx="15" ry="13" fill={C.cream} stroke={C.ink} strokeWidth="3" />
        </motion.g>

        {/* Legs + cream toe paws */}
        <g>
          <path
            d="M70 200 Q68 216 74 224 Q84 230 92 224 Q96 216 94 200 Z"
            fill={C.orange}
            stroke={C.ink}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="82" cy="224" rx="15" ry="8.5" fill={C.cream} stroke={C.ink} strokeWidth="2.8" />
          <path d="M75 222 v5.5 M82 223 v5.5 M89 222 v5.5" stroke={C.ink} strokeWidth="1.7" strokeLinecap="round" />

          <path
            d="M106 200 Q104 216 110 224 Q120 230 128 224 Q132 216 130 200 Z"
            fill={C.orange}
            stroke={C.ink}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="118" cy="224" rx="15" ry="8.5" fill={C.cream} stroke={C.ink} strokeWidth="2.8" />
          <path d="M111 222 v5.5 M118 223 v5.5 M125 222 v5.5" stroke={C.ink} strokeWidth="1.7" strokeLinecap="round" />
        </g>

        {/* Body / gown / book — main mass of the figure */}
        <motion.g animate={torso} style={{ transformOrigin: "100px 180px" }}>
          <path
            d="M54 138 Q42 158 46 190 Q50 200 64 196 Q72 160 74 142 Z"
            fill={C.blue}
            stroke={C.ink}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="54" cy="196" rx="12" ry="9.5" fill={C.cream} stroke={C.ink} strokeWidth="2.8" />

          <path
            d="M58 108
               C50 128 48 168 56 206
               Q100 220 144 206
               C152 168 150 128 142 108
               Q100 128 58 108 Z"
            fill={C.blue}
            stroke={C.ink}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path
            d="M82 112 L100 152 L118 112"
            fill={C.cream}
            stroke={C.ink}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path d="M100 120 L100 148" stroke={C.red} strokeWidth="5" strokeLinecap="round" />
          <path
            d="M82 112 L100 142 M118 112 L100 142"
            stroke={C.blueDeep}
            strokeWidth="2"
            opacity="0.45"
          />

          <rect x="122" y="148" width="30" height="44" rx="3.5" fill={C.brown} stroke={C.ink} strokeWidth="3" />
          <rect x="122" y="148" width="7" height="44" rx="2" fill={C.cream} stroke={C.ink} strokeWidth="2" />
          <rect x="122" y="148" width="30" height="6" rx="2" fill={C.creamWarm} stroke={C.ink} strokeWidth="2" />
          <path d="M132 162 h14 M132 172 h14 M132 182 h10" stroke={C.cream} strokeWidth="1.5" opacity="0.65" />
          <ellipse cx="144" cy="186" rx="11" ry="8.5" fill={C.cream} stroke={C.ink} strokeWidth="2.6" />
        </motion.g>

        {/* HEAD — emblem face, body-proportional (~⅓ figure, seated on gown) */}
        <motion.g animate={head} style={{ transformOrigin: "100px 78px" }}>
          {/* Ears */}
          <path
            d="M72 60 L64 36 L90 54 Z"
            fill={C.orange}
            stroke={C.ink}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M72 56 L69 44 L82 53 Z" fill={C.cream} opacity="0.95" />
          <path
            d="M128 60 L136 36 L110 54 Z"
            fill={C.orange}
            stroke={C.ink}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M128 56 L131 44 L118 53 Z" fill={C.cream} opacity="0.95" />

          {/* Head mass — ~rx 34 (was 78 giant) */}
          <ellipse cx="100" cy="76" rx="34" ry="30" fill={C.orange} stroke={C.ink} strokeWidth="2.8" />
          <ellipse cx="100" cy="90" rx="26" ry="18" fill={C.cream} />
          <ellipse cx="100" cy="82" rx="28" ry="9" fill={C.orange} opacity="0.16" />

          {/* Forehead stripes */}
          <path d="M95 54 Q96 62 95 68" stroke={C.stripe} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M100 52 Q100 62 100 70" stroke={C.stripe} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M105 54 Q104 62 105 68" stroke={C.stripe} strokeWidth="2.4" strokeLinecap="round" />

          {/* Cheek stripes */}
          <path d="M70 74 Q78 72 82 76" stroke={C.stripe} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M71 80 Q78 78 83 82" stroke={C.stripe} strokeWidth="2" strokeLinecap="round" />
          <path d="M130 74 Q122 72 118 76" stroke={C.stripe} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M129 80 Q122 78 117 82" stroke={C.stripe} strokeWidth="2" strokeLinecap="round" />

          {/* Blush + emblem slash marks */}
          <ellipse cx="74" cy="92" rx="8" ry="5" fill={C.blush} opacity="0.85" />
          <ellipse cx="126" cy="92" rx="8" ry="5" fill={C.blush} opacity="0.85" />
          <g stroke={C.blushMark} strokeWidth="1.3" strokeLinecap="round" opacity="0.9">
            <path d="M71 90 l3 2.5 M74 89.5 l3 2.5" />
            <path d="M123 90 l3 2.5 M126 89.5 l3 2.5" />
          </g>

          {/* Whiskers */}
          <g stroke={C.ink} strokeWidth="1.3" strokeLinecap="round">
            <path d="M68 84 H58" />
            <path d="M69 89 H56" />
            <path d="M70 94 H59" />
            <path d="M132 84 H142" />
            <path d="M131 89 H144" />
            <path d="M130 94 H141" />
          </g>

          {/* Brows */}
          <motion.g animate={brows}>
            {frown ? (
              <g stroke={C.ink} strokeWidth="2" strokeLinecap="round" fill="none">
                <path d="M74 64 Q82 67 90 65" />
                <path d="M126 64 Q118 67 110 65" />
              </g>
            ) : (
              <g stroke={C.ink} strokeWidth="1.9" strokeLinecap="round" fill="none">
                <path d="M74 65 Q82 62 90 64" />
                <path d="M126 65 Q118 62 110 64" />
              </g>
            )}
          </motion.g>

          {/* Glasses arms */}
          <path d="M66 78 H72" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M134 78 H128" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" />

          {/* Round glasses + emblem sparkle eyes (scaled with head) */}
          <circle cx={EYE_L.cx} cy={EYE_L.cy} r={LENS_R + 1.5} fill={C.white} stroke={C.ink} strokeWidth="3.2" />
          <circle cx={EYE_R.cx} cy={EYE_R.cy} r={LENS_R + 1.5} fill={C.white} stroke={C.ink} strokeWidth="3.2" />
          <path d="M98 78 H102" stroke={C.ink} strokeWidth="2.8" strokeLinecap="round" />

          {open ? (
            <g>
              <circle cx={EYE_L.cx} cy={EYE_L.cy + 0.5} r={IRIS_R} fill={C.eye} />
              <circle cx={EYE_L.cx - 3.5} cy={EYE_L.cy - 3.5} r="3.5" fill={C.white} />
              <circle cx={EYE_L.cx + 3.5} cy={EYE_L.cy + 3.5} r="1.5" fill={C.white} />
              <circle cx={EYE_L.cx - 0.5} cy={EYE_L.cy + 5.5} r="0.9" fill={C.white} />

              <circle cx={EYE_R.cx} cy={EYE_R.cy + 0.5} r={IRIS_R} fill={C.eye} />
              <circle cx={EYE_R.cx - 3.5} cy={EYE_R.cy - 3.5} r="3.5" fill={C.white} />
              <circle cx={EYE_R.cx + 3.5} cy={EYE_R.cy + 3.5} r="1.5" fill={C.white} />
              <circle cx={EYE_R.cx - 0.5} cy={EYE_R.cy + 5.5} r="0.9" fill={C.white} />

              {/* Lids: scaleY from TOP of eye downward (never pupil-center) */}
              <g clipPath={`url(#${leftLens})`}>
                <motion.rect
                  x={lidXL}
                  y={lidYL}
                  width={lidSize}
                  height={lidSize}
                  fill={C.orange}
                  animate={lids}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center top",
                    originX: 0.5,
                    originY: 0,
                  }}
                />
              </g>
              <g clipPath={`url(#${rightLens})`}>
                <motion.rect
                  x={lidXR}
                  y={lidYR}
                  width={lidSize}
                  height={lidSize}
                  fill={C.orange}
                  animate={lids}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center top",
                    originX: 0.5,
                    originY: 0,
                  }}
                />
              </g>
            </g>
          ) : null}

          {happy ? (
            <g stroke={C.ink} strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M74 80 Q84 70 94 80" />
              <path d="M106 80 Q116 70 126 80" />
            </g>
          ) : null}

          {closedDown ? (
            <g stroke={C.ink} strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M74 80 Q84 88 94 80" />
              <path d="M106 80 Q116 88 126 80" />
            </g>
          ) : null}

          {/* Tiny pink nose — emblem */}
          <path
            d="M100 88 L97 92.5 Q100 95 103 92.5 Z"
            fill={C.pink}
            stroke={C.ink}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Mouth */}
          {frown ? (
            <path d="M94 100 Q100 96 106 100" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          ) : bigSmile ? (
            <path
              d="M93 98 Q97 104 100 100 Q103 104 107 98"
              stroke={C.ink}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <path
              d="M94 98 Q97 102 100 99.5 Q103 102 106 98"
              stroke={C.ink}
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Graduation cap — emblem diamond + gold tassel */}
          <ellipse cx="100" cy="48" rx="18" ry="7" fill={C.brown} stroke={C.ink} strokeWidth="2" />
          <path d="M82 48 Q100 54 118 48" stroke={C.brownLite} strokeWidth="1.6" fill="none" opacity="0.5" />
          <path
            d="M100 34 L124 50 L100 56 L76 50 Z"
            fill={C.brown}
            stroke={C.ink}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M100 34 L124 50 L100 50 Z" fill={C.brownLite} opacity="0.28" />
          <circle cx="100" cy="46" r="2.8" fill={C.gold} stroke={C.ink} strokeWidth="1.2" />
          <path d="M100 46 Q90 52 82 64" stroke={C.gold} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path
            d="M79 62 L76 72 M82 62 L82 74 M85 62 L82 72"
            stroke={C.gold}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </motion.g>
      </motion.svg>

      {caption ? (
        <p className="max-w-[10rem] text-center text-xs font-medium text-muted-foreground">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
