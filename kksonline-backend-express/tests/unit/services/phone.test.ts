import { describe, it, expect } from 'vitest';
import { normalizePakistaniMobile } from '../../../src/utils/phone';
import { schemas } from '../../../src/middleware/validation.middleware';

describe('normalizePakistaniMobile', () => {
  it.each([
    ['03001234567', '03001234567'],
    ['0300-1234567', '03001234567'],
    ['0300 123 4567', '03001234567'],
    ['+92 300 1234567', '03001234567'],
    ['923001234567', '03001234567'],
    ['00923001234567', '03001234567'],
    ['3001234567', '03001234567'],
  ])('turns %s into %s', (input, expected) => {
    expect(normalizePakistaniMobile(input)).toBe(expected);
  });

  it.each(['', '12345', '0300123456', '030012345678', '04212345678', 'abc'])('rejects %s', (input) => {
    expect(normalizePakistaniMobile(input)).toBeNull();
  });
});

describe('checkout schema phone/name fields', () => {
  const base = {
    addressId: 0,
    shippingMethod: 'pickup',
    paymentMethod: 'cod',
    cartItems: [{ variantId: 1, quantity: 1, sellPrice: 100 }],
  };

  it('normalises the phone number', () => {
    const result = schemas.checkout.safeParse({ ...base, phoneNumber: '+92 300-1234567' });
    expect(result.success).toBe(true);
    expect(result.success && result.data.phoneNumber).toBe('03001234567');
  });

  it('treats an empty phone as not given', () => {
    const result = schemas.checkout.safeParse({ ...base, phoneNumber: '  ' });
    expect(result.success).toBe(true);
    expect(result.success && result.data.phoneNumber).toBeUndefined();
  });

  it('rejects an invalid phone', () => {
    expect(schemas.checkout.safeParse({ ...base, phoneNumber: '12345' }).success).toBe(false);
  });

  it('still accepts requests without phone or name (older app versions)', () => {
    expect(schemas.checkout.safeParse(base).success).toBe(true);
  });
});
