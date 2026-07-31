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
const OPEN_CHECKOUT_MANDATE_LABEL = 'Open Checkout Mandate';

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

// Binds a Closed Mandate to the one transaction it was issued for. Closed
// Mandate envelopes carry no exp of their own (see requireExpectedNonce) --
// their only expiry is inherited from the referenced Open Mandate, which is
// typically valid for an entire shopping session. Without comparing "nonce"
// against a value the verifier itself generated and tracks as single-use,
// a validly-signed Closed Mandate presentation can be replayed indefinitely.
function checkNonce(payload, expectedNonce) {
  if (payload.nonce !== expectedNonce) {
    throw new Error('"nonce" does not match the expected value');
  }
}

function requireExpectedNonce(expectedNonce) {
  if (typeof expectedNonce !== 'string' || expectedNonce.length === 0) {
    throw new TypeError(
      '"expectedNonce" is required: the merchant-generated, single-use nonce is what binds a '
      + 'Closed Mandate to one specific transaction -- without checking it, a validly-signed '
      + 'presentation could be replayed for a different transaction indefinitely',
    );
  }
}

// Rejects an Open Mandate presentation (typ: dc+sd-jwt) fed in where a Closed
// Mandate (typ: kb+sd-jwt) is expected, or any other envelope type confusion.
// Other checks (aud, _sd, checkout_hash) would likely also catch a swapped-in
// envelope, but this rejects it immediately, with a clearer error, rather
// than relying on that being true in every case.
function checkTyp(protectedHeader) {
  if (protectedHeader.typ !== 'kb+sd-jwt') {
    throw new Error(`Expected envelope "typ" of "kb+sd-jwt", got "${protectedHeader.typ}"`);
  }
}

function checkSdHashAgainstOpenMandate(payload, openMandatePresentation, label) {
  const { issuerJwt: openIssuerJwt, disclosures: openDisclosures } = parseSdJwtPresentation(
    openMandatePresentation,
  );
  const expectedSdHash = computeSdHash({ issuerJwt: openIssuerJwt, disclosures: openDisclosures });
  if (payload.sd_hash !== expectedSdHash) {
    throw new Error(`"sd_hash" does not match the referenced ${label} presentation`);
  }
}

function requireOpenMandatePresentation(openMandatePresentation) {
  if (typeof openMandatePresentation !== 'string' || openMandatePresentation.length === 0) {
    throw new TypeError(
      '"openMandatePresentation" is required: the verification key is always derived from '
      + 'its cnf.jwk, never trusted from a caller-supplied key',
    );
  }
}

function requireUserPublicKey(userPublicKey) {
  if (userPublicKey === undefined) {
    throw new TypeError(
      '"userPublicKey" is required: without it, the Open Mandate\'s own issuer signature -- '
      + 'and therefore its cnf.jwk delegation -- is never verified, and the whole mandate chain '
      + 'could be entirely self-forged',
    );
  }
}

// Verifies an Open Mandate's own issuer envelope against the trusted User
// key the caller separately resolved (e.g. via DID resolution or a wallet
// registry) -- the only way to confirm this Open Mandate, and therefore the
// cnf.jwk delegation inside it, actually came from the User it claims to,
// rather than being entirely self-forged.
function verifyOpenMandateIssuer(issuerJwt, userPublicKey, label) {
  const result = verifyJWT(issuerJwt, userPublicKey, { algorithms: ['ES256'] });
  if (!result.verified) {
    throw new Error(`${label} issuer signature verification failed`);
  }
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
 * The envelope signature is verified against the referenced Open Checkout
 * Mandate's own `cnf.jwk`, derived from the required `openMandatePresentation`
 * — never against a caller-supplied key. Deriving the key from the Open
 * Mandate itself, rather than trusting whatever key a caller separately
 * claims is the holder, is what actually enforces that this presentation was
 * closed by the party the Open Mandate delegated to — a caller-supplied key
 * that happens to verify a signature proves nothing about *whose* key it was
 * authorized to be.
 *
 * That delegation is only meaningful if the Open Mandate itself was actually
 * signed by the User it claims to be from -- otherwise an attacker can
 * fabricate an entire Open + Closed Mandate chain naming their own key in
 * `cnf.jwk`. The required `userPublicKey` is the caller's independently
 * resolved trusted key for that User (e.g. via DID resolution or a wallet
 * registry), verified here against the Open Mandate's envelope.
 *
 * Also verifies the envelope's `typ === "kb+sd-jwt"` (rejecting an Open
 * Mandate or other envelope type fed in where a Closed Mandate is expected),
 * the `checkout_jwt` disclosure against the content's `_sd` digest,
 * `checkout_hash` against a fresh hash of the revealed `checkout_jwt`,
 * `aud === "merchant"`, expiry, `nonce` against the required `expectedNonce`,
 * and `sd_hash` against `openMandatePresentation`. See
 * `signClosedCheckoutMandate` for the `sd_hash` caveat.
 *
 * `expectedNonce` matters because Closed Mandate envelopes carry no `exp` of
 * their own -- their only expiry is inherited from the referenced Open
 * Mandate, which is typically valid for an entire shopping session. Without
 * checking `nonce` against a value the merchant itself generated and tracks
 * as single-use, a validly-signed Closed Mandate presentation could be
 * replayed for a different transaction indefinitely.
 *
 * @param {string} presentation
 * @param {{openMandatePresentation: string, userPublicKey: *, expectedNonce: string,
 * currentDate?: Date, clockTolerance?: number}} options
 * @returns {{verified: boolean, content?: object, checkoutJwt?: string,
 * protectedHeader?: object, sdHashVerified?: boolean,
 * openMandateIssuerVerified?: boolean, error?: Error}}
 */
