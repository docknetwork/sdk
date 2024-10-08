import { normalizeOrConvertStringToU8a, u8aToString } from '../../utils/bytes';
import TypedBytes from './typed-bytes';
import withCatchNull from './with-catch-null';

class TypedString extends TypedBytes {
  constructor(value) {
    super(normalizeOrConvertStringToU8a(value));
  }

  get value() {
    return u8aToString(this.bytes);
  }

  toString() {
    return this.value;
  }

  static fromApi(value) {
    if (
      !Array.isArray(value)
      && !(value instanceof Uint8Array)
      && typeof value !== 'string'
    ) {
      return new this(String(value));
    } else {
      return super.fromApi(value);
    }
  }

  eq(other) {
    return String(this) === String(other);
  }
}

export default withCatchNull(TypedString);
