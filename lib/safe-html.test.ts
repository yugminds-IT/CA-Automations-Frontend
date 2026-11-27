// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { parseInert, safeHtml } from "./safe-html"
import { chipify } from "@/components/email-management/var-tags"

describe("safeHtml", () => {
  it("drops scripts, event handlers and javascript: links", () => {
    const out = safeHtml(`<p onclick="steal()">Hi</p><img src=x onerror="steal()"><script>steal()</script><a href="javascript:steal()">x</a>`)
    expect(out).not.toMatch(/steal|script|onerror|onclick|javascript:/i)
    expect(out).toContain("<p>Hi</p>")
  })

  it("keeps ordinary email formatting and variable tags", () => {
    const html = `<p style="color:red"><b>Hi</b> <a href="https://example.com">link</a> <span contenteditable="false" data-var="{{name}}">Name</span></p>`
    const out = safeHtml(html)
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('data-var="{{name}}"')
    expect(out).toContain('contenteditable="false"')
    expect(out).toContain("<b>Hi</b>")
  })
})

describe("parseInert", () => {
  it("does not run handlers while parsing", async () => {
    ;(globalThis as Record<string, unknown>).__ran = false
    parseInert(`<img src="x" onerror="globalThis.__ran = true">`)
    await new Promise((r) => setTimeout(r, 20))
    expect((globalThis as Record<string, unknown>).__ran).toBe(false)
  })
})

describe("chipify", () => {
  it("cleans template HTML whether or not it has variables", () => {
    expect(chipify(`<img src=x onerror="steal()">Hello`, [])).not.toMatch(/onerror/)
    const out = chipify(`<img src=x onerror="steal()">Hello {{name}}`, [{ key: "name", label: "Name" } as never])
    expect(out).not.toMatch(/onerror/)
    expect(out).toContain('data-var="{{name}}"')
  })
})
