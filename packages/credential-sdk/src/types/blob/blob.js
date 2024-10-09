import { TypedBytes } from '../generic';
import {
  hexToU8a,
  isHex,
  stringToU8a,
  u8aToString,
  u8aToU8a,
} from '../../utils';

export default class Blob extends TypedBytes {
  constructor(value) {
    let bytes;
    if (value instanceof Uint8Array) {
      bytes = value;
    } else if (value && typeof value === 'object') {
      if (typeof value[Symbol.iterator] !== 'function') {
        bytes = stringToU8a(JSON.stringify(value));
      } else {
        bytes = u8aToU8a(value);
      }
    } else if (typeof value === 'string') {
      if (!isHex(value)) {
        bytes = stringToU8a(value);
      } else {
        bytes = hexToU8a(value);
      }
    }

    super(bytes);
  }

  static fromApi(value) {
    return new this(value);
  }

  static fromJSON(value) {
    return new this(value);
  }

  toObject() {
    try {
      return JSON.parse(u8aToString(this.bytes));
    } catch (err) {
      throw new Error(`Underlying value is not a valid JSON: ${err}`);
    }
  }

  toObjectOrBytes() {
    try {
      return this.toObject();
    } catch (err) {
      console.error('Failed to convert blob to JSON:', err);

      return this.bytes;
    }
  }
}
