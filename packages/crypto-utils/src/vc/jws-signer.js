import { valueBytes } from '../utils';

/**
 * Adapts a Dock keypair to the raw-byte signer contract used by JWS helpers.
 * ECDSA output remains Dock's 65-byte r || s || recovery representation.
 *
 * @param {import('../keypairs/dock-keypair').default} keypair
 * @returns {{sign: function({data: Uint8Array}): Uint8Array}}
 */
export function createRawSigner(keypair) {
  return {
    sign({ data }) {
      return valueBytes(keypair.sign(data));
    },
  };
}

/**
 * Adapts a Dock or DID keypair to the signer contract used by JWS helpers.
 * Dock ECDSA signatures include a recovery byte; JOSE uses only r || s.
 *
 * @param {{sign: function(Uint8Array): *}} keypair
 * @returns {{sign: function({data: Uint8Array}): Uint8Array}}
 */
export function createJwsSigner(keypair) {
  return {
    sign({ data }) {
      const signature = valueBytes(keypair.sign(data));
      return signature.length === 65 ? signature.slice(0, 64) : signature;
    },
  };
}

function encodeDERInteger(bytes) {
  let offset = 0;
  while (offset < bytes.length - 1 && bytes[offset] === 0) {
    offset += 1;
  }

  const value = bytes.slice(offset);
  // eslint-disable-next-line no-bitwise
  const encoded = value[0] & 0x80 ? Uint8Array.of(0, ...value) : value;
  return Uint8Array.of(0x02, encoded.length, ...encoded);
}

/**
 * Converts a JOSE ECDSA signature from 64-byte r || s form to ASN.1 DER.
 *
 * @param {*} signature
 * @returns {Uint8Array}
 */
export function joseSignatureToDER(signature) {
  const bytes = valueBytes(signature);
  if (bytes.length !== 64) {
    throw new Error(
      `Invalid JOSE signature length. Expected 64 bytes, received ${bytes.length}`,
    );
  }

  const r = encodeDERInteger(bytes.slice(0, 32));
  const s = encodeDERInteger(bytes.slice(32));
  return Uint8Array.of(0x30, r.length + s.length, ...r, ...s);
}
