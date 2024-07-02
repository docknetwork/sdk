import { u8aToHex } from '@polkadot/util';
import { isHexWithGivenByteSize } from '../utils/codec';
import { SizedTypedEnum } from '../utils/typed-enum';

/** Class representing a PublicKey. This export class should always be extended (abstract export class in some languages) */
export default class PublicKey extends SizedTypedEnum {
  /**
   * Check that the given public key has the expected byte size. Assumes the public key is in hex.
   */
  static validateSize(value) {
    if (!isHexWithGivenByteSize(value, this.Size)) {
      throw new Error(
        `Public key must be ${this.Size} bytes, got ${value.replace('0x', '').length / 2} bytes from value: ${value}`,
      );
    }

    return value;
  }

  /**
   * Validates the provided keyring pair and returns it in case of success.
   * @param {object} keyringPair
   * @returns {object}
   */
  static validateKeyringPair(keyringPair) {
    const pairType = getKeyPairType(keyringPair);

    if (this.Type !== pairType) {
      throw new Error(
        `Invalid keypair type - expected: ${this.Type}, received: ${pairType}`,
      );
    }

    return keyringPair;
  }

  /**
   * Extracts the public key from a pair. Assumes the KeyringPair is of the correct type. The `type` is intentionally not
   * inspected to follow dependency inversion principle.
   * generate the instance correct subclass
   * @param {object} pair A polkadot-js KeyringPair.
   * @returns {PublicKey}
   */
  static fromKeyringPair(keyringPair) {
    return new this(u8aToHex(this.validateKeyringPair(keyringPair).publicKey));
  }
}

/**
 * Return the type of signature from a given keypair
 * @param {object} pair - Can be a keypair from polkadot-js or elliptic library.
 * @returns {string|*}
 */
export function getKeyPairType(pair) {
  if (pair.type) {
    return pair.type;
  }

  if (pair.ec && pair.priv) {
    // elliptic library's pair has `ec`, `priv` and `pub`. There is not a cleaner way to detect that
    return 'secp256k1';
  }
  throw new Error('Cannot detect key pair type');
}
