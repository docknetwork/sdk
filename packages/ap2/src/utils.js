import Ajv from 'ajv';

import checkoutReceiptSchema from './schemas/checkout-receipt.json';
import paymentReceiptSchema from './schemas/payment-receipt.json';
import checkoutMandateOpenSchema from './schemas/checkout-mandate-open.json';
import checkoutMandateClosedSchema from './schemas/checkout-mandate-closed.json';
import paymentMandateOpenSchema from './schemas/payment-mandate-open.json';
import paymentMandateClosedSchema from './schemas/payment-mandate-closed.json';

export {
  encodeSdJwtDisclosure as encodeDisclosure,
} from '@docknetwork/crypto-utils/vc';

export {
  checkoutReceiptSchema,
  paymentReceiptSchema,
  checkoutMandateOpenSchema,
  checkoutMandateClosedSchema,
  paymentMandateOpenSchema,
  paymentMandateClosedSchema,
};

export const RECEIPT_TYPE_CHECKOUT = 'checkout';
export const RECEIPT_TYPE_PAYMENT = 'payment';
export const DEFAULT_CLOCK_TOLERANCE = 30;

export const MANDATE_TYPE_CHECKOUT_OPEN = 'checkout-open';
export const MANDATE_TYPE_CHECKOUT_CLOSED = 'checkout-closed';
export const MANDATE_TYPE_PAYMENT_OPEN = 'payment-open';
export const MANDATE_TYPE_PAYMENT_CLOSED = 'payment-closed';

export const MANDATE_VCT = {
  [MANDATE_TYPE_CHECKOUT_OPEN]: 'mandate.checkout.open.1',
  [MANDATE_TYPE_CHECKOUT_CLOSED]: 'mandate.checkout.1',
  [MANDATE_TYPE_PAYMENT_OPEN]: 'mandate.payment.open.1',
  [MANDATE_TYPE_PAYMENT_CLOSED]: 'mandate.payment.1',
};

const ajv = new Ajv({ allErrors: true, strict: false });
const receiptValidators = {
  [RECEIPT_TYPE_CHECKOUT]: ajv.compile(checkoutReceiptSchema),
  [RECEIPT_TYPE_PAYMENT]: ajv.compile(paymentReceiptSchema),
};
const mandateContentValidators = {
  [MANDATE_TYPE_CHECKOUT_OPEN]: ajv.compile(checkoutMandateOpenSchema),
  [MANDATE_TYPE_CHECKOUT_CLOSED]: ajv.compile(checkoutMandateClosedSchema),
  [MANDATE_TYPE_PAYMENT_OPEN]: ajv.compile(paymentMandateOpenSchema),
  [MANDATE_TYPE_PAYMENT_CLOSED]: ajv.compile(paymentMandateClosedSchema),
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

export function validateMandateContent(content, type) {
  if (content == null || typeof content !== 'object' || Array.isArray(content)) {
    throw new TypeError('Mandate content must be an object');
  }
  const validate = mandateContentValidators[type];
  if (!validate) {
    throw new Error(`Unsupported mandate type: ${type}`);
  }
  if (!validate(content)) {
    throw new TypeError(
      `Invalid ${type} mandate content: ${formatValidationErrors(validate.errors)}`,
    );
  }

  return { ...content };
}

export function inferReceiptType(receipt) {
  return receipt != null
    && typeof receipt === 'object'
    && Object.hasOwn(receipt, 'payment_id')
    ? RECEIPT_TYPE_PAYMENT
    : RECEIPT_TYPE_CHECKOUT;
}

export function validateTimeOptions(currentDate, clockTolerance) {
  if (!(currentDate instanceof Date) || Number.isNaN(currentDate.getTime())) {
    throw new TypeError('"currentDate" must be a valid Date');
  }
  if (!Number.isFinite(clockTolerance) || clockTolerance < 0) {
    throw new TypeError('"clockTolerance" must be a non-negative number');
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
  validateTimeOptions(currentDate, clockTolerance);
  if (
    maxReceiptAge !== undefined
    && (!Number.isFinite(maxReceiptAge) || maxReceiptAge < 0)
  ) {
    throw new TypeError('"maxReceiptAge" must be a non-negative number');
  }
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
