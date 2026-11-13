// Shared, lightweight form-field validators (client-side).

/**
 * Basic email format check: something@something.tld, no spaces, sane length.
 * (Format only — it can't verify the address actually exists.)
 */
export function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length === 0 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
