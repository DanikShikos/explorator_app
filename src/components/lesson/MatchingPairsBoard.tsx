"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Pair = { left: string; right: string };

export function MatchingPairsBoard({
  pairs,
  rights,
  matches,
  disabled,
  onChange,
}: {
  pairs: Pair[];
  rights: string[];
  matches: Pair[];
  disabled?: boolean;
  onChange: (next: Pair[]) => void;
}) {
  const [dragging, setDragging] = useState<{ left: string; x: number; y: number } | null>(null);
  const [hoverRight, setHoverRight] = useState<string | null>(null);
  const [rejectRight, setRejectRight] = useState<string | null>(null);
  const [snapRight, setSnapRight] = useState<string | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const dragLeftRef = useRef<string | null>(null);

  const matchedLeft = new Set(matches.map((item) => item.left));
  const matchedRight = new Set(matches.map((item) => item.right));

  function endDrag(clientX: number, clientY: number) {
    const left = dragLeftRef.current;
    dragLeftRef.current = null;
    setDragging(null);
    if (!left || disabled) {
      setHoverRight(null);
      return;
    }

    const el = document.elementFromPoint(clientX, clientY);
    const drop = el?.closest("[data-match-right]") as HTMLElement | null;
    const right = drop?.dataset.matchRight;
    setHoverRight(null);

    if (!right || matchedRight.has(right)) {
      setRejectRight(right ?? null);
      window.setTimeout(() => setRejectRight(null), 320);
      return;
    }

    setSnapRight(right);
    window.setTimeout(() => setSnapRight(null), 280);
    onChange([...matches.filter((item) => item.left !== left), { left, right }]);
  }

  function onPointerDown(left: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || matchedLeft.has(left)) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragLeftRef.current = left;
    originRef.current = { x: event.clientX, y: event.clientY };
    setDragging({ left, x: event.clientX, y: event.clientY });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragLeftRef.current) {
      return;
    }
    setDragging({ left: dragLeftRef.current, x: event.clientX, y: event.clientY });
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const drop = el?.closest("[data-match-right]") as HTMLElement | null;
    const right = drop?.dataset.matchRight ?? null;
    setHoverRight(right && !matchedRight.has(right) ? right : null);
  }

  function unmatch(left: string) {
    if (disabled) {
      return;
    }
    onChange(matches.filter((item) => item.left !== left));
  }

  return (
    <div className="relative space-y-3">
      <p className="text-sm text-muted-foreground">Перетащи понятие на подходящую карточку справа</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          {pairs.map((pair) => {
            const done = matchedLeft.has(pair.left);
            const partner = matches.find((item) => item.left === pair.left)?.right;
            return (
              <div key={pair.left} className="space-y-1">
                <motion.button
                  type="button"
                  disabled={disabled || done}
                  onPointerDown={(event) => onPointerDown(pair.left, event)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(event) => endDrag(event.clientX, event.clientY)}
                  onPointerCancel={() => {
                    dragLeftRef.current = null;
                    setDragging(null);
                    setHoverRight(null);
                  }}
                  whileTap={done || disabled ? undefined : { scale: 1.04 }}
                  className={cn(
                    "touch-none block w-full rounded-2xl border-2 px-4 py-3.5 text-left text-base font-medium shadow-sm transition",
                    done
                      ? "cursor-default border-path bg-path-soft text-path-ink"
                      : "cursor-grab border-border bg-card text-foreground active:cursor-grabbing",
                    dragging?.left === pair.left && "opacity-40",
                  )}
                >
                  <span>{pair.left}</span>
                  {partner ? (
                    <span className="mt-1 block text-xs font-normal text-path-ink">→ {partner}</span>
                  ) : null}
                </motion.button>
                {partner && !disabled ? (
                  <button
                    type="button"
                    className="px-1 text-xs text-muted-foreground underline"
                    onClick={() => unmatch(pair.left)}
                  >
                    сбросить пару
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {rights.map((right) => {
            const taken = matchedRight.has(right);
            return (
              <motion.div
                key={right}
                data-match-right={right}
                animate={
                  rejectRight === right
                    ? { x: [0, -8, 8, -6, 6, 0], borderColor: "var(--destructive)" }
                    : snapRight === right
                      ? { scale: [1, 1.06, 1], borderColor: "var(--path)" }
                      : { x: 0, scale: 1 }
                }
                transition={{ duration: 0.32 }}
                className={cn(
                  "rounded-2xl border-2 border-dashed px-4 py-3.5 text-base font-medium transition",
                  taken && "border-solid border-path bg-path-soft text-path-ink",
                  !taken && hoverRight === right && "border-path bg-path-soft shadow-md",
                  !taken && hoverRight !== right && "border-reward bg-accent text-accent-foreground",
                )}
              >
                {right}
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {dragging ? (
          <motion.div
            key="ghost"
            className="pointer-events-none fixed z-50 rounded-2xl border-2 border-path bg-path-soft px-4 py-3 text-base font-medium text-path-ink shadow-lg"
            style={{ left: dragging.x + 8, top: dragging.y + 8 }}
            initial={{ opacity: 0.6, scale: 0.95 }}
            animate={{ opacity: 0.95, scale: 1.05 }}
            exit={{ opacity: 0 }}
          >
            {dragging.left}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
