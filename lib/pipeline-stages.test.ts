import { describe, expect, it } from "vitest";
import { boardStages, stageOptions } from "./pipeline-stages";

const stages = [
  { id: 1, name: "New", isActive: true },
  { id: 2, name: "Contacted", isActive: false },
  { id: 3, name: "Won", isActive: true },
];

describe("pipeline stages", () => {
  it("keeps a turned-off stage on the board only while a lead is still in it", () => {
    expect(boardStages(stages, []).map((s) => s.name)).toEqual(["New", "Won"]);
    expect(boardStages(stages, [{ stageId: 2 }]).map((s) => s.name)).toEqual(["New", "Contacted", "Won"]);
  });

  it("offers turned-on stages in the dropdown, and the lead's own stage when that one is off", () => {
    expect(stageOptions(stages).map((s) => s.id)).toEqual([1, 3]);
    expect(stageOptions(stages, 2).map((s) => s.id)).toEqual([1, 2, 3]);
  });
});
