import BLAKE2b from 'blake2b';
import { sized, TypedBytes } from '../generic';
import { normalizeToU8a } from '../../utils';

export class AnchorHash extends sized(TypedBytes) {
  static Size = 32;
}

export class Anchor extends TypedBytes {
  /**
   * Returns new anchor produced by hashing given data using Blake2b.
   * @param anchor
   * @returns {AnchorHash}
   */
  static hash(bytes) {
    const hash = BLAKE2b(32);
    hash.update(normalizeToU8a(bytes));

    return new AnchorHash(hash.digest());
  }
}
