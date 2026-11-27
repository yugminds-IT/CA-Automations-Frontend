import { describe, expect, it } from "vitest";
import type { FormField } from "./api/forms";
import {
  definitionProblems,
  embedSnippet,
  keyFromText,
  moveItem,
  newField,
  payloadFrom,
  uniqueKey,
  validateValues,
} from "./form-builder";

const field = (over: Partial<FormField> & Pick<FormField, "key" | "type">): FormField => ({
  label: over.key,
  required: false,
  ...over,
});

describe("keyFromText", () => {
  it("makes lowercase keys that start with a letter", () => {
    expect(keyFromText("Full name (as per PAN)")).toBe("full_name_as_per_pan");
    expect(keyFromText("2026 enquiry")).toBe("f_2026_enquiry");
    expect(keyFromText("   ")).toBe("f");
    expect(keyFromText("Café")).toBe("cafe");
  });
});

describe("uniqueKey and newField", () => {
  it("adds a suffix when the key is taken or reserved", () => {
    expect(uniqueKey("city", ["city"])).toBe("city_2");
    expect(uniqueKey("email", [])).toBe("email_2");
    expect(uniqueKey("city", [])).toBe("city");
  });

  it("creates a field with a key unique among the others", () => {
    const f = newField("text", ["your_name"], "Your name");
    expect(f.key).toBe("your_name_2");
    expect(f.required).toBe(false);
  });

  it("gives select fields starter options", () => {
    expect(newField("select", []).options?.length).toBeGreaterThan(0);
  });
});

describe("definitionProblems", () => {
  it("accepts a valid definition", () => {
    expect(
      definitionProblems([
        field({ key: "full_name", type: "text", required: true, role: "name" }),
        field({ key: "mail", type: "email", required: true }),
        field({ key: "service", type: "select", options: ["GST"] }),
      ]),
    ).toEqual([]);
  });

  it("flags reserved keys, duplicate sender roles, empty selects", () => {
    const problems = definitionProblems([
      field({ key: "apiKey", type: "text" }),
      field({ key: "a", type: "email" }),
      field({ key: "b", type: "email" }),
      field({ key: "pick", type: "select", options: [" "] }),
    ]);
    expect(problems.join(" ")).toMatch(/reserved/);
    expect(problems.join(" ")).toMatch(/Only one field can be the email/);
    expect(problems.join(" ")).toMatch(/add at least one option/);
  });

  it("flags keys that start with a digit or contain capitals", () => {
    expect(definitionProblems([field({ key: "1st", type: "text" })])).not.toEqual([]);
    expect(definitionProblems([field({ key: "Name", type: "text" })])).not.toEqual([]);
  });
});

describe("validateValues", () => {
  const fields = [
    field({ key: "full_name", type: "text", required: true }),
    field({ key: "mail", type: "email", required: true }),
    field({ key: "agree", type: "checkbox", required: true }),
    field({ key: "service", type: "select", options: ["GST", "ITR"] }),
  ];

  it("reports missing and malformed answers", () => {
    expect(validateValues(fields, { mail: "nope", service: "VAT" })).toEqual({
      full_name: "Required",
      mail: "Enter a valid email address",
      agree: "Please tick this box",
      service: "Choose one of the options",
    });
  });

  it("passes a complete submission", () => {
    expect(
      validateValues(fields, { full_name: "Meera", mail: "m@x.com", agree: true, service: "GST" }),
    ).toEqual({});
  });

  it("leaves out empty optional answers from the payload and sends booleans", () => {
    expect(
      payloadFrom(fields, { full_name: "  Meera ", mail: "", agree: true, service: "" }),
    ).toEqual({ full_name: "Meera", agree: true });
  });
});

describe("moveItem", () => {
  it("moves an item and ignores out-of-range moves", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b"], 1, 0)).toEqual(["b", "a"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});

describe("embedSnippet", () => {
  it("escapes quotes and angle brackets in the title and url", () => {
    const html = embedSnippet('https://x.test/f/a"b', 'Ask <us> "now"');
    expect(html).toContain('src="https://x.test/f/a&quot;b"');
    expect(html).toContain('title="Ask &lt;us> &quot;now&quot;"');
    expect(html.startsWith("<iframe")).toBe(true);
  });
});
