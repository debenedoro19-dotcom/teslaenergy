/**
 * Input sanitization utilities — strip XSS vectors and validate common fields.
 * Use these helpers before inserting any user-supplied data into the DB or rendering it.
 */

/** Remove HTML tags and dangerous characters from a string */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[<>"'`]/g, (c) => ({     // encode remaining dangerous chars
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '`': '&#x60;',
    }[c] ?? c))
    .trim()
    .slice(0, 1000);                   // hard cap to prevent oversized payloads
}

/** Sanitize and validate an email address */
export function sanitizeEmail(input: string): string {
  const cleaned = input.trim().toLowerCase().slice(0, 254);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : '';
}

/** Sanitize a phone number — digits, spaces, +, -, () only */
export function sanitizePhone(input: string): string {
  return input.replace(/[^0-9\s+\-().]/g, '').trim().slice(0, 20);
}

/** Sanitize a numeric string (amounts, quantities) */
export function sanitizeNumeric(input: string): string {
  return input.replace(/[^0-9.]/g, '').trim().slice(0, 20);
}

/** Validate password strength */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number.' };
  return { valid: true, message: '' };
}

/** Sanitize an object's string fields recursively (shallow, 1 level) */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = typeof value === 'string' ? sanitizeText(value) : value;
  }
  return result as T;
}
