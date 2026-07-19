import { createHash } from 'node:crypto';

import { decodeJwtPayload } from './jws';

const SD_HASH_ALGORITHMS = {
  'sha-256': 'sha256',
  'sha-384': 'sha384',
  'sha-512': 'sha512',
};

/**
 * Encodes an RFC 9901 Disclosure array as base64url.
 *
 * @param {Array} disclosure `[salt, claimName, value]` or `[salt, value]`
 * @returns {string}
 */
export function encodeSdJwtDisclosure(disclosure) {
  if (
    !Array.isArray(disclosure)
    || (disclosure.length !== 2 && disclosure.length !== 3)
    || typeof disclosure[0] !== 'string'
    || (disclosure.length === 3 && typeof disclosure[1] !== 'string')
  ) {
    throw new TypeError(
      'Disclosure must be [salt, value] or [salt, claimName, value]',
    );
  }

  return Buffer.from(JSON.stringify(disclosure), 'utf8').toString('base64url');
}

/**
 * Parses one compact SD-JWT presentation without verifying it.
 *
 * @param {string} presentation
 * @returns {{issuerJwt: string, disclosures: string[], kbJwt?: string}}
 */
export function parseSdJwtPresentation(presentation) {
  if (typeof presentation !== 'string' || presentation.length === 0) {
    throw new TypeError('SD-JWT presentation must be a non-empty string');
  }
  if (!presentation.includes('~')) {
    throw new Error('SD-JWT presentation must contain a tilde');
  }

  const segments = presentation.split('~');
  const issuerJwt = segments.shift();
  decodeJwtPayload(issuerJwt, 'SD-JWT issuer');

  const last = segments.at(-1);
  let kbJwt;
  if (last === '') {
    segments.pop();
  } else if (last?.split('.').length === 3) {
    kbJwt = segments.pop();
  } else {
    throw new Error(
      'SD-JWT presentation must end in a tilde or a key-binding JWT',
    );
  }

  if (segments.some((disclosure) => (
    disclosure.length === 0 || !/^[A-Za-z0-9_-]+$/.test(disclosure)
  ))) {
    throw new Error('SD-JWT presentation contains an invalid disclosure');
  }

  return {
    issuerJwt,
    disclosures: segments,
    ...(kbJwt === undefined ? {} : { kbJwt }),
  };
}

/**
 * Selects and parses the final SD-JWT from a chained presentation.
 *
 * @param {string} presentation
 * @param {{chainSeparator?: string}} options
 * @returns {{issuerJwt: string, disclosures: string[], kbJwt?: string}}
 */
export function parseFinalSdJwtPresentation(
  presentation,
  { chainSeparator = '~~' } = {},
) {
  if (typeof presentation !== 'string' || presentation.length === 0) {
    throw new TypeError('SD-JWT presentation must be a non-empty string');
  }
  if (typeof chainSeparator !== 'string' || chainSeparator.length === 0) {
    throw new TypeError('"chainSeparator" must be a non-empty string');
  }

  const presentations = presentation.split(chainSeparator);
  if (presentations.some((entry) => entry.length === 0)) {
    throw new Error('SD-JWT chain contains an empty presentation');
  }

  const finalPresentation = presentations.at(-1);
  return parseSdJwtPresentation(
    finalPresentation.startsWith('~')
      ? finalPresentation.slice(1)
      : finalPresentation,
  );
}

/**
 * Computes an RFC 9901 sd_hash over an issuer JWT and selected disclosures.
 * The exact encoded disclosure strings and their order are preserved.
 *
 * @param {{issuerJwt: string, disclosures?: string[]}} parts
 * @returns {string}
 */
export function computeSdHash({ issuerJwt, disclosures = [] }) {
  if (!Array.isArray(disclosures)) {
    throw new TypeError('"disclosures" must be an array');
  }
  if (disclosures.some((disclosure) => (
    typeof disclosure !== 'string'
    || disclosure.length === 0
    || !/^[A-Za-z0-9_-]+$/.test(disclosure)
  ))) {
    throw new Error('"disclosures" contains an invalid encoded disclosure');
  }

  const issuerPayload = decodeJwtPayload(issuerJwt, 'SD-JWT issuer');
  const sdAlgorithm = String(
    Reflect.get(issuerPayload, '_sd_alg') ?? 'sha-256',
  ).toLowerCase();
  const hashAlgorithm = SD_HASH_ALGORITHMS[sdAlgorithm];
  if (!hashAlgorithm) {
    throw new Error(`Unsupported SD-JWT hash algorithm: ${sdAlgorithm}`);
  }

  const encodedPresentation = `${[issuerJwt, ...disclosures].join('~')}~`;
  return createHash(hashAlgorithm)
    .update(Buffer.from(encodedPresentation, 'ascii'))
    .digest('base64url');
}
