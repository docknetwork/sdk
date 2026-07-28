import { createHash, randomBytes } from 'node:crypto';
import {
  signJWT,
  verifyJWT,
  encodeSdJwtDisclosure,
  parseSdJwtPresentation,
  computeSdHash,
  jwkToSecp256r1PublicKey,
  decodeJwtPayload,
  decodeJwtProtectedHeader,
} from '@docknetwork/crypto-utils/vc';
import {
  MANDATE_TYPE_CHECKOUT_OPEN,
  MANDATE_TYPE_CHECKOUT_CLOSED,
  MANDATE_TYPE_PAYMENT_OPEN,
  MANDATE_TYPE_PAYMENT_CLOSED,
  DEFAULT_CLOCK_TOLERANCE,
  validateMandateContent,
} from './utils';

export {
  MANDATE_TYPE_CHECKOUT_OPEN,
  MANDATE_TYPE_CHECKOUT_CLOSED,
  MANDATE_TYPE_PAYMENT_OPEN,
  MANDATE_TYPE_PAYMENT_CLOSED,
} from './utils';

const OPEN_PAYMENT_MANDATE_LABEL = 'Open Payment Mandate';

const DEFAULT_SD_ALG = 'sha-256';
const SD_HASH_ALGORITHMS = {
  'sha-256': 'sha256',
  'sha-384': 'sha384',
  'sha-512': 'sha512',
};

function resolveHashAlgorithm(sdAlg) {
  const hashAlgorithm = SD_HASH_ALGORITHMS[sdAlg];
  if (!hashAlgorithm) {
    throw new Error(`Unsupported SD-JWT hash algorithm: ${sdAlg}`);
  }
  return hashAlgorithm;
}

function randomSalt() {
  return randomBytes(16).toString('base64url');
}

/**
 * Computes the RFC 9901 digest of a single encoded disclosure. This is the
 * primitive behind every `_sd` array entry and every `{"...": digest}`
 * array-element placeholder — distinct from `computeSdHash`, which hashes an
 * entire issuer-signed JWT plus a set of disclosures (a presentation), not a
 * single disclosure.
 *
 * @param {string} encodedDisclosure
 * @param {string} sdAlg
 * @returns {string}
 */
export function computeDisclosureDigest(encodedDisclosure, sdAlg = DEFAULT_SD_ALG) {
  const hashAlgorithm = resolveHashAlgorithm(sdAlg);
  return createHash(hashAlgorithm)
    .update(Buffer.from(encodedDisclosure, 'ascii'))
    .digest('base64url');
}

/**
 * Computes checkout_hash / transaction_id: the base64url hash of the raw
 * checkout_jwt string value (not of a disclosure wrapping it).
 *
 * @param {string} checkoutJwt
 * @param {string} sdAlg
 * @returns {string}
 */
export function computeCheckoutHash(checkoutJwt, sdAlg = DEFAULT_SD_ALG) {
  if (typeof checkoutJwt !== 'string' || checkoutJwt.length === 0) {
    throw new TypeError('"checkoutJwt" must be a non-empty string');
  }
  const hashAlgorithm = resolveHashAlgorithm(sdAlg);
  return createHash(hashAlgorithm)
    .update(Buffer.from(checkoutJwt, 'ascii'))
    .digest('base64url');
}

function discloseArrayElement(value, sdAlg) {
  const disclosure = encodeSdJwtDisclosure([randomSalt(), value]);
  const digest = computeDisclosureDigest(disclosure, sdAlg);
  return { disclosure, digest, placeholder: { '...': digest } };
}

function discloseClaim(claimName, value, sdAlg) {
  const disclosure = encodeSdJwtDisclosure([randomSalt(), claimName, value]);
  const digest = computeDisclosureDigest(disclosure, sdAlg);
  return { disclosure, digest };
}

function decodeDisclosure(encodedDisclosure) {
  return JSON.parse(Buffer.from(encodedDisclosure, 'base64url').toString('utf8'));
}

function decodeArrayElementDisclosure(encodedDisclosure) {
  const decoded = decodeDisclosure(encodedDisclosure);
  if (!Array.isArray(decoded) || decoded.length !== 2) {
    throw new Error('Expected a 2-element [salt, value] array-element disclosure');
  }
  return decoded[1];
}

