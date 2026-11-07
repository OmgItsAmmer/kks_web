import { describe, expect, it } from 'vitest';
import { dec, money, statusLabel } from './format';

describe('money', () => {
  it('formats whole and fractional rupees with thousands separators', () => {
    expect(money('1500')).toBe('Rs 1,500');
    expect(money('1234567.5')).toBe('Rs 1,234,567.50');
    expect(money('0')).toBe('Rs 0');
    expect(money(null)).toBe('Rs 0');
  });

  it('can omit the symbol', () => {
    expect(money('999.99', false)).toBe('999.99');
  });

  it('never loses cents to floating point', () => {
    expect(dec('0.1').plus(dec('0.2')).toString()).toBe('0.3');
    expect(money(dec('19.99').times(3).toString())).toBe('Rs 59.97');
  });

  it('treats junk as zero instead of crashing', () => {
    expect(money('not a number')).toBe('Rs 0');
  });
});

describe('statusLabel', () => {
  it('makes API values readable', () => {
    expect(statusLabel('purchase_received')).toBe('Purchase received');
    expect(statusLabel('pending')).toBe('Pending');
  });
});
