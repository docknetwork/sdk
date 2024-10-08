import { encode, decode } from '@subsquid/ss58-codec';
import { normalizeToU8a, u8aToHex } from './bytes';

export const encodeAsSS58 = (address, prefix = 42) => encode({ bytes: normalizeToU8a(address), prefix });

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
