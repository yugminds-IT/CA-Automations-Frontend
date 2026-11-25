/**
 * Checks run on a message before it is sent, so problems are caught once rather than
 * landing in 1,000 inboxes. Everything here is a warning: the user can still send.
 */
export interface CheckRecipient { email: string; variables: Record<string, string> }

const GMAIL_CLIP_BYTES = 102 * 1024 // Gmail hides the rest of a message behind "View entire message"
const BIG_IMAGE_BYTES = 200 * 1024

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)

/** A link that will not work when clicked; "{{...}}" links are filled in per recipient and skipped. */
export function badLink(href: string): string | null {
  const h = href.trim()
  if (h.includes('{{')) return null
  if (!h || h === '#') return 'empty link'
  if (/^javascript:/i.test(h)) return 'not a web address'
  if (/^mailto:/i.test(h)) return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/i.test(h) ? null : 'bad email address'
  if (/^tel:/i.test(h)) return null
  if (!/^https?:\/\//i.test(h)) return 'missing https://'
  try {
    const u = new URL(h)
    return u.hostname.includes('.') ? null : 'incomplete address'
  } catch {
    return 'not a valid address'
  }
}

export function checkEmail({ subject, body, recipients }: {
  subject: string
  /** raw message HTML, with {{tokens}} */
  body: string
  /** recipients with their final values */
  recipients: CheckRecipient[]
}): string[] {
  const out: string[] = []

  // Links
  const broken: string[] = []
  for (const m of body.matchAll(/<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    const why = badLink(m[2])
    if (why) broken.push(`“${m[2] || '(blank)'}” (${why})`)
  }
  if (broken.length) out.push(`${broken.length} link${broken.length === 1 ? ' looks' : 's look'} broken: ${broken.slice(0, 3).join(', ')}${broken.length > 3 ? '…' : ''}`)

  // Names
  if (/\{\{\s*client_name\s*\}\}/.test(`${subject} ${body}`) && recipients.length) {
    const noName = recipients.filter((r) => {
      const name = r.variables.client_name?.trim()
      return !name || name.toLowerCase() === r.email.split('@')[0].toLowerCase()
    })
    if (noName.length) {
      out.push(`${noName.length} of ${recipients.length} recipient${recipients.length === 1 ? ' has' : 's have'} no name saved, so “Client Name” will show their email username (e.g. ${noName[0].email.split('@')[0]}).`)
    }
  }

  // Images pasted into the message (stored inside the email itself)
  let biggest = 0
  for (const m of body.matchAll(/<img\b[^>]*?\bsrc\s*=\s*(["'])data:[^;]+;base64,([^"']*)\1/gi)) {
    biggest = Math.max(biggest, Math.floor((m[2].length * 3) / 4))
  }
  if (biggest > BIG_IMAGE_BYTES) {
    out.push(`An image pasted into the message is ${kb(biggest)}. Large images are often blocked or slow to load; attach it as a file or use a smaller image.`)
  }

  // Overall size
  const size = new Blob([body]).size
  if (size > GMAIL_CLIP_BYTES) {
    out.push(`The message is ${kb(size)}. Gmail cuts off emails over 102 KB, so the end of it (and the unsubscribe link) may be hidden.`)
  }
  return out
}
