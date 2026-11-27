import { describe, expect, it } from "vitest";
import {
  chipText,
  cleanAndSubstituteVars,
  stripChips,
  substituteVars,
  substituteVarsHtml,
  leadAsRecipient,
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

  it("uses data-var, not the visible label, for labelled chips", () => {
    const chip = '<span contenteditable="false" data-var="{{client_name}}">Client Name</span>';
    expect(stripChips(`Hi ${chip}!`)).toBe("Hi {{client_name}}!");
    expect(cleanAndSubstituteVars(`Hi ${chip}!`, { client_name: "Asha" })).toBe("Hi Asha!");
  });

  it("reads a subject tag editor back as plain text with {{tokens}}", () => {
    const el = document.createElement("div");
    el.innerHTML = 'Login &amp; Portal – <span contenteditable="false" data-var="{{org_name}}">Org Name</span>&nbsp;<br>';
    expect(chipText(el)).toBe("Login & Portal – {{org_name}} ");
  });
});

describe("transformClient", () => {
  it("normalises camelCase and snake_case client payloads", () => {
    expect(
      transformClient({ id: 1, client_name: "A", company_name: "C", business_type: "LLP", phone_number: "9", services: [{ id: 2, name: "GST" }, { id: 3 }] }),
    ).toEqual({
      id: 1, name: "A", email: "", companyName: "C", businessType: "LLP",
      city: undefined, status: undefined, phone: "9", services: [{ id: 2, name: "GST" }], tags: [],
    });
    expect(transformClient({ id: 2, businessType: { name: "Firm" } }).businessType).toBe("Firm");
  });
});

describe("leadAsRecipient", () => {
  it("keeps a lead id from colliding with a client id and carries the fields a mail can fill", () => {
    const r = leadAsRecipient({
      id: 5, name: "Ravi", email: "r@x.com", phone: null, company: "Rice mills",
      status: "open", tags: ["hot"], source: "Form", nextFollowUpAt: "2026-12-01T10:00:00.000Z",
    });
    expect(r.id).toBe("lead:5");
    expect(r.email).toBe("r@x.com");
    expect(r.companyName).toBe("Rice mills");
    expect(r.followUpOn).toBe("2026-12-01");
    expect(r.additionalNotes).toBe("Source: Form");
  });
});
