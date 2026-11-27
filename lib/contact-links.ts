/**
 * Click-to-call and click-to-WhatsApp links for a lead's phone number.
 * Numbers without a country code are read as India, matching the backend.
 */
export function toDialDigits(raw: string | null | undefined, defaultCountry = "91"): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  let full = digits;
  if (!trimmed.startsWith("+")) {
    if (digits.length === 10) full = defaultCountry + digits;
    else if (digits.length === 11 && digits.startsWith("0")) full = defaultCountry + digits.slice(1);
  }
  if (full.length < 8 || full.length > 15) return null;
  return full;
}

export function telLink(raw: string | null | undefined): string | null {
  const digits = toDialDigits(raw);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappLink(raw: string | null | undefined, text?: string): string | null {
  const digits = toDialDigits(raw);
  if (!digits) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}
