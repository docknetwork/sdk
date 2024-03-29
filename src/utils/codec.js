import { u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

/**
 * Check if the given input is hexadecimal or not. Optionally checks for the byte size of the hex. Case-insensitive on hex chars
 * @param {string} value - Hexadecimal value
 * @param {number} [byteSize] - Expected byte size of the input.
 * @return {Boolean} True if hex (with given size) else false
 */
export function isHexWithGivenByteSize(value, byteSize = undefined) {
  if (typeof value !== 'string') {
    return false;
  }
  const match = value.match(/^0x([0-9a-f]+$)/i);
  if (match && match.length > 1) {
    if (byteSize !== undefined) {
      // If `byteSize` is not a positive integer type, then check will fail
      // 2 hex digits make a byte
      return match[1].length === 2 * byteSize;
    }
    // Don't care about byte size of the match but it must be full byte
    return match[1].length % 2 === 0;
  }
  return false;
}

/**
 * Gets the hexadecimal value of the given string.
 * @return {string} Returns the hexadecimal representation of the ID.
 */
export function getHexIdentifier(id, qualifiers, byteSize) {
  const strId = String(id);

  for (const qualifier of [].concat(qualifiers)) {
    if (strId.startsWith(qualifier)) {
      // Fully qualified ID. Remove the qualifier
      const ss58Did = strId.slice(qualifier.length);
      try {
        const hex = u8aToHex(decodeAddress(ss58Did));
        // 2 characters for `0x` and 2*byte size of ID
        if (hex.length !== 2 + 2 * byteSize) {
          throw new Error('Unexpected byte size');
        }
        return hex;
      } catch (e) {
        throw new Error(`Invalid SS58 ID ${strId} with qualifier ${qualifier}. ${e}`);
      }
    }
  }

  try {
    // Check if hex and of correct size and return the hex value if successful.
    if (!isHexWithGivenByteSize(strId, byteSize)) {
      throw new Error(`Expected ${byteSize}-byte sequence`);
    }

    return strId;
  } catch (error) {
    // Cannot parse as hex
    throw new Error(`Invalid hex Did \`${id}\`, stringified \`${strId}\`: ${error}`);
  }
}

/**
 * Convert address to Dock appropriate network address.
 * @param addr - address to convert
 * @param network - the network to use, allowed values are `main`, `test` and `dev` corresponding to mainnet, testnet and dev node
 */
export function asDockAddress(addr, network = 'test') {
  switch (network) {
    case 'dev':
      return encodeAddress(addr, 42);
    case 'test':
      return encodeAddress(addr, 21);
    case 'main':
      return encodeAddress(addr, 22);
    default:
      throw new Error(
        `Network can be either test or main or dev but was passed as ${network}`,
      );
  }
}

/**
 * Normalizes the given input to hex. Expects a Uint8Array or a hex string
 * @param {Uint8Array|string} data
 */
export function normalizeToHex(data) {
  let hex;
  if (data instanceof Uint8Array) {
    hex = u8aToHex(data);
  } else if (isHexWithGivenByteSize(data)) {
    hex = data;
  } else {
    throw new Error('Require a hex string or a byte array');
  }
  return hex;
}
