"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SequenceOrderBoard({
  steps,
  order,
  disabled,
  onChange,
}: {
  steps: string[];
  order: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const remaining = steps.filter((step) => !order.includes(step));
  const [dragging, setDragging] = useState<{ step: string; x: number; y: number; from: "pool" | "order" } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const dragRef = useRef<{ step: string; from: "pool" | "order"; moved: boolean; startX: number; startY: number } | null>(null);

  function append(step: string) {
    if (disabled || order.includes(step)) {
      return;
    }
    onChange([...order, step]);
  }

  function remove(step: string) {
    if (disabled) {
      return;
    }
    onChange(order.filter((item) => item !== step));
  }

  function insertAt(step: string, index: number) {
    const without = order.filter((item) => item !== step);
    const clamped = Math.max(0, Math.min(index, without.length));
    without.splice(clamped, 0, step);
    onChange(without);
  }

  function dropIndexFromPoint(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY);
    const slot = el?.closest("[data-seq-slot]") as HTMLElement | null;
    if (slot?.dataset.seqSlot != null) {
      return Number(slot.dataset.seqSlot);
    }
    const zone = el?.closest("[data-seq-order-zone]");
    if (zone) {
      return order.length;
    }
    return null;
  }

  function onPointerDown(step: string, from: "pool" | "order", event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { step, from, moved: false, startX: event.clientX, startY: event.clientY };
    setDragging({ step, from, x: event.clientX, y: event.clientY });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active) {
      return;
    }
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved && dx * dx + dy * dy > 36) {
      active.moved = true;
    }
    setDragging({
      step: active.step,
      from: active.from,
      x: event.clientX,
      y: event.clientY,
    });
    if (active.moved) {
      setHoverIndex(dropIndexFromPoint(event.clientX, event.clientY));
    }
  }

  function endDrag(clientX: number, clientY: number) {
    const active = dragRef.current;
    dragRef.current = null;
    setDragging(null);
    setHoverIndex(null);
    if (!active || disabled) {
      return;
    }

    // Tap without movement: click-to-add / click-to-remove
    if (!active.moved) {
      if (active.from === "pool") {
        append(active.step);
      } else {
        remove(active.step);
      }
      return;
    }

    const index = dropIndexFromPoint(clientX, clientY);
    if (index == null) {
      if (active.from === "order") {
        remove(active.step);
      }
      return;
    }

    insertAt(active.step, index);
  }

  return (
    <LayoutGroup>
      <div className="relative space-y-4">
        <p className="text-sm text-muted-foreground">Перетащи шаги в нужный порядок или нажми — они встанут в очередь</p>
        <div>
          <p className="mb-2 text-sm font-medium text-path-ink">Твой порядок</p>
          <div
            data-seq-order-zone
            className="flex min-h-20 flex-wrap gap-2 rounded-2xl border-2 border-dashed border-path/40 bg-path-soft p-3"
          >
            <AnimatePresence mode="popLayout">
              {order.length === 0 && !dragging ? (
                <motion.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground"
                >
                  Перетащи сюда шаги снизу
                </motion.p>
              ) : null}
              {order.map((step, index) => (
                <motion.button
                  key={step}
                  type="button"
                  layout
                  data-seq-slot={index}
                  initial={{ opacity: 0, y: 16, scale: 0.9 }}
                  animate={{
                    opacity: dragging?.step === step ? 0.35 : 1,
                    y: 0,
                    scale: hoverIndex === index ? 1.04 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  disabled={disabled}
                  onPointerDown={(event) => onPointerDown(step, "order", event)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(event) => endDrag(event.clientX, event.clientY)}
                  onPointerCancel={() => {
                    dragRef.current = null;
                    setDragging(null);
                    setHoverIndex(null);
                  }}
                  className={cn(
                    "touch-none rounded-2xl border-2 border-path bg-card px-3 py-2 text-left text-sm font-medium text-path-ink shadow-sm",
                    !disabled && "cursor-grab active:cursor-grabbing",
                    hoverIndex === index && "ring-2 ring-path/40",
                  )}
                >
                  <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-path text-xs text-path-foreground">
                    {index + 1}
                  </span>
                  {step}
                </motion.button>
              ))}
              {hoverIndex === order.length && dragging ? (
                <motion.div
                  key="tail-slot"
                  layout
                  data-seq-slot={order.length}
                  className="h-10 min-w-16 rounded-2xl border-2 border-dashed border-path bg-path/20"
                />
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Доступные шаги</p>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {remaining.map((step) => (
                <motion.button
                  key={step}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: dragging?.step === step ? 0.35 : 1, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  disabled={disabled}
                  onPointerDown={(event) => onPointerDown(step, "pool", event)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(event) => endDrag(event.clientX, event.clientY)}
                  onPointerCancel={() => {
                    dragRef.current = null;
                    setDragging(null);
                    setHoverIndex(null);
                  }}
                  className={cn(
                    "touch-none rounded-2xl border-2 border-border bg-card px-4 py-3 text-left text-sm font-medium shadow-sm",
                    !disabled && "cursor-grab hover:border-path hover:bg-path-soft active:cursor-grabbing active:scale-[0.98]",
                  )}
                >
                  {step}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {dragging ? (
            <motion.div
              key="seq-ghost"
              className="pointer-events-none fixed z-50 rounded-2xl border-2 border-path bg-path-soft px-4 py-3 text-sm font-medium text-path-ink shadow-lg"
              style={{ left: dragging.x + 8, top: dragging.y + 8 }}
              initial={{ opacity: 0.6, scale: 0.95 }}
              animate={{ opacity: 0.95, scale: 1.05 }}
              exit={{ opacity: 0 }}
            >
              {dragging.step}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
