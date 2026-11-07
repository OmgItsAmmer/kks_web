import Decimal from 'decimal.js';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';

/** Money arrives from the API as exact decimal strings. Keep them as Decimal; never use float maths. */
export type MoneyLike = string | number | null | undefined;

export const dec = (v: MoneyLike): Decimal => {
  try {
    return new Decimal(v ?? 0);
  } catch {
    return new Decimal(0);
  }
};

export const money = (v: MoneyLike, withSymbol = true): string => {
  const d = dec(v);
  const fixed = d.toDecimalPlaces(2).toFixed(d.isInteger() ? 0 : 2);
  const [int, frac] = fixed.split('.');
  const grouped = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${withSymbol ? 'Rs ' : ''}${grouped}${frac ? `.${frac}` : ''}`;
};

export const num = (v: number | null | undefined): string => (v ?? 0).toLocaleString('en-US');

const toDate = (v: string | Date | null | undefined): Date | null => {
  if (!v) return null;
  return typeof v === 'string' ? parseISO(v) : v;
};

export const dateOnly = (v: string | Date | null | undefined): string => {
  const d = toDate(v);
  return d ? format(d, 'd MMM yyyy') : '—';
};
export const dateTime = (v: string | Date | null | undefined): string => {
  const d = toDate(v);
  return d ? format(d, 'd MMM yyyy, h:mm a') : '—';
};
export const ago = (v: string | Date | null | undefined): string => {
  const d = toDate(v);
  return d ? `${formatDistanceToNowStrict(d)} ago` : '—';
};
export const isoDay = (d: Date): string => format(d, 'yyyy-MM-dd');

export const statusLabel = (s: string): string => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
