/**
 * Pakistani mobile numbers are stored as 11 digits: 03XXXXXXXXX.
 * Customers type them in many shapes ("0300-1234567", "+92 300 1234567", "3001234567"),
 * so turn any of those into the stored shape. Returns null when it is not a valid mobile number.
 */
export const PK_MOBILE_REGEX = /^03[0-9]{9}$/;

export function normalizePakistaniMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');

  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92') && digits.length === 12) digits = digits.slice(2);

  if (digits.length === 10 && digits.startsWith('3')) digits = `0${digits}`;

  return PK_MOBILE_REGEX.test(digits) ? digits : null;
}

/** For zod preprocess: normalise strings that are valid numbers, leave everything else for the regex to reject. */
export function preprocessPakistaniMobile(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return undefined;
  return normalizePakistaniMobile(value) ?? value;
}