export function verifyClosedCheckoutMandate(
  presentation,
  {
    openMandatePresentation, userPublicKey, expectedNonce,
    currentDate = new Date(), clockTolerance = DEFAULT_CLOCK_TOLERANCE,
  } = {},
) {
  try {
    requireOpenMandatePresentation(openMandatePresentation);
    requireUserPublicKey(userPublicKey);
    requireExpectedNonce(expectedNonce);
    const { issuerJwt, disclosures } = parseSdJwtPresentation(presentation);
    const verificationKey = jwkToSecp256r1PublicKey(
      resolveOpenCheckoutMandateContent(
        openMandatePresentation,
        { userPublicKey, currentDate, clockTolerance },
      ).content.cnf.jwk,
    );
    const result = verifyJWT(issuerJwt, verificationKey, { algorithms: ['ES256'] });
    if (!result.verified) {
      return result;
    }
    const { payload, protectedHeader } = result;
    checkTyp(protectedHeader);
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
    checkNonce(payload, expectedNonce);
    checkSdHashAgainstOpenMandate(payload, openMandatePresentation, 'Open Checkout Mandate');

    return {
      verified: true,
      content: validatedContent,
      checkoutJwt,
      protectedHeader,
      sdHashVerified: true,
      openMandateIssuerVerified: true,
    };
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Verifies a Closed Payment Mandate presentation.
 *
 * The envelope signature is verified against the referenced Open Payment
 * Mandate's own `cnf.jwk`, derived from the required `openMandatePresentation`
 * — never against a caller-supplied key. See `verifyClosedCheckoutMandate`'s
 * doc comment for why deriving the key from the mandate itself matters, and
 * for why the required `userPublicKey` (verified against the Open Payment
 * Mandate's own envelope) is what makes that delegation trustworthy in the
 * first place, rather than an entirely self-forgeable chain. Also verifies
 * the envelope's `typ === "kb+sd-jwt"`, `aud === "credential-provider"`,
 * expiry, `nonce` against the required `expectedNonce` (see
 * `verifyClosedCheckoutMandate` for why this matters -- Closed Mandate
 * envelopes carry no `exp` of their own), and `sd_hash` against
 * `openMandatePresentation`; when the corresponding Closed Checkout
 * Mandate's `checkout_jwt` is supplied, that `transaction_id` matches a
 * fresh hash of it.
 *
 * When `openCheckoutMandatePresentation` is also supplied, also verifies its
 * issuer envelope against the same `userPublicKey` (the AP2 flow's Open
 * Checkout and Open Payment Mandates are both signed by the same User) and
 * checks the Open Payment Mandate's
 * `payment.reference.conditional_transaction_id` constraint against a fresh
 * `sd_hash` of that Open Checkout Mandate presentation — the binding that
 * ties this payment authorization to one specific checkout (see the AP2
 * spec's Reference constraint).
 *
 * @param {string} presentation
 * @param {{openMandatePresentation: string, userPublicKey: *, expectedNonce: string,
 * checkoutJwt?: string, openCheckoutMandatePresentation?: string,
 * currentDate?: Date, clockTolerance?: number}} options
 * @returns {{verified: boolean, content?: object, protectedHeader?: object,
 * transactionIdVerified?: boolean, sdHashVerified?: boolean, referenceVerified?: boolean,
 * openMandateIssuerVerified?: boolean, error?: Error}}
 */
export function verifyClosedPaymentMandate(
  presentation,
  {
    checkoutJwt, openMandatePresentation, userPublicKey, expectedNonce, openCheckoutMandatePresentation,
    currentDate = new Date(), clockTolerance = DEFAULT_CLOCK_TOLERANCE,
  } = {},
) {
  try {
    requireOpenMandatePresentation(openMandatePresentation);
    requireUserPublicKey(userPublicKey);
    requireExpectedNonce(expectedNonce);
    const { issuerJwt, disclosures } = parseSdJwtPresentation(presentation);

    const openPaymentContent = resolveOpenPaymentMandateContent(
      openMandatePresentation,
      { userPublicKey, currentDate, clockTolerance },
    ).content;
    const verificationKey = jwkToSecp256r1PublicKey(openPaymentContent.cnf.jwk);

    const result = verifyJWT(issuerJwt, verificationKey, { algorithms: ['ES256'] });
    if (!result.verified) {
      return result;
    }
    const { payload, protectedHeader } = result;
    checkTyp(protectedHeader);
    const sdAlg = getSdAlg(payload);

    const content = resolveMandateContent(payload, disclosures, sdAlg);
    const validatedContent = buildClosedPaymentMandate(content);

    checkAudience(payload, 'credential-provider');
    checkNotExpired(payload, { currentDate, clockTolerance }, 'Closed Payment Mandate');
    checkNonce(payload, expectedNonce);

    let transactionIdVerified;
    if (checkoutJwt !== undefined) {
      if (validatedContent.transaction_id !== computeCheckoutHash(checkoutJwt, sdAlg)) {
        throw new Error('"transaction_id" does not match a fresh hash of the provided checkout_jwt');
      }
      transactionIdVerified = true;
    }

    checkSdHashAgainstOpenMandate(payload, openMandatePresentation, OPEN_PAYMENT_MANDATE_LABEL);

    let referenceVerified;
    if (openCheckoutMandatePresentation !== undefined) {
      const { issuerJwt: checkoutIssuerJwt, disclosures: checkoutDisclosures } = parseSdJwtPresentation(
        openCheckoutMandatePresentation,
      );
      verifyOpenMandateIssuer(checkoutIssuerJwt, userPublicKey, OPEN_CHECKOUT_MANDATE_LABEL);
      const reference = (openPaymentContent.constraints ?? []).find((c) => c?.type === 'payment.reference');
      const expectedTransactionId = computeSdHash({ issuerJwt: checkoutIssuerJwt, disclosures: checkoutDisclosures });
      referenceVerified = reference?.conditional_transaction_id === expectedTransactionId;
    }

    return {
      verified: true,
      content: validatedContent,
      protectedHeader,
      ...(transactionIdVerified === undefined ? {} : { transactionIdVerified }),
      ...(referenceVerified === undefined ? {} : { referenceVerified }),
      sdHashVerified: true,
      openMandateIssuerVerified: true,
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
 * (`constraints`, `cnf`, `exp`, ...).
 *
 * Open Payment Mandates are signed by the User's key (see
 * `signOpenPaymentMandate`), which is generally a *different* key from the
 * mandate's own `cnf.jwk` (the Agent's key, only endorsed to close it later)
 * -- so, unlike `verifyClosedCheckoutMandate`/`verifyClosedPaymentMandate`,
 * there is no single key this package can derive the envelope's expected
 * signer from on its own. Pass `userPublicKey` (the User's key, resolved by
 * the caller via whatever identity system applies -- DID resolution, a
 * wallet registry, etc.) to have this function verify the issuer signature
 * itself; **omitting it skips that verification and only checks internal
 * self-consistency**, so a mandate's `cnf.jwk` delegation cannot be trusted
 * from an unverified call.
 *
 * What this always checks, regardless of `userPublicKey`: the SD-JWT's
 * internal digest/disclosure consistency (a hand-edited constraints blob
 * whose digest no longer matches `delegate_payload` is rejected), that the
 * resolved content matches the Open Payment Mandate schema, and (when `exp`
 * is present) that it hasn't passed.
 *
 * @param {string} presentation
 * @param {{userPublicKey?: *, currentDate?: Date, clockTolerance?: number}} options
 * @returns {{content: object, protectedHeader: object, issuerVerified?: boolean}}
 */
export function resolveOpenPaymentMandateContent(
  presentation,
  { userPublicKey, currentDate = new Date(), clockTolerance = DEFAULT_CLOCK_TOLERANCE } = {},
) {
  const { issuerJwt, disclosures } = parseSdJwtPresentation(presentation);
  if (userPublicKey !== undefined) {
    verifyOpenMandateIssuer(issuerJwt, userPublicKey, OPEN_PAYMENT_MANDATE_LABEL);
  }
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

  return {
    content,
    protectedHeader,
    ...(userPublicKey === undefined ? {} : { issuerVerified: true }),
  };
}

// Reveals the array-element disclosures inside an Open Checkout Mandate's
// resolved content -- the reverse of `redactCheckoutConstraints`. Entries
// that are already plain objects (not SD-redacted) are passed through
// unchanged.
function resolveCheckoutConstraintDisclosures(content, disclosures, sdAlg) {
  const revealEntry = (entry) => {
    const digest = entry?.['...'];
    if (typeof digest !== 'string') {
      return entry;
    }
    const disclosure = findDisclosureByDigest(disclosures, digest, sdAlg);
    if (!disclosure) {
      throw new Error('No disclosure found for a checkout constraint array-element digest');
    }
    return decodeArrayElementDisclosure(disclosure);
  };

  const constraints = (content.constraints ?? []).map((constraint) => {
    if (constraint?.type === 'checkout.line_items' && Array.isArray(constraint.items)) {
      return {
        ...constraint,
        items: constraint.items.map((item) => (
          Array.isArray(item?.acceptable_items)
            ? { ...item, acceptable_items: item.acceptable_items.map(revealEntry) }
            : item
        )),
      };
    }
    if (constraint?.type === 'checkout.allowed_merchants' && Array.isArray(constraint.allowed)) {
      return { ...constraint, allowed: constraint.allowed.map(revealEntry) };
    }
    return constraint;
  });
  return { ...content, constraints };
}

/**
 * Decodes and resolves an Open Checkout Mandate presentation's own content
 * (`constraints`, `cnf`, `exp`, ...). See `resolveOpenPaymentMandateContent`'s
 * doc comment for the same caveat: Open Checkout Mandates are signed by the
 * User's key, which this package cannot verify without the caller supplying
 * `userPublicKey` -- omitting it skips issuer verification and only checks
 * internal self-consistency.
 *
 * @param {string} presentation
 * @param {{userPublicKey?: *, currentDate?: Date, clockTolerance?: number}} options
 * @returns {{content: object, protectedHeader: object, issuerVerified?: boolean}}
 */
export function resolveOpenCheckoutMandateContent(
  presentation,
  { userPublicKey, currentDate = new Date(), clockTolerance = DEFAULT_CLOCK_TOLERANCE } = {},
) {
  const { issuerJwt, disclosures } = parseSdJwtPresentation(presentation);
  if (userPublicKey !== undefined) {
    verifyOpenMandateIssuer(issuerJwt, userPublicKey, OPEN_CHECKOUT_MANDATE_LABEL);
  }
  const payload = decodeJwtPayload(issuerJwt, OPEN_CHECKOUT_MANDATE_LABEL);
  const protectedHeader = decodeJwtProtectedHeader(issuerJwt, OPEN_CHECKOUT_MANDATE_LABEL);
  const sdAlg = getSdAlg(payload);

  const rawContent = resolveMandateContent(payload, disclosures, sdAlg);
  const resolvedContent = resolveCheckoutConstraintDisclosures(rawContent, disclosures, sdAlg);
  const content = buildOpenCheckoutMandate(resolvedContent);

  // Unlike Open Payment Mandates, an Open Checkout Mandate's `exp` (like its
  // other properties) lives on the disclosed content, not the outer envelope
  // payload -- same reasoning as `resolveOpenPaymentMandateContent`.
  checkNotExpired(content, { currentDate, clockTolerance }, OPEN_CHECKOUT_MANDATE_LABEL);

  return {
    content,
    protectedHeader,
    ...(userPublicKey === undefined ? {} : { issuerVerified: true }),
  };
}
