import { describe, expect, it } from "vitest";
import { HEART_REFILL_MS, applyHeartRefill } from "./hearts";

describe("applyHeartRefill", () => {
  const start = new Date("2026-09-28T12:00:00.000Z");

  it("does not bank hearts above the maximum", () => {
    const result = applyHeartRefill(5, 5, new Date(start.getTime() - HEART_REFILL_MS * 3), start);
    expect(result.hearts).toBe(5);
    expect(result.gained).toBe(0);
  });

  it("adds one heart per four hours and keeps the leftover time", () => {
    const last = new Date(start.getTime() - HEART_REFILL_MS * 2 - 30 * 60 * 1000);
    const result = applyHeartRefill(1, 5, last, start);
    expect(result.hearts).toBe(3);
    expect(result.lastHeartRefillAt.toISOString()).toBe(new Date(last.getTime() + HEART_REFILL_MS * 2).toISOString());
  });

  it("stops the timer once the hearts are full", () => {
    const result = applyHeartRefill(4, 5, new Date(start.getTime() - HEART_REFILL_MS * 3), start);
    expect(result.hearts).toBe(5);
    expect(result.lastHeartRefillAt.toISOString()).toBe(start.toISOString());
  });
});