function decodeClaimDisclosure(encodedDisclosure) {
  const decoded = decodeDisclosure(encodedDisclosure);
  if (!Array.isArray(decoded) || decoded.length !== 3) {
    throw new Error('Expected a 3-element [salt, claimName, value] disclosure');
  }
  return { claimName: decoded[1], value: decoded[2] };
}

function findDisclosureByDigest(disclosures, digest, sdAlg) {
  return disclosures.find(
    (disclosure) => computeDisclosureDigest(disclosure, sdAlg) === digest,
  );
}

// Shared by both redact*Constraints functions below: collects array-element
// disclosures into `disclosures` as `redact` is mapped over revealed values.
function createArrayElementRedactor(sdAlg) {
  const disclosures = [];
  const redact = (entry) => {
    const d = discloseArrayElement(entry, sdAlg);
    disclosures.push(d.disclosure);
    return d.placeholder;
  };
  return { redact, disclosures };
}

// Redacts the array-element-disclosable fields of an Open Checkout Mandate's
// constraints (checkout.line_items[].acceptable_items, checkout.allowed_merchants.allowed),
// per the property tables on the AP2 Checkout Mandate spec page.
function redactCheckoutConstraints(constraints, sdAlg) {
  const { redact, disclosures } = createArrayElementRedactor(sdAlg);

  const redacted = (constraints ?? []).map((constraint) => {
    if (constraint?.type === 'checkout.line_items' && Array.isArray(constraint.items)) {
      return {
        ...constraint,
        items: constraint.items.map((item) => (
          Array.isArray(item?.acceptable_items)
            ? { ...item, acceptable_items: item.acceptable_items.map(redact) }
            : item
        )),
      };
    }
    if (constraint?.type === 'checkout.allowed_merchants' && Array.isArray(constraint.allowed)) {
      return { ...constraint, allowed: constraint.allowed.map(redact) };
    }
    return constraint;
  });

  return { redacted, disclosures };
}

// Redacts the array-element-disclosable fields of an Open Payment Mandate's
// constraints (payment.allowed_payees.allowed and
// payment.allowed_payment_instruments.allowed — marked
// "x-selectively-disclosable-array" in the published Truvera schema;
// payment.allowed_pisps.allowed is not marked disclosable and is left as-is).
function redactPaymentConstraints(constraints, sdAlg) {
  const { redact, disclosures } = createArrayElementRedactor(sdAlg);
  const disclosableTypes = ['payment.allowed_payees', 'payment.allowed_payment_instruments'];

  const redacted = (constraints ?? []).map((constraint) => {
    if (disclosableTypes.includes(constraint?.type) && Array.isArray(constraint.allowed)) {
      return { ...constraint, allowed: constraint.allowed.map(redact) };
    }
    return constraint;
  });

  return { redacted, disclosures };
}

function wrapAsDelegatePayload(content, sdAlg) {
  const d = discloseArrayElement(content, sdAlg);
  return { delegatePayload: [d.placeholder], contentDisclosure: d.disclosure };
}

async function signMandateEnvelope(envelope, { signer, kid, typ }) {
  if (signer == null || typeof signer.sign !== 'function') {
    throw new TypeError('"signer" with a sign(data) function is required');
  }
  return signJWT(signer, envelope, {
    algorithm: 'ES256',
    header: { typ, ...(kid === undefined ? {} : { kid }) },
  });
}

/**
 * Validates and clones an Open Checkout Mandate's disclosed content.
 * @param {object} content
 * @returns {object}
 */
export function buildOpenCheckoutMandate(content) {
  return validateMandateContent(content, MANDATE_TYPE_CHECKOUT_OPEN);
}

/**
 * Validates and clones a Closed Checkout Mandate's disclosed content.
 * `checkout_jwt` is present here in fully-revealed form; `signClosedCheckoutMandate`
 * replaces it with an `_sd` digest.
 * @param {object} content
 * @returns {object}
 */
export function buildClosedCheckoutMandate(content) {
  return validateMandateContent(content, MANDATE_TYPE_CHECKOUT_CLOSED);
}

