/**
 * Email Template Utilities
 * Functions to format email templates with professional HTML styling
 */

/**
 * Wraps email body content in professional HTML email template
 * @param bodyContent - The email body content (can contain HTML or plain text)
 * @returns Complete HTML email with professional styling
 */
export function wrapEmailInHTMLTemplate(bodyContent: string): string {
  // If content already has HTML structure, use it; otherwise treat as plain text
  const hasHTMLTags = /<[a-z][\s\S]*>/i.test(bodyContent);
  const formattedContent = hasHTMLTags 
    ? bodyContent 
    : bodyContent
        .split('\n')
        .map(line => line.trim() ? `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #333333;">${escapeHtml(line)}</p>` : '<br>')
        .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; background-color: #ffffff; border-radius: 8px 8px 0 0;">
              <div style="text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">Navedhana Private Limited</h1>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px; background-color: #ffffff;">
              <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                ${formattedContent}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
              <div style="text-align: center; color: #666666; font-size: 14px; line-height: 1.5;">
                <p style="margin: 0 0 8px 0;">Best regards,</p>
                <p style="margin: 0; font-weight: 500; color: #333333;">Navedhana Private Limited</p>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #999999;">
                  This is an automated email. Please do not reply directly to this message.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Converts plain text to HTML with proper formatting
 * Preserves line breaks and paragraphs
 */
export function formatPlainTextToHTML(text: string): string {
  return text
    .split('\n\n') // Split by double newlines for paragraphs
    .map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      
      // Convert single newlines within paragraph to <br>
      const withBreaks = trimmed
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join('<br>');
      
      return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #333333;">${escapeHtml(withBreaks)}</p>`;
    })
    .filter(p => p)
    .join('');
}

/**
 * Preview email template with sample data
 */
export function previewEmailTemplate(body: string, subject: string = "Sample Email"): string {
  // Replace variables with sample data
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const sampleData: Record<string, string> = {
    '{{client_name}}': 'John Doe',
    '{{company_name}}': 'ABC Corporation',
    '{{email}}': 'john.doe@example.com',
    '{{phone}}': '+1 (555) 123-4567',
    '{{password}}': 'TempPass123!',
    '{{login_url}}': 'https://app.example.com/login',
    '{{service_name}}': 'GST Filing',
    '{{due_date}}': 'March 15, 2024',
    '{{amount}}': '$500.00',
    '{{director_name}}': 'Jane Smith',
    '{{organization_name}}': 'Navedhana Private Limited',
    '{{current_date}}': currentDate,
    '{{date}}': currentDate,
    '{{today}}': currentDate,
  };

  let previewBody = body;
  Object.entries(sampleData).forEach(([variable, value]) => {
    previewBody = previewBody.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  return wrapEmailInHTMLTemplate(previewBody);
}
