import { describe, expect, it } from "vitest";
import { removeNullBytes } from "./utils";

describe("removeNullBytes", () => {
  it("removes all null bytes without changing other characters", () => {
    expect(removeNullBytes("ab\0cd\0")).toBe("abcd");
  });

  it("preserves strings that contain no null bytes", () => {
    expect(removeNullBytes("ordinary text")).toBe("ordinary text");
  });
});