import {
  DEFAULT_CLOCK_TOLERANCE,
  encodeDisclosure,
  inferReceiptType,
  RECEIPT_TYPE_CHECKOUT,
  RECEIPT_TYPE_PAYMENT,
  validateReceipt,
  validateReceiptTime,
} from '../src/utils';

describe('AP2 utilities', () => {
  test('encodes object and array-element SD-JWT disclosures', () => {
    const objectDisclosure = ['salt', 'payment_id', 'PAY-001'];
    const arrayDisclosure = ['salt', { amount: 100, currency: 'USD' }];

    expect(JSON.parse(
      Buffer.from(encodeDisclosure(objectDisclosure), 'base64url').toString(),
    )).toEqual(objectDisclosure);
    expect(JSON.parse(
      Buffer.from(encodeDisclosure(arrayDisclosure), 'base64url').toString(),
    )).toEqual(arrayDisclosure);
    expect(() => encodeDisclosure(['salt'])).toThrow(
      'Disclosure must be [salt, value] or [salt, claimName, value]',
    );
  });

  test('infers concrete receipt types', () => {
    expect(inferReceiptType({ order_id: 'ORDER-001' })).toBe(
      RECEIPT_TYPE_CHECKOUT,
    );
    expect(inferReceiptType({ payment_id: 'PAY-001' })).toBe(
      RECEIPT_TYPE_PAYMENT,
    );
    expect(inferReceiptType(null)).toBe(RECEIPT_TYPE_CHECKOUT);
  });

  test('validates and clones receipt payloads with extensions', () => {
    const receipt = {
      status: 'Success',
      iss: 'processor.example',
      iat: 1000,
      reference: 'reference',
      payment_id: 'PAY-001',
      extension: { trace_id: 'trace-1' },
    };
    const validated = validateReceipt(receipt, RECEIPT_TYPE_PAYMENT);

    expect(validated).toEqual(receipt);
    expect(validated).not.toBe(receipt);
    expect(() => validateReceipt({
      ...receipt,
      error: 'invalid_mandate',
    }, RECEIPT_TYPE_PAYMENT)).toThrow('Invalid payment receipt');
    expect(() => validateReceipt(receipt, 'unknown')).toThrow(
      'Unsupported receipt type: unknown',
    );
  });

  test('validates receipt freshness boundaries and options', () => {
    const receipt = { iat: 1000 };

    expect(() => validateReceiptTime(receipt, {
      currentDate: new Date(1030 * 1000),
      clockTolerance: DEFAULT_CLOCK_TOLERANCE,
      maxReceiptAge: 0,
    })).not.toThrow();
    expect(() => validateReceiptTime(receipt, {
      currentDate: new Date(900 * 1000),
      clockTolerance: 0,
    })).toThrow('Receipt "iat" is in the future');
    expect(() => validateReceiptTime(receipt, {
      currentDate: new Date(1100 * 1000),
      clockTolerance: 0,
      maxReceiptAge: 99,
    })).toThrow('Receipt is older than the permitted maximum age');
    expect(() => validateReceiptTime(receipt, {
      currentDate: new Date('invalid'),
      clockTolerance: 0,
    })).toThrow('"currentDate" must be a valid Date');
  });
});
