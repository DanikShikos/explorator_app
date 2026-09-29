import { describe, expect, it } from "vitest";
import { HEART_REFILL_MS, applyHeartRefill, formatRemaining, heartStatus } from "./hearts";

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

  it("clamps negative stored hearts to zero before refill math", () => {
    const result = applyHeartRefill(-2, 5, start, start);
    expect(result.hearts).toBe(0);
    expect(result.gained).toBe(0);
  });

  it("does not refill within the four-hour window", () => {
    const last = new Date(start.getTime() - HEART_REFILL_MS + 60_000);
    const result = applyHeartRefill(0, 5, last, start);
    expect(result.hearts).toBe(0);
    expect(result.gained).toBe(0);
  });
});

describe("heartStatus", () => {
  it("hides the next-heart timer when full", () => {
    expect(heartStatus(5, 5, new Date()).nextHeartAt).toBeNull();
  });

  it("exposes nextHeartAt for the 4-hour practice/timer gate when empty", () => {
    const last = new Date("2026-09-28T12:00:00.000Z");
    const status = heartStatus(0, 5, last);
    expect(status.hearts).toBe(0);
    expect(status.nextHeartAt).toBe(new Date(last.getTime() + HEART_REFILL_MS).toISOString());
  });
});

describe("formatRemaining", () => {
  it("formats the countdown used by the out-of-hearts modal", () => {
    const now = Date.parse("2026-09-28T12:00:00.000Z");
    const target = new Date(now + 90 * 60 * 1000).toISOString();
    expect(formatRemaining(target, now)).toBe("1:30:00");
    expect(formatRemaining(null, now)).toBeNull();
  });
});
