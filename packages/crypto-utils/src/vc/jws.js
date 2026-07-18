import base64url from 'base64url';

import Ed25519Keypair from '../keypairs/keypair-ed25519';
import Secp256k1Keypair from '../keypairs/keypair-secp256k1';
import Secp256r1Keypair from '../keypairs/keypair-secp256r1';
import { valueBytes } from '../utils';
import {
  EcdsaSecp256k1VerKeyName,
  EcdsaSecp256r1VerKeyName,
  Ed25519VerKeyName,
} from './crypto/constants';
import { createJwsSigner, joseSignatureToDER } from './jws-signer';

const detachedHeaderParams = {
  b64: false,
  crit: ['b64'],
};

const jwtAlgorithms = {
  EdDSA: {
    Keypair: Ed25519Keypair,
    verKeyTypes: [Ed25519VerKeyName],
  },
  ES256K: {
    Keypair: Secp256k1Keypair,
    verKeyTypes: [EcdsaSecp256k1VerKeyName],
  },
  ES256: {
    Keypair: Secp256r1Keypair,
    verKeyTypes: [EcdsaSecp256r1VerKeyName],
  },
};

const supportedJWTAlgorithms = Object.keys(jwtAlgorithms);

function verKeyType(value) {
  return value?.verKeyType
    ?? value?.constructor?.VerKeyType
    ?? value?.value?.constructor?.VerKeyType
    ?? value?.keyPair?.verKeyType
    ?? value?.keyPair?.constructor?.VerKeyType;
}

function inferJWTAlgorithm(keypair) {
  const keyType = verKeyType(keypair);
  return supportedJWTAlgorithms.find(
    (candidate) => jwtAlgorithms[candidate].verKeyTypes.includes(keyType),
  );
}

function getJWTAlgorithm(algorithm) {
  const config = jwtAlgorithms[algorithm];
  if (!config) {
    throw new Error(`Unsupported JWT algorithm: ${algorithm}`);
  }
  return config;
}

// Taken from https://github.com/transmute-industries/verifiable-data/blob/main/packages/jose-ld/src/JWS/createSigner.ts
export async function signJWS(signer, type, options, data) {
  if (!type) {
    return signer.sign({ data });
  }

  const header = {
    alg: type,
    ...options.header,
    ...(options.detached ? detachedHeaderParams : undefined),
  };
  const encodedHeader = base64url.encode(JSON.stringify(header));
  const encodedPayload = base64url.encode(
    data instanceof Uint8Array
      ? Buffer.from(data).toString('utf-8')
      : JSON.stringify(data),
  );

  const toBeSigned = options.detached
    ? new Uint8Array(
      Buffer.concat([
        Buffer.from(encodedHeader, 'utf8'),
        Buffer.from('.', 'utf-8'),
        data,
      ]),
    )
    : new Uint8Array(Buffer.from(`${encodedHeader}.${encodedPayload}`));

  const signature = await signer.sign({ data: toBeSigned });

  // If not, encode it ourselves
  return options.detached
    ? `${encodedHeader}..${base64url.encode(Buffer.from(signature))}`
    : `${encodedHeader}.${encodedPayload}.${base64url.encode(
      Buffer.from(signature),
    )}`;
}

export function createJws({ encodedHeader, verifyData }) {
  const buffer = Buffer.concat([
    Buffer.from(`${encodedHeader}.`, 'utf8'),
    Buffer.from(verifyData.buffer, verifyData.byteOffset, verifyData.length),
  ]);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
}

/**
 * Signs a JSON payload as a compact JWT using a supported Dock keypair.
 *
 * @param {{sign: function(Uint8Array): *}} keypair
 * @param {object} payload
 * @param {{algorithm?: string, header?: object}} options
 * @returns {Promise<string>}
 */
export function signJWT(
  keypair,
  payload,
  { algorithm, header = {} } = {},
) {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('JWT payload must be an object');
  }

  const inferredAlgorithm = inferJWTAlgorithm(keypair);
  const selectedAlgorithm = algorithm ?? inferredAlgorithm;
  if (!selectedAlgorithm) {
    throw new Error(
      `Unsupported JWT signing key type: ${verKeyType(keypair) ?? 'unknown'}`,
    );
  }
  getJWTAlgorithm(selectedAlgorithm);
  if (inferredAlgorithm != null && selectedAlgorithm !== inferredAlgorithm) {
    throw new Error(
      `JWT algorithm ${selectedAlgorithm} does not match signing key type`,
    );
  }
  if (header.alg != null && header.alg !== selectedAlgorithm) {
    throw new Error(
      `JWT header algorithm ${header.alg} does not match signing algorithm ${selectedAlgorithm}`,
    );
  }

  return signJWS(
    createJwsSigner(keypair),
    selectedAlgorithm,
    {
      detached: false,
      header: { typ: 'JWT', ...header },
    },
    payload,
  );
}

function decodeJsonPart(encoded, name) {
  try {
    return JSON.parse(base64url.decode(encoded));
  } catch (cause) {
    throw new Error(`Invalid JWT ${name}`, { cause });
  }
}

/**
 * Verifies and decodes a compact JWT using a supported Dock public key.
 *
 * Signature and parsing failures are returned in credential-sdk style rather
 * than thrown.
 *
 * @param {string} jwt
 * @param {*} publicKey
 * @param {{algorithms?: string[]}} options
 * @returns {{verified: boolean, payload?: object, protectedHeader?: object, error?: Error}}
 */
export function verifyJWT(
  jwt,
  publicKey,
  { algorithms = supportedJWTAlgorithms } = {},
) {
  try {
    if (typeof jwt !== 'string') {
      throw new TypeError('JWT must be a string');
    }

    const parts = jwt.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      throw new Error('Malformed JWT: expected 3 non-empty parts');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const protectedHeader = decodeJsonPart(encodedHeader, 'protected header');
    const payload = decodeJsonPart(encodedPayload, 'payload');

    if (!algorithms.includes(protectedHeader.alg)) {
      throw new Error(`Unsupported JWT algorithm: ${protectedHeader.alg}`);
    }

    const algorithm = getJWTAlgorithm(protectedHeader.alg);
    const publicKeyType = verKeyType(publicKey);
    if (
      publicKeyType != null
      && !algorithm.verKeyTypes.includes(publicKeyType)
    ) {
      throw new Error(
        `JWT algorithm ${protectedHeader.alg} does not match public key type`,
      );
    }

    const signature = new Uint8Array(base64url.toBuffer(encodedSignature));
    const verifyData = new Uint8Array(
      Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8'),
    );
    const verificationSignature = protectedHeader.alg.startsWith('ES')
      ? joseSignatureToDER(signature)
      : signature;
    const verified = algorithm.Keypair.verify(
      verifyData,
      verificationSignature,
      valueBytes(publicKey),
    );

    return verified
      ? { verified: true, payload, protectedHeader }
      : { verified: false, error: new Error('Invalid JWT signature') };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
