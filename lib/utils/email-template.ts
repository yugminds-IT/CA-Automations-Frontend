/**
 * Email Template Utilities
 * Mirror the backend's toProfessionalHtml / sanitizeBody logic exactly
 * so the preview matches what recipients actually receive.
 */

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
function sanitizeBody(body: string): string {
  const hasHtml = /<[a-z][\s\S]*?>/i.test(body);
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
  const sanitized = sanitizeBody(body);
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
 * Preview with sample variable substitution — matches backend variable names.
 */
export function previewEmailTemplate(body: string, subject = 'Sample Email'): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const sampleData: Record<string, string> = {
    // Client variables
    '{{client_name}}': 'John Doe',
    '{{client_email}}': 'john.doe@example.com',
    '{{client_phone}}': '+91 98765 43210',
    '{{company_name}}': 'ABC Pvt. Ltd.',
    '{{client_city}}': 'Mumbai',
    // Organization variables (auto-enriched by backend; shown with sample data in preview)
    '{{org_name}}': 'Navedhana Pvt. Ltd.',
    '{{org_admin_name}}': 'Navedhana Team',
    '{{org_email}}': 'contact@navedhana.com',
    '{{org_phone}}': '+91 90000 00000',
    // Login / credentials variables
    '{{login_email}}': 'john.doe@example.com',
    '{{login_password}}': 'TempPass@123',
    '{{login_url}}': 'https://app.navedhana.com/login',
    // Service variables
    '{{service_name}}': 'GST Filing',
    '{{service_description}}': 'Monthly GST return filing service',
    '{{amount}}': '₹5,000',
    '{{document_name}}': 'Form 16',
    // Date variables
    '{{date}}': currentDate,
    '{{today}}': currentDate,
    '{{current_date}}': currentDate,
    '{{deadline_date}}': currentDate,
    '{{follow_up_date}}': currentDate,
    '{{additional_notes}}': 'Please submit all documents by the due date.',
  };

  let previewBody = body;
  Object.entries(sampleData).forEach(([variable, value]) => {
    previewBody = previewBody.replace(
      new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'),
      value,
    );
  });

  return wrapEmailInHTMLTemplate(previewBody, subject);
}

/** @deprecated use wrapEmailInHTMLTemplate */
export function formatPlainTextToHTML(text: string): string {
  return sanitizeBody(text);
}
