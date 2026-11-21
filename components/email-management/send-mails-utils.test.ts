import { describe, expect, it } from "vitest";
import {
  cleanAndSubstituteVars,
  stripChips,
  substituteVars,
  substituteVarsHtml,
  transformClient,
} from "./send-mails-utils";

const evil = '<img src=x onerror="alert(1)">';

describe("variable substitution", () => {
  it("fills known vars and blanks unknown ones in plain text", () => {
    expect(substituteVars("Hi {{client_name}}{{nope}}", { client_name: "Asha" })).toBe("Hi Asha");
  });

  it("escapes values when substituting into HTML", () => {
    expect(substituteVarsHtml("<p>{{client_name}}</p>", { client_name: evil })).toBe(
      "<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>",
    );
  });

  it("does not let a client name inject markup through the editor preview", () => {
    const editorHtml = 'Dear <span contenteditable="false">{{client_name}}</span>, from {{company_name}}';
    const out = cleanAndSubstituteVars(editorHtml, { client_name: evil, company_name: evil });

    const host = document.createElement("div");
    host.innerHTML = out;
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toBe(`Dear ${evil}, from ${evil}`);
  });

  it("turns chips back into {{var}} text for sending", () => {
    expect(stripChips('Hi <span contenteditable="false">{{client_name}}</span>!')).toBe("Hi {{client_name}}!");
  });
});

describe("transformClient", () => {
  it("normalises camelCase and snake_case client payloads", () => {
    expect(
      transformClient({ id: 1, client_name: "A", company_name: "C", business_type: "LLP", phone_number: "9", services: [{ id: 2, name: "GST" }, { id: 3 }] }),
    ).toEqual({
      id: 1, name: "A", email: "", companyName: "C", businessType: "LLP",
      city: undefined, status: undefined, phone: "9", services: [{ id: 2, name: "GST" }],
    });
    expect(transformClient({ id: 2, businessType: { name: "Firm" } }).businessType).toBe("Firm");
  });
});
