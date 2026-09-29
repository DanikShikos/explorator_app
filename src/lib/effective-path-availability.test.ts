import { describe, expect, it } from "vitest";
import { effectivePathAvailability } from "./learning-path-gate";

const sampleNode = { id: "n1", title: "Теория" };

describe("effectivePathAvailability (BE-009)", () => {
  it("pending + stored nodes → approved + nodes", () => {
    expect(effectivePathAvailability("pending", [sampleNode])).toEqual({
      status: "approved",
      nodes: [sampleNode],
    });
  });

  it("approved + nodes → approved + nodes", () => {
    expect(effectivePathAvailability("approved", [sampleNode])).toEqual({
      status: "approved",
      nodes: [sampleNode],
    });
  });

  it("rejected → empty playable even if raw nodes passed in", () => {
    expect(effectivePathAvailability("rejected", [sampleNode])).toEqual({
      status: "rejected",
      nodes: [],
    });
  });

  it("pending + no nodes → pending + empty", () => {
    expect(effectivePathAvailability("pending", [])).toEqual({
      status: "pending",
      nodes: [],
    });
  });

  it("approved + no nodes → approved + empty", () => {
    expect(effectivePathAvailability("approved", [])).toEqual({
      status: "approved",
      nodes: [],
    });
  });
});
