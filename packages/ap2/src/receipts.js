import {
  computeSdHash,
  parseFinalSdJwtPresentation,
  signJWT,
  verifyJWT,
} from '@docknetwork/crypto-utils/vc';
import {
  DEFAULT_CLOCK_TOLERANCE,
  inferReceiptType,
  RECEIPT_TYPE_CHECKOUT,
  RECEIPT_TYPE_PAYMENT,
  validateReceipt,
  validateReceiptTime,
} from './utils';

export {
  RECEIPT_TYPE_CHECKOUT,
  RECEIPT_TYPE_PAYMENT,
} from './utils';

/**
 * Computes the AP2 receipt reference over the exact final SD-JWT presentation.
 * A trailing key-binding JWT is deliberately excluded per RFC 9901.
 *
 * @param {string} mandatePresentation
 * @returns {string}
 */
export function computeMandateReference(mandatePresentation) {
  const { issuerJwt, disclosures } = parseFinalSdJwtPresentation(
    mandatePresentation,
    { chainSeparator: '~~' },
  );
  return computeSdHash({ issuerJwt, disclosures });
}

/**
 * Validates and clones an AP2 Checkout Receipt payload.
 *
 * @param {object} receipt
 * @returns {object}
 */
export function buildCheckoutReceipt(receipt) {
  return validateReceipt(receipt, RECEIPT_TYPE_CHECKOUT);
}

/**
 * Validates and clones an AP2 Payment Receipt payload.
 *
 * @param {object} receipt
 * @returns {object}
 */
export function buildPaymentReceipt(receipt) {
  return validateReceipt(receipt, RECEIPT_TYPE_PAYMENT);
}

/**
 * Validates and signs an AP2 receipt with a local or BYOK signer.
 *
 * The signer receives the JWT signing bytes and may return its raw signature
 * synchronously or asynchronously. ES256 signatures must use JOSE r || s form,
 * with an optional Dock recovery byte.
 *
 * @param {object} receipt
 * @param {{signer: {sign: function(Uint8Array): *}, type?: 'checkout'|'payment',
 * alg?: string, kid?: string}} options
 * @returns {Promise<string>}
 */
export function signReceipt(
  receipt,
  {
    signer,
    type,
    alg = 'ES256',
    kid,
  } = {},
) {
  if (signer == null || typeof signer.sign !== 'function') {
    throw new TypeError('"signer" with a sign(data) function is required');
  }
  if (alg !== 'ES256') {
    throw new Error(`Unsupported AP2 receipt algorithm: ${alg}`);
  }

  const receiptType = type || inferReceiptType(receipt);
  const payload = validateReceipt(receipt, receiptType);
  return signJWT(signer, payload, {
    algorithm: alg,
    header: kid === undefined ? {} : { kid },
  });
}

/**
 * Issues an AP2 receipt as an ES256 compact JWT.
 *
 * @param {*} keypair Secp256r1 keypair from @docknetwork/crypto-utils.
 * @param {object} receipt AP2 CheckoutReceipt or PaymentReceipt payload.
 * @param {{type?: 'checkout'|'payment', kid?: string}} options
 * @returns {Promise<string>}
 */
export function issueReceipt(keypair, receipt, { type, kid } = {}) {
  return signReceipt(receipt, {
    signer: keypair,
    type,
    alg: 'ES256',
    kid,
  });
}

/**
 * Verifies an AP2 receipt JWT and validates its receipt claims.
 *
 * @param {string} jwt
 * @param {{publicKey: *, type?: 'checkout'|'payment', expectedIssuer: string,
 * expectedReference?: string, mandatePresentation?: string,
 * currentDate?: Date, clockTolerance?: number, maxReceiptAge?: number}} options
 * @returns {{verified: boolean, receipt?: object, protectedHeader?: object,
 * referenceVerified?: boolean, error?: Error}}
 */
export function verifyReceipt(
  jwt,
  {
    publicKey,
    type,
    expectedIssuer,
    expectedReference,
    mandatePresentation,
    currentDate = new Date(),
    clockTolerance = DEFAULT_CLOCK_TOLERANCE,
    maxReceiptAge,
  } = {},
) {
  if (typeof expectedIssuer !== 'string') {
    return {
      verified: false,
      error: new TypeError(
        '"expectedIssuer" is required to bind the trusted key to the receipt issuer',
      ),
    };
  }

  const result = verifyJWT(jwt, publicKey, { algorithms: ['ES256'] });
  if (!result.verified) {
    return result;
  }

  try {
    if (result.protectedHeader.typ !== 'JWT') {
      throw new Error('Receipt JWT protected header "typ" must be "JWT"');
    }

    const receiptType = type || inferReceiptType(result.payload);
    const receipt = validateReceipt(result.payload, receiptType);
    validateReceiptTime(receipt, {
      currentDate,
      clockTolerance,
      maxReceiptAge,
    });
    if (receipt.iss !== expectedIssuer) {
      throw new Error(
        `Receipt iss mismatch: expected '${expectedIssuer}', got '${receipt.iss}'`,
      );
    }
    if (
      expectedReference !== undefined
      && receipt.reference !== expectedReference
    ) {
      throw new Error(
        `Receipt reference mismatch: expected '${expectedReference}', got '${receipt.reference}'`,
      );
    }
    if (mandatePresentation !== undefined) {
      const mandateReference = computeMandateReference(mandatePresentation);
      if (receipt.reference !== mandateReference) {
        throw new Error(
          'Receipt reference does not match the final mandate presentation',
        );
      }
    }

    return {
      verified: true,
      receipt,
      protectedHeader: result.protectedHeader,
      ...(mandatePresentation === undefined
        ? {}
        : { referenceVerified: true }),
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function issueCheckoutReceipt(keypair, receipt, options = {}) {
  return issueReceipt(keypair, receipt, {
    ...options,
    type: RECEIPT_TYPE_CHECKOUT,
  });
}

export function issuePaymentReceipt(keypair, receipt, options = {}) {
  return issueReceipt(keypair, receipt, {
    ...options,
    type: RECEIPT_TYPE_PAYMENT,
  });
}

export function verifyCheckoutReceipt(jwt, options) {
  return verifyReceipt(jwt, {
    ...options,
    type: RECEIPT_TYPE_CHECKOUT,
  });
}

export function verifyPaymentReceipt(jwt, options) {
  return verifyReceipt(jwt, {
    ...options,
    type: RECEIPT_TYPE_PAYMENT,
  });
}
