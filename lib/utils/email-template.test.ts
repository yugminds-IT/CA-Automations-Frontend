import { describe, expect, it } from "vitest";
import {
  formatPlainTextToHTML,
  previewEmailTemplate,
  renderEmailPreview,
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

  it("does not let a shorter key clobber a longer one", () => {
    expect(substituteTemplatePlaceholders("{{date}} / {{date_due}}", { date: "1 Jan", date_due: "5 Jan" })).toBe("1 Jan / 5 Jan");
  });

  it("blanks unknown placeholders, like the server does, so previews never promise raw {{braces}}", () => {
    expect(substituteTemplatePlaceholders("pwd={{missing}}", { other: "1" })).toBe("pwd=");
  });
});

describe("renderEmailPreview (mirror of backend renderEmail)", () => {
  it("escapes values inside HTML bodies", () => {
    const { bodyHtml } = renderEmailPreview("S", "<p>{{client_name}}</p>", { client_name: "<b>x</b>" });
    expect(bodyHtml).toBe("<p>&lt;b&gt;x&lt;/b&gt;</p>");
  });

  it("treats a tag-less body with &nbsp; as HTML so the entity is not shown literally", () => {
    const { bodyHtml } = renderEmailPreview("S", "city={{client_city}}&nbsp;bye", { client_city: "Pune" });
    expect(bodyHtml).toBe("city=Pune&nbsp;bye");
  });

  it("subject: plain text, unknowns blank, whitespace collapsed", () => {
    expect(renderEmailPreview("Hi {{client_name}} {{nope}} !", "b", { client_name: "A & B" }).subject).toBe("Hi A & B !");
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

  it("fills the given values in the preview", () => {
    const html = previewEmailTemplate("Dear {{client_name}}, your {{service_name}} is due.", "S", { client_name: "John Doe", service_name: "GST Filing" });
    expect(html).toContain("Dear John Doe, your GST Filing is due.");
  });
});
