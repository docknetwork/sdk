import elliptic from 'elliptic';

import { valueBytes } from '../utils';

const EC = elliptic.ec;
const secp256r1Curve = new EC('p256');
const secp256k1Curve = new EC('secp256k1');

/**
 * Converts a compressed or uncompressed P-256 public key to a public JWK.
 *
 * @param {*} publicKey
 * @returns {{kty: 'EC', crv: 'P-256', x: string, y: string}}
 */
export function secp256r1PublicKeyToJwk(publicKey) {
  const uncompressed = Buffer.from(
    secp256r1Curve.keyFromPublic(valueBytes(publicKey)).getPublic(false, 'array'),
  );

  return {
    kty: 'EC',
    crv: 'P-256',
    x: uncompressed.subarray(1, 33).toString('base64url'),
    y: uncompressed.subarray(33, 65).toString('base64url'),
  };
}

/**
 * Converts a public P-256 JWK to compressed SEC1 public-key bytes.
 *
 * @param {{kty: string, crv: string, x: string, y: string}} jwk
 * @returns {Uint8Array}
 */
export function jwkToSecp256r1PublicKey(jwk) {
  if (
    jwk == null
    || typeof jwk !== 'object'
    || jwk.kty !== 'EC'
    || jwk.crv !== 'P-256'
    || typeof jwk.x !== 'string'
    || typeof jwk.y !== 'string'
  ) {
    throw new TypeError('Expected a public P-256 EC JWK');
  }

  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');
  if (x.length !== 32 || y.length !== 32) {
    throw new Error('P-256 JWK coordinates must be 32 bytes');
  }

  const point = secp256r1Curve.keyFromPublic(
    Buffer.concat([Buffer.from([4]), x, y]),
  );
  return new Uint8Array(point.getPublic(true, 'array'));
}

/**
 * Converts a public Ed25519 JWK to raw public-key bytes.
 *
 * @param {{kty: string, crv: string, x: string}} jwk
 * @returns {Uint8Array}
 */
export function jwkToEd25519PublicKey(jwk) {
  if (
    jwk == null
    || typeof jwk !== 'object'
    || jwk.kty !== 'OKP'
    || jwk.crv !== 'Ed25519'
    || typeof jwk.x !== 'string'
  ) {
    throw new TypeError('Expected a public Ed25519 OKP JWK');
  }

  const publicKey = new Uint8Array(Buffer.from(jwk.x, 'base64url'));
  if (publicKey.length !== 32) {
    throw new Error('Ed25519 JWK x must be 32 bytes');
  }
  return publicKey;
}

/**
 * Converts a public secp256k1 JWK to compressed SEC1 public-key bytes.
 *
 * @param {{kty: string, crv: string, x: string, y: string}} jwk
 * @returns {Uint8Array}
 */
export function jwkToSecp256k1PublicKey(jwk) {
  if (
    jwk == null
    || typeof jwk !== 'object'
    || jwk.kty !== 'EC'
    || jwk.crv !== 'secp256k1'
    || typeof jwk.x !== 'string'
    || typeof jwk.y !== 'string'
  ) {
    throw new TypeError('Expected a public secp256k1 EC JWK');
  }

  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');
  if (x.length !== 32 || y.length !== 32) {
    throw new Error('secp256k1 JWK coordinates must be 32 bytes');
  }

  const point = secp256k1Curve.keyFromPublic(
    Buffer.concat([Buffer.from([4]), x, y]),
  );
  return new Uint8Array(point.getPublic(true, 'array'));
}

/**
 * Converts a public JWK to Dock public-key bytes for a JWT algorithm.
 *
 * @param {object} jwk
 * @param {string} algorithm EdDSA | ES256K | ES256
 * @returns {Uint8Array}
 */
export function jwkToPublicKey(jwk, algorithm) {
  switch (algorithm) {
    case 'EdDSA':
      return jwkToEd25519PublicKey(jwk);
    case 'ES256K':
      return jwkToSecp256k1PublicKey(jwk);
    case 'ES256':
      return jwkToSecp256r1PublicKey(jwk);
    default:
      throw new Error(`Unsupported JWT algorithm for JWK: ${algorithm}`);
  }
}
