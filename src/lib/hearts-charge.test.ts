import { describe, expect, it } from "vitest";
import { shouldChargeHeartOnMiss } from "./hearts";

/**
 * RFC-003 charge table — same predicate used by `decrementHeartForMiss`.
 */
describe("shouldChargeHeartOnMiss (BE-005 / RFC-003)", () => {
  it("charges on first-pass available (or missing progress)", () => {
    expect(shouldChargeHeartOnMiss("node-1", "available")).toBe(true);
    expect(shouldChargeHeartOnMiss("node-1", undefined)).toBe(true);
    expect(shouldChargeHeartOnMiss("node-1", "locked")).toBe(true);
  });

  it("does not charge on completed or mastered replay", () => {
    expect(shouldChargeHeartOnMiss("node-1", "completed")).toBe(false);
    expect(shouldChargeHeartOnMiss("node-1", "mastered")).toBe(false);
  });

  it("does not charge due cards without nodeId", () => {
    expect(shouldChargeHeartOnMiss(null, "available")).toBe(false);
    expect(shouldChargeHeartOnMiss(undefined, "available")).toBe(false);
    expect(shouldChargeHeartOnMiss("", "available")).toBe(false);
  });
});
