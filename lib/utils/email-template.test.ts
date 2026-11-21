import { describe, expect, it } from "vitest";
import {
  formatPlainTextToHTML,
  previewEmailTemplate,
  substituteTemplatePlaceholders,
  wrapEmailInHTMLTemplate,
} from "./email-template";

describe("substituteTemplatePlaceholders", () => {
  it("replaces placeholders with or without braces in the key, tolerating inner spaces", () => {
    const out = substituteTemplatePlaceholders("Hi {{ client_name }}, from {{org_name}}", {
      client_name: "Asha",
      "{{org_name}}": "Lekvya",
    });
    expect(out).toBe("Hi Asha, from Lekvya");
  });

  it("replaces longer keys first so prefixes do not clobber them", () => {
    const out = substituteTemplatePlaceholders("{{date}} / {{date_due}}", {
      date: "1 Jan",
      date_due: "5 Jan",
    });
    expect(out).toBe("1 Jan / 5 Jan");
  });

  it("treats regex characters in keys literally", () => {
    expect(substituteTemplatePlaceholders("{{a.b}} {{axb}}", { "a.b": "X" })).toBe("X {{axb}}");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(substituteTemplatePlaceholders("{{missing}}", { other: "1" })).toBe("{{missing}}");
  });
});

describe("email HTML", () => {
  it("escapes HTML in plain-text bodies and keeps paragraphs and line breaks", () => {
    const html = formatPlainTextToHTML("5 < 6 & \"ok\"\nline2\n\nPara 2");
    expect(html).toBe(
      '<p style="margin:0 0 1em;">5 &lt; 6 &amp; &quot;ok&quot;<br>line2</p><p style="margin:0 0 1em;">Para 2</p>',
    );
  });

  it("strips class and data attributes and turns divs into paragraphs in HTML bodies", () => {
    expect(formatPlainTextToHTML('<div class="x" data-id="1">Hi</div>')).toBe("<p>Hi</p>");
  });

  it("escapes the subject in the document title", () => {
    expect(wrapEmailInHTMLTemplate("Body", "<script>")).toContain("<title>&lt;script&gt;</title>");
  });

  it("fills sample values in the preview", () => {
    const html = previewEmailTemplate("Dear {{client_name}}, your {{service_name}} is due.");
    expect(html).toContain("Dear John Doe, your GST Filing is due.");
  });
});
