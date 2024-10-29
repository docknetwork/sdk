import { encode, decode } from '@subsquid/ss58-codec';
import { normalizeToU8a, u8aToHex } from './bytes';

/**
 * Encodes an address in SS58 format, which includes a network prefix.
 *
 * @param {string | Uint8Array} address - The address to encode, which can be a string or a Uint8Array.
 * @param {number} [prefix=42] - The network prefix to use for SS58 encoding. Defaults to 42 if not specified.
 *
 * @returns {string} - The SS58 encoded address.
 */
export const encodeAsSS58 = (address, prefix = 42) => encode({
  bytes: normalizeToU8a(address),
  prefix,
});

/**
 * Decodes an SS58 encoded address and converts it to a hexadecimal format.
 *
 * @param {string} value - The SS58 encoded address to decode.
 *
 * @returns {string} - The decoded address in hexadecimal format.
 */
export const decodeFromSS58 = (value) => u8aToHex(decode(value).bytes);

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