/**
 * Validates and clones an Open Payment Mandate's disclosed content.
 * @param {object} content
 * @returns {object}
 */
export function buildOpenPaymentMandate(content) {
  return validateMandateContent(content, MANDATE_TYPE_PAYMENT_OPEN);
}

/**
 * Validates and clones a Closed Payment Mandate's disclosed content.
 * @param {object} content
 * @returns {object}
 */
export function buildClosedPaymentMandate(content) {
  return validateMandateContent(content, MANDATE_TYPE_PAYMENT_CLOSED);
}

/**
 * Signs an Open Checkout Mandate (mandate.checkout.open.1) as a compact
 * SD-JWT presentation, signed with the user's key (BYOK `signer.sign(data)`,
 * matching the receipts.js contract so a wallet-held key can be bridged in
 * without ever exposing the private key to this package).
 *
 * @param {object} content Output of `buildOpenCheckoutMandate`.
 * @param {{signer: {sign: function(Uint8Array): *}, kid?: string, sdAlg?: string}} options
 * @returns {Promise<string>}
 */
export async function signOpenCheckoutMandate(content, { signer, kid, sdAlg = DEFAULT_SD_ALG } = {}) {
  const validated = buildOpenCheckoutMandate(content);
  const { redacted, disclosures: constraintDisclosures } = redactCheckoutConstraints(
    validated.constraints,
    sdAlg,
  );
  const redactedContent = { ...validated, constraints: redacted };
  const { delegatePayload, contentDisclosure } = wrapAsDelegatePayload(redactedContent, sdAlg);

  const envelope = { delegate_payload: delegatePayload, _sd_alg: sdAlg };
  const issuerJwt = await signMandateEnvelope(envelope, { signer, kid, typ: 'dc+sd-jwt' });

  return `${issuerJwt}~${[...constraintDisclosures, contentDisclosure].join('~')}~`;
}

/**
 * Signs an Open Payment Mandate (mandate.payment.open.1) as a compact
 * SD-JWT presentation. See `signOpenCheckoutMandate` for the signer contract.
 *
 * @param {object} content Output of `buildOpenPaymentMandate`.
 * @param {{signer: {sign: function(Uint8Array): *}, kid?: string, sdAlg?: string}} options
 * @returns {Promise<string>}
 */
export async function signOpenPaymentMandate(content, { signer, kid, sdAlg = DEFAULT_SD_ALG } = {}) {
  const validated = buildOpenPaymentMandate(content);
  const { redacted, disclosures: constraintDisclosures } = redactPaymentConstraints(
    validated.constraints,
    sdAlg,
  );
  const redactedContent = { ...validated, constraints: redacted };
  const { delegatePayload, contentDisclosure } = wrapAsDelegatePayload(redactedContent, sdAlg);

  const envelope = { delegate_payload: delegatePayload, _sd_alg: sdAlg };
  const issuerJwt = await signMandateEnvelope(envelope, { signer, kid, typ: 'dc+sd-jwt' });

  return `${issuerJwt}~${[...constraintDisclosures, contentDisclosure].join('~')}~`;
}

/**
 * Signs a Closed Checkout Mandate (mandate.checkout.1) as a compact SD-JWT
 * presentation, binding it back to a specific Open Checkout Mandate
 * presentation via `sd_hash`.
 *
 * NOTE ON `sd_hash`: computed here as the RFC 9901 hash over the referenced
 * Open Mandate's issuer-signed JWT + its disclosures (the same primitive as
 * `computeSdHash`), consistent with the Agent Authorization Framework's
 * "Mandate Receipt.reference... calculated in the same manner as sd_hash"
 * language and with `sd_hash`'s standard RFC 9901 meaning. The AP2 spec's own
 * worked example for the Closed Checkout Mandate shows a `sd_hash` value that
 * instead numerically matches the digest of its own `checkout_jwt`
 * disclosure — this looks like reused placeholder text in the docs (the same
 * string also appears, implausibly, as a `payment.reference.conditional_transaction_id`
 * value on an unrelated page) rather than a deliberate alternate meaning, but
 * this has NOT been confirmed against a reference implementation or the
 * normative "Delegate SD-JWT" individual draft this spec depends on for chain
 * verification. Treat this as the best-supported reading, not a certainty.
 *
 * @param {object} content Output of `buildClosedCheckoutMandate` (with `checkout_jwt` revealed).
 * @param {{signer: {sign: function(Uint8Array): *}, kid?: string, nonce: string,
 * openMandatePresentation: string, sdAlg?: string}} options
 * @returns {Promise<string>}
 */
