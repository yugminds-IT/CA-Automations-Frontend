import DOMPurify from "dompurify"

/**
 * Cleans HTML that came from a template, a lead or anyone other than the code itself, before it is
 * put into the page. Drops scripts, event handlers (onerror=…), javascript: links and the like.
 * Keeps the editor's variable tags (contenteditable="false" data-var=…). Returns "" on the server.
 */
export function safeHtml(html: string): string {
  if (typeof window === "undefined" || !html) return ""
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["contenteditable", "target"],
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
  })
}

/**
 * Parses HTML without running anything: no scripts, no image loads, no onerror handlers.
 * Use instead of `div.innerHTML = html` when the HTML is only read or rewritten.
 */
export function parseInert(html: string): HTMLElement {
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body
}
