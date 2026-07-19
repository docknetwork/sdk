import Ajv from 'ajv';

import checkoutReceiptSchema from './schemas/checkout-receipt.json';
import paymentReceiptSchema from './schemas/payment-receipt.json';

export {
  encodeSdJwtDisclosure as encodeDisclosure,
} from '@docknetwork/crypto-utils/vc';

export const RECEIPT_TYPE_CHECKOUT = 'checkout';
export const RECEIPT_TYPE_PAYMENT = 'payment';
export const DEFAULT_CLOCK_TOLERANCE = 30;

const ajv = new Ajv({ allErrors: true, strict: false });
const receiptValidators = {
  [RECEIPT_TYPE_CHECKOUT]: ajv.compile(checkoutReceiptSchema),
  [RECEIPT_TYPE_PAYMENT]: ajv.compile(paymentReceiptSchema),
};

function formatValidationErrors(errors = []) {
  return errors
    .map(({ instancePath, message, params }) => {
      const path = instancePath || '/';
      const property = params?.missingProperty
        ? `${path === '/' ? '' : path}/${params.missingProperty}`
        : path;
      return `${property} ${message}`;
    })
    .join('; ');
}

export function validateReceipt(receipt, type) {
  if (receipt == null || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new TypeError('Receipt must be an object');
  }
  const validate = receiptValidators[type];
  if (!validate) {
    throw new Error(`Unsupported receipt type: ${type}`);
  }
  if (!validate(receipt)) {
    throw new TypeError(
      `Invalid ${type} receipt: ${formatValidationErrors(validate.errors)}`,
    );
  }

  return { ...receipt };
}

export function inferReceiptType(receipt) {
  return receipt != null
    && typeof receipt === 'object'
    && Object.hasOwn(receipt, 'payment_id')
    ? RECEIPT_TYPE_PAYMENT
    : RECEIPT_TYPE_CHECKOUT;
}

function validateTimeOptions(currentDate, clockTolerance, maxReceiptAge) {
  if (!(currentDate instanceof Date) || Number.isNaN(currentDate.getTime())) {
    throw new TypeError('"currentDate" must be a valid Date');
  }
  if (!Number.isFinite(clockTolerance) || clockTolerance < 0) {
    throw new TypeError('"clockTolerance" must be a non-negative number');
  }
  if (
    maxReceiptAge !== undefined
    && (!Number.isFinite(maxReceiptAge) || maxReceiptAge < 0)
  ) {
    throw new TypeError('"maxReceiptAge" must be a non-negative number');
  }
}

export function validateReceiptTime(
  receipt,
  {
    currentDate,
    clockTolerance,
    maxReceiptAge,
  },
) {
  validateTimeOptions(currentDate, clockTolerance, maxReceiptAge);
  const now = Math.floor(currentDate.getTime() / 1000);
  if (receipt.iat > now + clockTolerance) {
    throw new Error('Receipt "iat" is in the future');
  }
  if (
    maxReceiptAge !== undefined
    && now - receipt.iat > maxReceiptAge + clockTolerance
  ) {
    throw new Error('Receipt is older than the permitted maximum age');
  }
}
