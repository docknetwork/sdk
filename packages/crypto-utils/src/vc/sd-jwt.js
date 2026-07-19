import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';
import { digest, generateSalt, ES256 } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import base64url from 'base64url';

import {
  getKeyFromDIDDocument,
  publicKeyFromKeyDocument,
} from '../key-utils';
import { valueBytes } from '../utils';
import { jwkToPublicKey } from './jwk';
import {
  decodeJwtPayload,
  decodeJwtProtectedHeader,
  getJWTAlgorithm,
  supportedJWTAlgorithms,
  verifyJwtSignature,
  verKeyType,
} from './jws';

const SD_HASH_ALGORITHMS = {
  'sha-256': sha256,
  'sha-384': sha384,
  'sha-512': sha512,
};

function createSdJwtInstance(options = {}) {
  return new SDJwtVcInstance({
    hasher: digest,
    hashAlg: 'sha-256',
    saltGenerator: generateSalt,
    ...options,
  });
}

function getDocLoader(documentLoader, resolver) {
  if (documentLoader && resolver) {
    throw new Error(
      'Passing resolver and documentLoader results in resolver being ignored, please re-factor.',
    );
  }
  if (documentLoader) {
    return documentLoader;
  }
  if (!resolver) {
    return null;
  }
  return async (uri) => ({
    document: await resolver.resolve(uri),
    documentUrl: uri,
    contextUrl: null,
  });
}

function decodeJwtPartAsJson(part, partName) {
  if (!part) {
    return {};
  }
  try {
    return JSON.parse(base64url.decode(part));
  } catch (cause) {
    throw new Error(`Invalid SD-JWT ${partName}`, { cause });
  }
}

function getSDJWTSignAlg(jwt) {
  try {
    const header = decodeJwtProtectedHeader(jwt.split('~')[0], 'SD-JWT');
    return header.alg || 'EdDSA';
  } catch {
    return 'EdDSA';
  }
}

function claimsToCredentialResult(presentationClaims) {
  const {
    iss,
    iat,
    exp,
    vct,
    ...subject
  } = presentationClaims;

  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    issuanceDate: new Date(iat * 1000).toISOString(),
    issuer: String(iss).split('#')[0],
    type: [vct],
    expirationDate: exp ? new Date(exp * 1000).toISOString() : undefined,
    credentialSubject: subject,
    proof: null,
  };
}

function extractSdJwtParts(jwtStr, decoded) {
  const [jwtHeader, jwtPayload] = jwtStr.split('.');
  const rawHeader = decoded?.jwt?.header || decodeJwtPartAsJson(jwtHeader, 'header');
  const rawPayload = decoded?.jwt?.payload || decodeJwtPartAsJson(jwtPayload, 'payload');
  return {
    issuerKey: decoded?.jwt?.payload?.iss ?? rawPayload?.iss,
    headerKid: decoded?.jwt?.header?.kid ?? rawHeader?.kid,
    verificationJWK: decoded?.jwt?.payload?.cnf?.jwk
      || rawPayload?.cnf?.jwk
      || decoded?.jwt?.header?.jwk
      || rawHeader?.jwk,
  };
}

function applyEmbeddedJwk(verificationJWK, signAlg) {
  if (!verificationJWK) {
    return { verifierKey: null, dockPublicKey: null, verificationJWK: null };
  }
  if (signAlg === 'ES256') {
    return {
      verifierKey: { type: 'JsonWebKey2020', publicKeyJwk: verificationJWK },
      dockPublicKey: null,
      verificationJWK,
    };
  }
  const dockPublicKey = jwkToPublicKey(verificationJWK, signAlg);
  return { verifierKey: dockPublicKey, dockPublicKey, verificationJWK };
}

function normalizeResolvedKey(resolvedKey, signAlg) {
  if (resolvedKey == null) {
    return { verifierKey: null, dockPublicKey: null };
  }
  if (typeof resolvedKey.verifier === 'function') {
    return { verifierKey: resolvedKey, dockPublicKey: null };
  }
  if (resolvedKey.publicKeyJwk) {
    const dockPublicKey = jwkToPublicKey(resolvedKey.publicKeyJwk, signAlg);
    return { verifierKey: resolvedKey, dockPublicKey };
  }
  if (verKeyType(resolvedKey) != null) {
    return { verifierKey: resolvedKey, dockPublicKey: resolvedKey };
  }
  const dockPublicKey = valueBytes(resolvedKey);
  return { verifierKey: resolvedKey, dockPublicKey };
}

async function resolveIssuerKey({
  keyResolver,
  docLoader,
  issuerKey,
  headerKid,
  signAlg,
}) {
  if (typeof keyResolver === 'function') {
    return normalizeResolvedKey(
      await keyResolver(issuerKey ?? headerKid),
      signAlg,
    );
  }
  if (!docLoader) {
    // eslint-disable-next-line sonarjs/no-duplicate-string -- keep dock-compatible raw error text
    throw new Error('Issuer key not found in SDJWT iss property');
  }

  const uri = headerKid || issuerKey;
  const { document } = await docLoader(uri);
  const keyDocument = getKeyFromDIDDocument(document, uri);
  if (!keyDocument) {
    throw new Error(`Cannot find key document with ID: ${uri}`);
  }
  const verifierKey = publicKeyFromKeyDocument(keyDocument, signAlg);
  if (typeof verifierKey?.verifier === 'function') {
    return { verifierKey, dockPublicKey: null };
  }
  return { verifierKey, dockPublicKey: verifierKey };
}