export async function signClosedCheckoutMandate(
  content,
  {
    signer, kid, nonce, openMandatePresentation, sdAlg = DEFAULT_SD_ALG,
  } = {},
) {
  const validated = buildClosedCheckoutMandate(content);
  if (typeof openMandatePresentation !== 'string' || openMandatePresentation.length === 0) {
    throw new TypeError('"openMandatePresentation" is required to compute sd_hash');
  }

  const { checkout_jwt: checkoutJwt, ...rest } = validated;
  const claimDisclosure = discloseClaim('checkout_jwt', checkoutJwt, sdAlg);
  const redactedContent = { ...rest, _sd: [claimDisclosure.digest] };
  const { delegatePayload, contentDisclosure } = wrapAsDelegatePayload(redactedContent, sdAlg);

  const { issuerJwt: openIssuerJwt, disclosures: openDisclosures } = parseSdJwtPresentation(
    openMandatePresentation,
  );
  const sdHash = computeSdHash({ issuerJwt: openIssuerJwt, disclosures: openDisclosures });

  const envelope = {
    delegate_payload: delegatePayload,
    iat: Math.floor(Date.now() / 1000),
    aud: 'merchant',
    nonce,
    sd_hash: sdHash,
    _sd_alg: sdAlg,
  };
  const issuerJwt = await signMandateEnvelope(envelope, { signer, kid, typ: 'kb+sd-jwt' });

  return `${issuerJwt}~${[claimDisclosure.disclosure, contentDisclosure].join('~')}~`;
}

/**
 * Signs a Closed Payment Mandate (mandate.payment.1) as a compact SD-JWT
 * presentation, binding it back to a specific Open Payment Mandate
 * presentation via `sd_hash`. See `signClosedCheckoutMandate`'s doc comment
 * for the same caveat about `sd_hash`'s exact semantics.
 *
 * @param {object} content Output of `buildClosedPaymentMandate`.
 * @param {{signer: {sign: function(Uint8Array): *}, kid?: string, nonce: string,
 * openMandatePresentation: string, sdAlg?: string}} options
 * @returns {Promise<string>}
 */
export async function signClosedPaymentMandate(
  content,
  {
    signer, kid, nonce, openMandatePresentation, sdAlg = DEFAULT_SD_ALG,
  } = {},
) {
  const validated = buildClosedPaymentMandate(content);
  if (typeof openMandatePresentation !== 'string' || openMandatePresentation.length === 0) {
    throw new TypeError('"openMandatePresentation" is required to compute sd_hash');
  }

  const { delegatePayload, contentDisclosure } = wrapAsDelegatePayload(validated, sdAlg);

  const { issuerJwt: openIssuerJwt, disclosures: openDisclosures } = parseSdJwtPresentation(
    openMandatePresentation,
  );
  const sdHash = computeSdHash({ issuerJwt: openIssuerJwt, disclosures: openDisclosures });

  const envelope = {
    delegate_payload: delegatePayload,
    iat: Math.floor(Date.now() / 1000),
    aud: 'credential-provider',
    nonce,
    sd_hash: sdHash,
    _sd_alg: sdAlg,
  };
  const issuerJwt = await signMandateEnvelope(envelope, { signer, kid, typ: 'kb+sd-jwt' });

  return `${issuerJwt}~${contentDisclosure}~`;
}

function resolvePublicKey({ publicKey, holderJwk }) {
  if (publicKey !== undefined) {
    return publicKey;
  }
  if (holderJwk !== undefined) {
    return jwkToSecp256r1PublicKey(holderJwk);
  }
  throw new TypeError('Either "publicKey" or "holderJwk" is required');
}

