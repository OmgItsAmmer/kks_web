/**
 * Pakistani mobile numbers are stored as 11 digits: 03XXXXXXXXX.
 * Accepts the shapes people type ("0300-1234567", "+92 300 1234567", "3001234567").
 * Returns null when it is not a valid mobile number. Mirrors the backend's src/utils/phone.ts.
 */
export function normalizePakistaniMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');

  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92') && digits.length === 12) digits = digits.slice(2);

  if (digits.length === 10 && digits.startsWith('3')) digits = `0${digits}`;

  return /^03[0-9]{9}$/.test(digits) ? digits : null;
}
