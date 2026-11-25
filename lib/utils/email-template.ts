/**
 * Email Template Utilities
 * Mirror the backend's toProfessionalHtml / sanitizeBody logic exactly
 * so the preview matches what recipients actually receive.
 */

/**
 * Mirrors backend template-render.ts: {{ key }} with optional spaces, unknown variables become '',
 * values are HTML-escaped in HTML bodies; a tag-less body with entities (&nbsp;) counts as HTML.
 */
export function isHtmlBody(body: string): boolean {
  return /<[a-z][\s\S]*?>|&(?:[a-z]+|#\d+);/i.test(body);
}

/** Accepts keys as "client_name" or "{{client_name}}". */
function normalizeVars(vars: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) out[k.replace(/[{}\s]/g, '')] = v == null ? '' : String(v);
  return out;
}

export function substituteTokens(content: string, variables: Record<string, string | null | undefined>, escapeValues: boolean): string {
  const vars = normalizeVars(variables);
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key] ?? '';
    return escapeValues ? escapeHtml(v) : v;
  });
}

/** Plain-text substitution (e.g. a subject line). */
export function substituteTemplatePlaceholders(content: string, variables: Record<string, string>): string {
  return substituteTokens(content, variables, false);
}

/** Exactly what the recipient gets: { subject, html (full document), bodyHtml (sanitized body only) }. */
export function renderEmailPreview(subject: string, body: string, variables: Record<string, string | null | undefined>) {
  const html = isHtmlBody(body);
  const renderedSubject = substituteTokens(subject, variables, false).replace(/\s+/g, ' ').trim();
  const bodyHtml = sanitizeBody(substituteTokens(body, variables, html), html);
  return { subject: renderedSubject, bodyHtml, html: wrapSanitized(bodyHtml, renderedSubject || 'Email') };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mirrors backend sanitizeBody:
 * - Plain text: double \n = paragraph, single \n = <br>
 * - HTML: strip class/data-* attrs, div → p
 */
function sanitizeBody(body: string, hasHtml = isHtmlBody(body)): string {
  if (!hasHtml) {
    const paragraphs = body.split(/\n\n+/);
    return paragraphs
      .filter((p) => p.trim())
      .map((p) => {
        const lines = p.split('\n').map((l) => escapeHtml(l)).join('<br>');
        return `<p style="margin:0 0 1em;">${lines}</p>`;
      })
      .join('');
  }
  return body
    .replace(/\s+class="[^"]*"/g, '')
    .replace(/\s+class='[^']*'/g, '')
    .replace(/\s+data-[a-z-]+=(?:"[^"]*"|'[^']*'|\S+)/g, '')
    .replace(/<div><br\s*\/?><\/div>/gi, '<br>')
    .replace(/<div>([\s\S]*?)<\/div>/gi, '<p>$1</p>');
}

/**
 * Mirrors backend toProfessionalHtml — no blue bar, no subject heading, no card.
 */
export function wrapEmailInHTMLTemplate(body: string, subject = 'Email'): string {
  return wrapSanitized(sanitizeBody(body), subject);
}

function wrapSanitized(sanitized: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.65; color: #1a1a1a; background-color: #ffffff; }
    p { margin: 0 0 1em; }
    p:last-child { margin-bottom: 0; }
    a { color: #1a1a1a; text-decoration: underline; }
    ol, ul { margin: 0 0 1em; padding-left: 1.5em; }
    li { margin-bottom: 0.25em; }
  </style>
</head>
<body>
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;">
    ${sanitized}
  </div>
</body>
</html>`;
}

/**
 * Full preview document. Pass `variables` (a real client's values, or exampleValues(vars) from
 * lib/template-variables) — unknown variables render blank, exactly as in the sent email.
 */
export function previewEmailTemplate(body: string, subject = 'Sample Email', variables: Record<string, string> = {}): string {
  return renderEmailPreview(subject, body, variables).html;
}

/** @deprecated use wrapEmailInHTMLTemplate */
export function formatPlainTextToHTML(text: string): string {
  return sanitizeBody(text);
}

/** Mirrors backend withSignature: the firm's sign-off after the body, in the body's own format. */
export function withSignature(body: string, signature?: string | null): string {
  const sig = signature?.trim();
  if (!sig) return body;
  if (isHtmlBody(body)) return `${body}<p>${escapeHtml(sig).replace(/\r?\n/g, '<br>')}</p>`;
  return `${body.replace(/\s+$/, '')}\n\n${sig}`;
}
