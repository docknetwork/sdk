import bs58 from 'bs58';
import BLAKE2b from 'blake2b';
import { normalizeToU8a, u8aToHex } from '../bytes';

const SS58_PREFIX = new TextEncoder().encode('SS58PRE');

/**
 * Encodes prefix bytes for SS58 address.
 *
 * @param {number} prefix - Network prefix to encode.
 * @returns {Uint8Array} - Encoded prefix bytes.
 */
const encodePrefixBytes = (prefix) => new Uint8Array(
  prefix < 64 ? [prefix] : [((prefix & 0xff00) >> 8) | 0x40, prefix & 0xff], // eslint-disable-line no-bitwise
);

/**
 * Calculates checksum for SS58 address.
 *
 * @param {Uint8Array} prefixBytes - Encoded prefix bytes.
 * @param {Uint8Array} addressBytes - Address bytes.
 * @returns {Uint8Array} - Calculated checksum.
 */
const calculateChecksum = (prefixBytes, addressBytes) => {
  const checksumInput = new Uint8Array([
    ...SS58_PREFIX,
    ...prefixBytes,
    ...addressBytes,
  ]);

  const hash = BLAKE2b(64).update(checksumInput).digest();
  const checksumSize = prefixBytes.length === 2 ? 3 : 2;

  return hash.slice(0, checksumSize);
};

/**
 * Decodes prefix from SS58 encoded address.
 *
 * @param {Uint8Array} decoded - Decoded address bytes.
 * @returns {Object} - Decoded prefix information.
 */
const decodePrefixInfo = (decoded) => {
  if (decoded[0] < 64) {
    const checksumSize = 2;

    return {
      prefix: decoded[0],
      addressBytes: decoded.slice(1, -checksumSize),
      checksumSize,
      prefixBytes: new Uint8Array([decoded[0]]),
    };
  }

  const prefix = ((decoded[0] & 0x3f) << 8) + decoded[1]; // eslint-disable-line no-bitwise
  const checksumSize = 3;
  return {
    prefix,
    addressBytes: decoded.slice(2, -checksumSize),
    checksumSize,
    prefixBytes: new Uint8Array([
      ((prefix & 0xff00) >> 8) | 0x40, // eslint-disable-line no-bitwise
      prefix & 0xff, // eslint-disable-line no-bitwise
    ]),
  };
};

/**
 * Encodes an address in SS58 format, including a network prefix.
 *
 * @param {string | Uint8Array} address - The address to encode.
 * @param {number} [prefix=42] - The SS58 network prefix.
 *
 * @returns {string} - The SS58 encoded address.
 */
export const encodeAsSS58 = (address, prefix = 42) => {
  const bytes = normalizeToU8a(address);
  const prefixBytes = encodePrefixBytes(prefix);
  const checksum = calculateChecksum(prefixBytes, bytes);

  const ss58Bytes = new Uint8Array([...prefixBytes, ...bytes, ...checksum]);
  return bs58.encode(ss58Bytes);
};

/**
 * Decodes an SS58 encoded address and converts it to hex.
 *
 * @param {string} value - The SS58 encoded address.
 * @returns {string} - The decoded address in hex format.
 */
export const decodeFromSS58 = (value) => {
  try {
    const decoded = bs58.decode(value);

    if (decoded.length < 6) {
      throw new Error('too short');
    }

    const { addressBytes, checksumSize, prefixBytes } = decodePrefixInfo(decoded);

    const calculatedChecksum = calculateChecksum(prefixBytes, addressBytes);
    const providedChecksum = decoded.slice(-checksumSize);

    if (!calculatedChecksum.every((byte, i) => byte === providedChecksum[i])) {
      throw new Error('checksum mismatch');
    }

    return u8aToHex(addressBytes);
  } catch (err) {
    throw new Error(`Invalid SS58 address: ${err.message}`);
  }
};

/**
 * Convert address to Dock appropriate network address.
 * @param addr - address to convert
 * @param network - the network to use, allowed values are `main`, `test` and `dev` corresponding to mainnet, testnet and dev node
 */
export const asDockAddress = (addr, network = 'test') => {
  switch (network) {
    case 'dev':
      return encodeAsSS58(addr, 42);
    case 'test':
      return encodeAsSS58(addr, 21);
    case 'main':
      return encodeAsSS58(addr, 22);
    default:
      throw new Error(
        `Network can be either test or main or dev but was passed as ${network}`,
      );
  }
};
