import { ECDH } from 'node:crypto';

import { valueBytes } from '../utils';

const CURVE = 'prime256v1';

/**
 * Converts a compressed or uncompressed P-256 public key to a public JWK.
 *
 * @param {*} publicKey
 * @returns {{kty: 'EC', crv: 'P-256', x: string, y: string}}
 */
export function secp256r1PublicKeyToJwk(publicKey) {
  const uncompressed = ECDH.convertKey(
    Buffer.from(valueBytes(publicKey)),
    CURVE,
    undefined,
    undefined,
    'uncompressed',
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

  return new Uint8Array(ECDH.convertKey(
    Buffer.concat([Buffer.from([4]), x, y]),
    CURVE,
    undefined,
    undefined,
    'compressed',
  ));
}