function createPresentationVerifier({
  jwtStr,
  signAlg,
  getState,
}) {
  let es256Verifier;
  return async (data, sig) => {
    const { verificationJWK, verifierKey, dockPublicKey } = getState();

    if (verificationJWK && signAlg === 'ES256') {
      if (!es256Verifier) {
        es256Verifier = await ES256.getVerifier(verificationJWK);
      }
      const signInput = typeof data === 'string' ? data : Buffer.from(data).toString();
      return es256Verifier(signInput, sig);
    }

    if (verifierKey && typeof verifierKey.verifier === 'function') {
      const isJWK = verifierKey.type === 'JsonWebKey2020';
      const { verify } = verifierKey.verifier();
      if (isJWK) {
        return verify({
          data: Buffer.from(data),
          signature: jwtStr.split('~')[0],
        });
      }
      const signature = typeof sig === 'string'
        ? new Uint8Array(base64url.toBuffer(sig))
        : valueBytes(sig);
      return verify({ data, signature });
    }

    const publicKey = dockPublicKey ?? verifierKey;
    if (publicKey == null) {
      return false;
    }
    return verifyJwtSignature(data, sig, publicKey, signAlg);
  };
}

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
  const hash = SD_HASH_ALGORITHMS[sdAlgorithm];
  if (!hash) {
    throw new Error(`Unsupported SD-JWT hash algorithm: ${sdAlgorithm}`);
  }

  const encodedPresentation = `${[issuerJwt, ...disclosures].join('~')}~`;
  return Buffer.from(hash(Buffer.from(encodedPresentation, 'ascii'))).toString(
    'base64url',
  );
}

/**
 * Checks whether a compact JWT/SD-JWT string is an SD-JWT credential.
 *
 * @param {*} jwt
 * @returns {boolean}
 */
export function isSDJWTCredential(jwt) {
  if (typeof jwt !== 'string' || !jwt.includes('.')) {
    return false;
  }

  try {
    const decodedHeader = JSON.parse(base64url.decode(jwt.split('.')[0]));
    return decodedHeader?.typ === 'dc+sd-jwt' || decodedHeader?.typ === 'vc+sd-jwt';
  } catch {
    return false;
  }
}

/**
 * Decodes a compact SD-JWT without verifying its signature.
 *
 * @param {string} presentation
 * @returns {Promise<object>}
 */
export async function decodeSdJwt(presentation) {
  const sdjwt = createSdJwtInstance();
  return sdjwt.decode(presentation);
}

/**
 * Verifies an SD-JWT credential using dock-API-compatible options and return shape.
 *
 * Callers supply issuer keys via `keyResolver`, embedded JWK, `documentLoader`, or
 * `resolver`. crypto-utils does not resolve DIDs itself.
 *
 * @param {string|{jwt: string}} body
 * @param {string[]} [requiredAttribs]
 * @param {object} [options]
 * @param {function} [options.keyResolver] async (issOrKid) => verification key
 * @param {function} [options.documentLoader] (uri) => Promise<{document}>
 * @param {{supports: function, resolve: function}} [options.resolver]
 * @param {string[]} [options.algorithms]
 * @returns {Promise<{verified: true, errors: [], results: [], credentialResults: object[]}>}
 */
export async function verifySDJWTCredential(
  body,
  requiredAttribs,
  {
    keyResolver = null,
    documentLoader = null,
    resolver = null,
    algorithms = supportedJWTAlgorithms,
  } = {},
) {
  const jwtStr = typeof body === 'string' ? body : body?.jwt;
  if (typeof jwtStr !== 'string' || jwtStr.length === 0) {
    throw new TypeError('SD-JWT credential must be a non-empty string or { jwt }');
  }
  if (!isSDJWTCredential(jwtStr)) {
    throw new Error('Credential is not an SD-JWT (expected typ dc+sd-jwt or vc+sd-jwt)');
  }

  const signAlg = getSDJWTSignAlg(jwtStr);
  if (!algorithms.includes(signAlg)) {
    throw new Error(`Unsupported JWT algorithm: ${signAlg}`);
  }
  getJWTAlgorithm(signAlg);

  // Validate loader options before decode so mutual-exclusion errors surface first.
  const docLoader = getDocLoader(documentLoader, resolver);

  const state = {
    verifierKey: null,
    dockPublicKey: null,
    verificationJWK: null,
  };

  const sdjwt = createSdJwtInstance({
    signAlg,
    verifier: createPresentationVerifier({
      jwtStr,
      signAlg,
      getState: () => state,
    }),
  });

  const decoded = await sdjwt.decode(jwtStr);
  const { issuerKey, headerKid, verificationJWK } = extractSdJwtParts(jwtStr, decoded);
  Object.assign(state, applyEmbeddedJwk(verificationJWK, signAlg));

  if (!state.verifierKey && !issuerKey && !headerKid) {
    // eslint-disable-next-line sonarjs/no-duplicate-string -- keep dock-compatible raw error text
    throw new Error('Issuer key not found in SDJWT iss property');
  }

  if (!state.verifierKey) {
    Object.assign(state, await resolveIssuerKey({
      keyResolver,
      docLoader,
      issuerKey,
      headerKid,
      signAlg,
    }));
  }

  if (!state.verifierKey && state.dockPublicKey == null) {
    // eslint-disable-next-line sonarjs/no-duplicate-string -- keep dock-compatible raw error text
    throw new Error('Issuer key not found in SDJWT iss property');
  }

  await sdjwt.verify(jwtStr, requiredAttribs);
  const presentationClaims = await sdjwt.getClaims(jwtStr);

  return {
    verified: true,
    errors: [],
    results: [],
    credentialResults: [claimsToCredentialResult(presentationClaims)],
  };
}
