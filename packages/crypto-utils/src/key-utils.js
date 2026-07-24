import { jwkToPublicKey } from './vc/jwk';
import { verKeyType } from './vc/jws';

/**
 * Wraps a value in an array when it is a single non-null entry.
 *
 * @param {*} value
 * @returns {Array}
 */
export function potentialToArray(value) {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Returns true when a document already looks like a verification key document.
 *
 * @param {*} document
 * @returns {boolean}
 */
export function isKeyDocument(document) {
  return Boolean(
    document
    && typeof document === 'object'
    && (
      document.publicKeyJwk
      || document.publicKeyBase58
      || document.publicKeyMultibase
      || (document.publicKey && !Array.isArray(document.publicKey))
      || typeof document.verifier === 'function'
      || verKeyType(document) != null
    ),
  );
}

/**
 * Selects a key document from a DID document by verification-method id.
 * If `didDocument` is already a key document, it is returned as-is.
 *
 * @param {object} didDocument
 * @param {string} didUrl
 * @returns {object|null}
 */
export function getKeyFromDIDDocument(didDocument, didUrl) {
  if (isKeyDocument(didDocument)) {
    return didDocument;
  }

  const possibleKeys = [
    ...potentialToArray(didDocument?.verificationMethod),
    ...potentialToArray(didDocument?.keyAgreement),
    ...potentialToArray(didDocument?.publicKey),
  ];

  return possibleKeys.find((key) => key?.id === didUrl) ?? null;
}

/**
 * Extracts a usable verification key from a key document for a JWT algorithm.
 * Returns LD-style keys with `.verifier()` unchanged; otherwise Dock public-key
 * material suitable for `verifyJwtSignature`.
 *
 * @param {object|null|undefined} keyDocument
 * @param {string} algorithm
 * @returns {*|null}
 */
export function publicKeyFromKeyDocument(keyDocument, algorithm) {
  if (keyDocument == null) {
    return null;
  }
  if (typeof keyDocument.verifier === 'function') {
    return keyDocument;
  }
  if (verKeyType(keyDocument) != null) {
    return keyDocument;
  }
  if (keyDocument.publicKeyJwk) {
    return jwkToPublicKey(keyDocument.publicKeyJwk, algorithm);
  }
  if (keyDocument.publicKey && !Array.isArray(keyDocument.publicKey)) {
    return keyDocument.publicKey;
  }
  throw new Error('Resolved key document does not contain a usable public key');
}
