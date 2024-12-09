import {
  normalizeToU8a,
  randomAsU8a,
  u8aToHex,
  u8aToU8a,
} from '../../utils/bytes';
import { ensureByte } from '../../utils';
import { ArrayWithoutPrototypeMethods } from '../../utils/generic';
import withBase from './with-base';
import withCatchNull from './with-catch-null';
import withEq from './with-eq';

class TypedBytes extends withBase(ArrayWithoutPrototypeMethods) {
  constructor(value) {
    super();

    this.set(normalizeToU8a(value));
  }

  get value() {
    return u8aToHex(this.bytes);
  }

  get bytes() {
    return u8aToU8a(Array.prototype.values.call(this));
  }

  set(bytes) {
    this.length = bytes.length;

    for (let i = 0; i < bytes.length; i++) {
      this[i] = ensureByte(bytes[i]);
    }
  }

  static fromApi(value) {
    return new this(value);
  }

  static random(size) {
    // eslint-disable-next-line no-bitwise
    if (!Number.isInteger(size) || (size & 65535) !== size || !size) {
      throw new Error(
        `Expected a natural number between 1 and 65535, received: \`${size}\``,
      );
    }

    return new this(randomAsU8a(size));
  }

  toHex() {
    return u8aToHex(this.bytes);
  }

  toJSON() {
    return this.value;
  }

  static fromJSON(json) {
    return new this(json);
  }

  static from(obj) {
    if (obj instanceof this) {
      return obj;
    } else if (!Array.isArray(obj) && typeof obj !== 'string') {
      return this.fromApi(obj);
    } else {
      return new this(obj);
    }
  }

  eq(other) {
    return String(this) === String(other);
  }

  toString() {
    return this.toHex();
  }

  toLocaleString() {
    return this.toString();
  }
}

export default withEq(withCatchNull(TypedBytes));