function resolveMandateContent(payload, disclosures, sdAlg) {
  if (!Array.isArray(payload.delegate_payload) || payload.delegate_payload.length !== 1) {
    throw new Error('"delegate_payload" must contain exactly one entry');
  }
  const contentDigest = payload.delegate_payload[0]?.['...'];
  if (typeof contentDigest !== 'string') {
    throw new Error('"delegate_payload" entry must be a digest placeholder');
  }
  const contentDisclosure = findDisclosureByDigest(disclosures, contentDigest, sdAlg);
  if (!contentDisclosure) {
    throw new Error('No disclosure found for the delegate_payload digest');
  }
  return decodeArrayElementDisclosure(contentDisclosure);
}

function getSdAlg(payload) {
  // eslint-disable-next-line no-underscore-dangle -- protocol-mandated claim name
  return payload._sd_alg || DEFAULT_SD_ALG;
}

function checkNotExpired(payload, { currentDate, clockTolerance }, label) {
  if (typeof payload.exp !== 'number') {
    return;
  }
  const now = Math.floor(currentDate.getTime() / 1000);
  if (payload.exp + clockTolerance < now) {
    throw new Error(`${label} has expired`);
  }
}

function checkAudience(payload, expectedAud) {
  if (payload.aud !== expectedAud) {
    throw new Error(`Expected envelope "aud" of "${expectedAud}", got "${payload.aud}"`);
  }
}

// Returns `true` if `sd_hash` was checked, `undefined` if `openMandatePresentation`
// was not supplied (verification of that binding is then left to the caller).
function checkSdHashAgainstOpenMandate(payload, openMandatePresentation, label) {
  if (openMandatePresentation === undefined) {
    return undefined;
  }
  const { issuerJwt: openIssuerJwt, disclosures: openDisclosures } = parseSdJwtPresentation(
    openMandatePresentation,
  );
  const expectedSdHash = computeSdHash({ issuerJwt: openIssuerJwt, disclosures: openDisclosures });
  if (payload.sd_hash !== expectedSdHash) {
    throw new Error(`"sd_hash" does not match the referenced ${label} presentation`);
  }
  return true;
}

// Resolves the checkout_jwt claim disclosure referenced by a Closed Checkout
// Mandate content's "_sd" digest array, returning the revealed checkout_jwt
// string. Throws if the digest, disclosure, or claim name don't line up.
function resolveCheckoutJwtClaim(content, disclosures, sdAlg) {
  // eslint-disable-next-line no-underscore-dangle -- protocol-mandated claim name
  const sdDigests = content._sd;
  if (!Array.isArray(sdDigests) || typeof sdDigests[0] !== 'string') {
    throw new Error('Closed Checkout Mandate content must have an "_sd" digest for checkout_jwt');
  }
  const claimDisclosure = findDisclosureByDigest(disclosures, sdDigests[0], sdAlg);
  if (!claimDisclosure) {
    throw new Error('No disclosure found for the checkout_jwt digest');
  }
  const { claimName, value: checkoutJwt } = decodeClaimDisclosure(claimDisclosure);
  if (claimName !== 'checkout_jwt') {
    throw new Error(`Expected a "checkout_jwt" disclosure, got "${claimName}"`);
  }
  return checkoutJwt;
}

/**
 * Verifies a Closed Checkout Mandate presentation.
 *
 * Verifies: the envelope signature against `publicKey` (or `holderJwk`, the
 * agent's `cnf.jwk` from the referenced Open Checkout Mandate — pass either),
 * the `checkout_jwt` disclosure against the content's `_sd` digest,
 * `checkout_hash` against a fresh hash of the revealed `checkout_jwt`,
 * `aud === "merchant"`, and — when `openMandatePresentation` is supplied —
 * `sd_hash` against that presentation. See `signClosedCheckoutMandate` for
 * the `sd_hash` caveat.
 *
 * @param {string} presentation
 * @param {{publicKey?: *, holderJwk?: object, openMandatePresentation?: string,
 * currentDate?: Date, clockTolerance?: number}} options
 * @returns {{verified: boolean, content?: object, checkoutJwt?: string,
 * protectedHeader?: object, sdHashVerified?: boolean, error?: Error}}
 */
