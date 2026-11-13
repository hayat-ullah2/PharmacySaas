// Pakistani phone-number validation + normalization.

/**
 * Normalize to the canonical +92XXXXXXXXXX form, or return null if the input is
 * not a valid Pakistani number. Accepts common local/international formats with
 * spaces, dashes or parentheses, e.g.:
 *   03001234567 · +923001234567 · 0092 300 1234567 · 021 3453 0001 · +92 21 3453 0001
 */
export function normalizePakistaniPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (!/^\+?\d+$/.test(cleaned)) return null;

  let n = cleaned;
  if (n.startsWith("+92")) n = n.slice(3);
  else if (n.startsWith("0092")) n = n.slice(4);
  else if (n.startsWith("92") && n.length >= 12) n = n.slice(2);
  else if (n.startsWith("0")) n = n.slice(1);

  // After the trunk/country code, a PK national number is 9–10 digits and
  // starts 2–9 (mobiles start with 3; landline area codes start 2–9).
  if (!/^[2-9]\d{8,9}$/.test(n)) return null;
  return `+92${n}`;
}

export function isValidPakistaniPhone(raw: string): boolean {
  return normalizePakistaniPhone(raw.trim()) !== null;
}

/** Strip characters a user can't legitimately type into a phone field, and cap length. */
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^\d\s+()-]/g, "").slice(0, 16);
}
