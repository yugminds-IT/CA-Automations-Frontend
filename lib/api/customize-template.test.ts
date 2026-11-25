import { describe, it, expect, vi, beforeEach } from "vitest";

const { createTemplate, updateTemplate } = vi.hoisted(() => ({ createTemplate: vi.fn(), updateTemplate: vi.fn() }));
vi.mock("./email-templates", () => ({ createTemplate, updateTemplate }));

import { customizeMasterTemplate } from "./index";

const master = { id: 1, category: "service", type: "gst_filing", name: "GST Filing" };
const edits = { subject: "S", body: "B" };

describe("customizeMasterTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an org copy with the master's category, type and name, never patching the master", async () => {
    await customizeMasterTemplate(master, undefined, edits);
    expect(createTemplate).toHaveBeenCalledWith({ category: "service", type: "gst_filing", name: "GST Filing", ...edits });
    expect(updateTemplate).not.toHaveBeenCalled();
  });

  it("updates the org's existing copy when there is one", async () => {
    await customizeMasterTemplate(master, 42, edits);
    expect(updateTemplate).toHaveBeenCalledWith(42, edits);
    expect(createTemplate).not.toHaveBeenCalled();
  });
});