export function verifyClosedCheckoutMandate(
  presentation,
  {
    publicKey, holderJwk, openMandatePresentation, currentDate = new Date(), clockTolerance = DEFAULT_CLOCK_TOLERANCE,
  } = {},
) {
  try {
    const { issuerJwt, disclosures } = parseSdJwtPresentation(presentation);
    const result = verifyJWT(issuerJwt, resolvePublicKey({ publicKey, holderJwk }), { algorithms: ['ES256'] });
    if (!result.verified) {
      return result;
    }
    const { payload, protectedHeader } = result;
    const sdAlg = getSdAlg(payload);

    const content = resolveMandateContent(payload, disclosures, sdAlg);
    const checkoutJwt = resolveCheckoutJwtClaim(content, disclosures, sdAlg);

    const revealedContent = { ...content, checkout_jwt: checkoutJwt };
    // eslint-disable-next-line no-underscore-dangle -- protocol field being stripped before validation
    delete revealedContent._sd;
    const validatedContent = buildClosedCheckoutMandate(revealedContent);
    if (validatedContent.checkout_hash !== computeCheckoutHash(checkoutJwt, sdAlg)) {
      throw new Error('"checkout_hash" does not match a fresh hash of "checkout_jwt"');
    }

    checkAudience(payload, 'merchant');
    checkNotExpired(payload, { currentDate, clockTolerance }, 'Closed Checkout Mandate');
    const sdHashVerified = checkSdHashAgainstOpenMandate(
      payload,
      openMandatePresentation,
      'Open Checkout Mandate',
    );

    return {
      verified: true,
      content: validatedContent,
      checkoutJwt,
      protectedHeader,
      ...(sdHashVerified === undefined ? {} : { sdHashVerified }),
    };
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Verifies a Closed Payment Mandate presentation.
 *
 * Verifies: the envelope signature against `publicKey` (the agent's `cnf`
 * key from the referenced Open Payment Mandate), `aud === "credential-provider"`,
 * and — when the corresponding Closed Checkout Mandate's `checkout_jwt` is
 * supplied — that `transaction_id` matches a fresh hash of it (the same
 * `checkout_hash` computation). When `openMandatePresentation` is supplied,
 * also verifies `sd_hash` against it. See `signClosedCheckoutMandate` for the
 * `sd_hash` caveat.
 *
 * This does not verify the `conditional_transaction_id` binding (Open Payment
 * Mandate's `payment.reference` constraint against the checkout's delegate
 * chain) — that check requires the checkout's full delegate chain and is
 * left to the caller, which is expected to already hold both mandates when
 * assembling a payment authorization decision.
 *
 * @param {string} presentation
 * @param {{publicKey?: *, holderJwk?: object, checkoutJwt?: string, openMandatePresentation?: string,
 * currentDate?: Date, clockTolerance?: number}} options
 * @returns {{verified: boolean, content?: object, protectedHeader?: object,
 * transactionIdVerified?: boolean, sdHashVerified?: boolean, error?: Error}}
 */
export function verifyClosedPaymentMandate(
  presentation,
  {
    publicKey, holderJwk, checkoutJwt, openMandatePresentation, currentDate = new Date(), clockTolerance = DEFAULT_CLOCK_TOLERANCE,
  } = {},
) {
  try {
    const { issuerJwt, disclosures } = parseSdJwtPresentation(presentation);
    const result = verifyJWT(issuerJwt, resolvePublicKey({ publicKey, holderJwk }), { algorithms: ['ES256'] });
    if (!result.verified) {
      return result;
    }
    const { payload, protectedHeader } = result;
    const sdAlg = getSdAlg(payload);

    const content = resolveMandateContent(payload, disclosures, sdAlg);
    const validatedContent = buildClosedPaymentMandate(content);

    checkAudience(payload, 'credential-provider');
    checkNotExpired(payload, { currentDate, clockTolerance }, 'Closed Payment Mandate');

    let transactionIdVerified;
    if (checkoutJwt !== undefined) {
      if (validatedContent.transaction_id !== computeCheckoutHash(checkoutJwt, sdAlg)) {
        throw new Error('"transaction_id" does not match a fresh hash of the provided checkout_jwt');
      }
      transactionIdVerified = true;
    }

    const sdHashVerified = checkSdHashAgainstOpenMandate(
      payload,
      openMandatePresentation,
      OPEN_PAYMENT_MANDATE_LABEL,
    );

    return {
      verified: true,
      content: validatedContent,
      protectedHeader,
      ...(transactionIdVerified === undefined ? {} : { transactionIdVerified }),
      ...(sdHashVerified === undefined ? {} : { sdHashVerified }),
    };
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// Reveals the array-element disclosures inside an Open Payment Mandate's
// resolved content -- the reverse of `redactPaymentConstraints`. Entries that
// are already plain objects (not SD-redacted, e.g. from a hand-built content
// object that skipped signing) are passed through unchanged.
function resolvePaymentConstraintDisclosures(content, disclosures, sdAlg) {
  const disclosableTypes = ['payment.allowed_payees', 'payment.allowed_payment_instruments'];
  const constraints = (content.constraints ?? []).map((constraint) => {
    if (!disclosableTypes.includes(constraint?.type) || !Array.isArray(constraint.allowed)) {
      return constraint;
    }
    const allowed = constraint.allowed.map((entry) => {
      const digest = entry?.['...'];
      if (typeof digest !== 'string') {
        return entry;
      }
      const disclosure = findDisclosureByDigest(disclosures, digest, sdAlg);
      if (!disclosure) {
        throw new Error(`No disclosure found for a "${constraint.type}" array-element digest`);
      }
      return decodeArrayElementDisclosure(disclosure);
    });
    return { ...constraint, allowed };
  });
  return { ...content, constraints };
}

/**
 * Decodes and resolves an Open Payment Mandate presentation's own content
 * (`constraints`, `cnf`, `exp`, ...) -- WITHOUT verifying an issuer signature.
 *
 * Open Payment Mandates are signed by the User's key (see
 * `signOpenPaymentMandate`), which is generally a *different* key from the
 * mandate's own `cnf.jwk` (the Agent's key, only endorsed to close it later)
 * -- so, unlike `verifyClosedCheckoutMandate`/`verifyClosedPaymentMandate`,
 * there is no single key this package can check the envelope signature
 * against on its own. A caller that independently knows the issuing User's
 * public key can verify the envelope itself (`verifyJWT`, on the `issuerJwt`
 * half of `parseSdJwtPresentation`'s result) before or after calling this.
 *
 * What this DOES check: the SD-JWT's internal digest/disclosure consistency
 * (a hand-edited constraints blob whose digest no longer matches
 * `delegate_payload` is rejected), that the resolved content matches the
 * Open Payment Mandate schema, and (when `exp` is present) that it hasn't
 * passed.
 *
 * @param {string} presentation
 * @param {{currentDate?: Date, clockTolerance?: number}} options
 * @returns {{content: object, protectedHeader: object}}
 */
export function resolveOpenPaymentMandateContent(
  presentation,
  { currentDate = new Date(), clockTolerance = DEFAULT_CLOCK_TOLERANCE } = {},
) {
  const { issuerJwt, disclosures } = parseSdJwtPresentation(presentation);
  const payload = decodeJwtPayload(issuerJwt, OPEN_PAYMENT_MANDATE_LABEL);
  const protectedHeader = decodeJwtProtectedHeader(issuerJwt, OPEN_PAYMENT_MANDATE_LABEL);
  const sdAlg = getSdAlg(payload);

  const rawContent = resolveMandateContent(payload, disclosures, sdAlg);
  const resolvedContent = resolvePaymentConstraintDisclosures(rawContent, disclosures, sdAlg);
  const content = buildOpenPaymentMandate(resolvedContent);

  // Unlike the Closed mandate envelopes, `exp` lives on the disclosed content
  // itself, not on the outer signed envelope payload (which is just
  // `{delegate_payload, _sd_alg}`) -- so it's checked against `content` here.
  checkNotExpired(content, { currentDate, clockTolerance }, OPEN_PAYMENT_MANDATE_LABEL);

  return { content, protectedHeader };
}
